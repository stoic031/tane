import type { App, TFile } from 'obsidian';
import { type FolderKind, LINK_FIELDS } from '../core/parse';
import type { TanePaths } from './paths';

const FOLDERS: FolderKind[] = ['transactions', 'wallets', 'categories', 'people', 'recurring', 'inbox'];

/** Which Tane folder a path is in ('other' outside them). transactions/ includes its year/month subfolders. */
export function folderOf(paths: TanePaths, path: string): FolderKind | 'other' {
	for (const f of FOLDERS) {
		const dir = paths[f];
		if (path.startsWith(dir + '/')) {
			// Only direct children count, except transactions/YYYY/MM/.
			if (f === 'transactions' || !path.slice(dir.length + 1).includes('/')) return f;
		}
	}
	return 'other';
}

/** "[[PayPay]]", "[[wallets/PayPay|Pay]]" → "wallets/PayPay"; anything else → undefined. */
export function linkText(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const m = /^\s*\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]\s*$/.exec(value);
	return m?.[1]?.trim();
}

/**
 * Replace every link property with { name, folder } of the note it resolves to, or { broken },
 * so the pure parsers can check the target folder (docs/data-model.md § Conventions).
 */
export function resolveLinks(app: App, paths: TanePaths, fm: Record<string, unknown>, sourcePath: string): Record<string, unknown> {
	const out: Record<string, unknown> = { ...fm };
	const resolve = (v: unknown): unknown => {
		const text = linkText(v);
		if (text === undefined) return v;
		const dest = app.metadataCache.getFirstLinkpathDest(text, sourcePath);
		return dest ? { name: dest.basename, folder: folderOf(paths, dest.path) } : { broken: text };
	};
	for (const key of Object.keys(LINK_FIELDS)) {
		const v = out[key];
		if (v === undefined || v === null) continue;
		out[key] = Array.isArray(v) ? v.map(resolve) : resolve(v);
	}
	return out;
}

/** Shortest unambiguous link text from `sourcePath` to `target`. */
export function linkTo(app: App, target: TFile, sourcePath: string): string {
	return app.metadataCache.fileToLinktext(target, sourcePath, true);
}
