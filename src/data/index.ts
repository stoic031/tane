import { type App, type Component, debounce, Events, TFile } from 'obsidian';
import { parseFxCsv } from '../core/fx';
import type { RawNote } from '../core/parse';
import type { TaneSettings } from '../core/settings';
import { buildSnapshot } from '../core/snapshot';
import { EMPTY_SNAPSHOT, type Snapshot } from '../core/types';
import { folderOf, resolveLinks } from './links';
import { type TanePaths, tanePaths } from './paths';

/**
 * In-memory index of Tane's notes (docs/architecture.md § Data flow). Reads properties from
 * metadataCache only, rebuilds after vault events (debounced so a sync burst re-renders once),
 * and publishes an immutable Snapshot with the 'snapshot' event.
 */
export class VaultIndex extends Events {
	snapshot: Snapshot = EMPTY_SNAPSHOT;
	private readonly schedule = debounce(() => void this.rebuild(), 150, true);

	constructor(
		private readonly app: App,
		private readonly settings: () => TaneSettings,
	) {
		super();
	}

	get paths(): TanePaths {
		return tanePaths(this.settings().rootFolder);
	}

	/** Start listening; the owner component removes the listeners on unload. */
	attach(owner: Component): void {
		const touches = (path: string) => path === this.paths.root || path.startsWith(this.paths.root + '/');
		const onFile = (file: { path: string }, oldPath?: string) => {
			if (touches(file.path) || (oldPath !== undefined && touches(oldPath))) this.schedule();
		};
		owner.registerEvent(this.app.metadataCache.on('changed', (f) => onFile(f)));
		owner.registerEvent(this.app.vault.on('create', (f) => onFile(f)));
		owner.registerEvent(this.app.vault.on('delete', (f) => onFile(f)));
		owner.registerEvent(this.app.vault.on('rename', (f, old) => onFile(f, old)));
		// fx-rates.csv has no metadata cache entry.
		owner.registerEvent(this.app.vault.on('modify', (f) => f.path === this.paths.fxRates && this.schedule()));
	}

	/** The notes under the root folder as plain records with links resolved. */
	collect(): RawNote[] {
		const paths = this.paths;
		const notes: RawNote[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const folder = folderOf(paths, file.path);
			if (folder === 'other') continue;
			const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
			notes.push({ path: file.path, name: file.basename, folder, fm: resolveLinks(this.app, paths, fm, file.path), mtime: file.stat.mtime });
		}
		return notes;
	}

	// ponytail: full rebuild on every change (metadataCache reads are in memory); switch to per-file updates if 5,000 notes exceed the 300 ms budget.
	async rebuild(): Promise<Snapshot> {
		const fxFile = this.app.vault.getAbstractFileByPath(this.paths.fxRates);
		const fx = fxFile instanceof TFile ? parseFxCsv(await this.app.vault.cachedRead(fxFile)) : { rows: [], problems: [] };
		const fxProblems = fx.problems.length ? [{ path: this.paths.fxRates, messages: fx.problems }] : [];
		this.snapshot = buildSnapshot(this.collect(), fx.rows, fxProblems);
		this.trigger('snapshot', this.snapshot);
		return this.snapshot;
	}
}
