import { type App, TFile } from 'obsidian';

/**
 * Note names directly inside a folder, sorted. M1 stand-in for the vault index (M2):
 * wallets and categories are identified by note name (docs/data-model.md § Conventions).
 */
export function noteNames(app: App, folder: string): string[] {
	const dir = app.vault.getFolderByPath(folder);
	if (!dir) return [];
	return dir.children
		.filter((f): f is TFile => f instanceof TFile && f.extension === 'md')
		.map((f) => f.basename)
		.sort((a, b) => a.localeCompare(b));
}
