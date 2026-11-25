// In-memory vault for data-layer tests: enough of App, Vault, MetadataCache and FileManager
// for VaultIndex and Writer. Frontmatter uses the YAML subset Tane writes (src/core/serialize.ts).
import { Events, TFile, TFolder, normalizePath } from 'obsidian';
import { toFrontmatter } from '../../src/core/serialize';

export function parseFrontmatter(text: string): { fm: Record<string, unknown>; body: string } {
	const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
	if (!m) return { fm: {}, body: text };
	const fm: Record<string, unknown> = {};
	let listKey: string | undefined;
	const value = (raw: string): unknown => {
		const v = raw.trim();
		if (v.startsWith('"')) return JSON.parse(v);
		if (v === 'true' || v === 'false') return v === 'true';
		if (v !== '' && !Number.isNaN(Number(v))) return Number(v);
		return v;
	};
	for (const line of m[1]!.split('\n')) {
		const item = /^\s+-\s+(.*)$/.exec(line);
		if (item && listKey) {
			(fm[listKey] as unknown[]).push(value(item[1]!));
			continue;
		}
		const kv = /^([\w-]+):\s*(.*)$/.exec(line);
		if (!kv) continue;
		if (kv[2] === '') {
			listKey = kv[1]!;
			fm[listKey] = [];
		} else {
			listKey = undefined;
			fm[kv[1]!] = value(kv[2]!);
		}
	}
	return { fm, body: m[2] ?? '' };
}

export class FakeApp {
	contents = new Map<string, string>();
	trashed: string[] = [];
	private clock = 1;
	private files = new Map<string, TFile | TFolder>();
	vault: ReturnType<FakeApp['makeVault']>;
	metadataCache: ReturnType<FakeApp['makeCache']>;
	fileManager: ReturnType<FakeApp['makeFileManager']>;

	constructor() {
		this.vault = this.makeVault();
		this.metadataCache = this.makeCache();
		this.fileManager = this.makeFileManager();
	}

	/** Add a note with properties (as Obsidian's metadataCache would return them) and an optional body. */
	note(path: string, fm: Record<string, unknown>, body = ''): TFile {
		const entries = Object.entries(fm).map(([k, v]) => [k, Array.isArray(v) ? v.map(String) : (v as string | number | boolean)] as [string, string | number | boolean | string[]]);
		return this.put(path, toFrontmatter(entries) + body);
	}

	put(path: string, content: string): TFile {
		path = normalizePath(path);
		this.mkdirs(path.split('/').slice(0, -1).join('/'));
		let f = this.files.get(path);
		const isNew = !f;
		if (!(f instanceof TFile)) {
			f = new TFile(path);
			this.files.set(path, f);
			this.parentOf(path)?.children.push(f);
		}
		f.stat.mtime = this.clock++;
		this.contents.set(path, content);
		this.vaultEvents.trigger(isNew ? 'create' : 'modify', f);
		this.cacheEvents.trigger('changed', f);
		return f;
	}

	private vaultEvents = new Events();
	private cacheEvents = new Events();

	private parentOf(path: string): TFolder | undefined {
		const dir = path.split('/').slice(0, -1).join('/');
		const d = this.files.get(dir);
		return d instanceof TFolder ? d : undefined;
	}

	private mkdirs(dir: string) {
		if (!dir) return;
		const parts = dir.split('/');
		for (let i = 1; i <= parts.length; i++) {
			const p = parts.slice(0, i).join('/');
			if (!this.files.has(p)) {
				const folder = new TFolder(p);
				this.files.set(p, folder);
				this.parentOf(p)?.children.push(folder);
			}
		}
	}

	private remove(path: string) {
		const f = this.files.get(path);
		if (!f) return;
		this.files.delete(path);
		this.contents.delete(path);
		const parent = this.parentOf(path);
		if (parent) parent.children = parent.children.filter((c) => c !== f);
		this.vaultEvents.trigger('delete', f);
	}

	fm(path: string): Record<string, unknown> {
		return parseFrontmatter(this.contents.get(path) ?? '').fm;
	}

	private makeVault() {
		const app = this;
		return {
			getMarkdownFiles: () => [...app.files.values()].filter((f): f is TFile => f instanceof TFile && f.extension === 'md'),
			getAbstractFileByPath: (p: string) => app.files.get(normalizePath(p)) ?? null,
			getFileByPath: (p: string) => {
				const f = app.files.get(normalizePath(p));
				return f instanceof TFile ? f : null;
			},
			getFolderByPath: (p: string) => {
				const f = app.files.get(normalizePath(p));
				return f instanceof TFolder ? f : null;
			},
			create: async (p: string, content: string) => {
				if (app.files.has(normalizePath(p))) throw new Error(`File already exists: ${p}`);
				return app.put(p, content);
			},
			createFolder: async (p: string) => app.mkdirs(normalizePath(p)),
			cachedRead: async (f: TFile) => app.contents.get(f.path) ?? '',
			read: async (f: TFile) => app.contents.get(f.path) ?? '',
			append: async (f: TFile, text: string) => void app.put(f.path, (app.contents.get(f.path) ?? '') + text),
			process: async (f: TFile, fn: (s: string) => string) => void app.put(f.path, fn(app.contents.get(f.path) ?? '')),
			on: (name: string, cb: (...a: unknown[]) => unknown) => app.vaultEvents.on(name, cb),
		};
	}

	private makeCache() {
		const app = this;
		return {
			getFileCache: (f: TFile) => (app.contents.has(f.path) ? { frontmatter: app.fm(f.path) } : null),
			getFirstLinkpathDest: (link: string) => {
				const target = normalizePath(link).replace(/\.md$/, '');
				const all = [...app.files.values()].filter((f): f is TFile => f instanceof TFile);
				return all.find((f) => f.path.replace(/\.md$/, '') === target) ?? all.find((f) => f.basename === target) ?? null;
			},
			fileToLinktext: (f: TFile) => {
				const same = [...app.files.values()].filter((x) => x instanceof TFile && x.basename === f.basename);
				return same.length > 1 ? f.path.replace(/\.md$/, '') : f.basename;
			},
			on: (name: string, cb: (...a: unknown[]) => unknown) => app.cacheEvents.on(name, cb),
		};
	}

	private makeFileManager() {
		const app = this;
		return {
			processFrontMatter: async (f: TFile, fn: (fm: Record<string, unknown>) => void) => {
				const { fm, body } = parseFrontmatter(app.contents.get(f.path) ?? '');
				fn(fm);
				const entries = Object.entries(fm).map(([k, v]) => [k, v] as [string, string | number | boolean | string[]]);
				app.put(f.path, toFrontmatter(entries) + body);
			},
			renameFile: async (f: TFile, newPath: string) => {
				const content = app.contents.get(f.path) ?? '';
				const old = f.path;
				app.remove(old);
				app.put(newPath, content);
			},
			trashFile: async (f: TFile) => {
				app.trashed.push(f.path);
				app.remove(f.path);
			},
		};
	}
}
