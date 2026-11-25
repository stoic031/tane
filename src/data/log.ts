import { type App, Notice, normalizePath } from 'obsidian';
import { nowLocal } from './clock';

/**
 * Append an error to system/log.md and tell the user (docs/architecture.md § Errors and logging).
 * Never pass amounts, merchants or notes in `step` or the error message.
 */
export async function logError(app: App, logPath: string, version: string, step: string, err: unknown): Promise<void> {
	const message = err instanceof Error ? err.message : String(err);
	const stack = err instanceof Error && err.stack ? `\n\n\`\`\`\n${err.stack}\n\`\`\`` : '';
	const entry = `\n## ${nowLocal()} · v${version} · ${step}\n\n${message}${stack}\n`;
	new Notice(`Tane: ${step} failed. Details in ${logPath}`);
	try {
		const path = normalizePath(logPath);
		const file = app.vault.getFileByPath(path);
		if (file) await app.vault.append(file, entry);
		else {
			const dir = path.split('/').slice(0, -1).join('/');
			if (dir && !app.vault.getFolderByPath(dir)) await app.vault.createFolder(dir);
			await app.vault.create(path, `# Tane log\n${entry}`);
		}
	} catch {
		// Logging must never throw; the Notice above already told the user.
	}
}
