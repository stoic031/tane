import { normalizePath } from 'obsidian';

// Vault layout. Spec: docs/data-model.md § Folders.

export interface TanePaths {
	root: string;
	transactions: string;
	wallets: string;
	categories: string;
	people: string;
	recurring: string;
	inbox: string;
	system: string;
	fxRates: string;
	log: string;
}

export function tanePaths(rootFolder: string): TanePaths {
	const root = normalizePath(rootFolder.trim() || 'Tane');
	const join = (...parts: string[]) => normalizePath([root, ...parts].join('/'));
	return {
		root,
		transactions: join('transactions'),
		wallets: join('wallets'),
		categories: join('categories'),
		people: join('people'),
		recurring: join('recurring'),
		inbox: join('inbox'),
		system: join('system'),
		fxRates: join('system', 'fx-rates.csv'),
		log: join('system', 'log.md'),
	};
}

/** transactions/YYYY/MM/<date> <id>.md */
export function transactionPath(paths: TanePaths, date: string, id: string): string {
	const [y, m] = date.split('-');
	return normalizePath(`${paths.transactions}/${y}/${m}/${date} ${id}.md`);
}
