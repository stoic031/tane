// Fake parsed-note builders shared by core tests. Fake data only.
import type { RawNote } from '../../src/core/parse';

export const L = (name: string, folder: RawNote['folder'] = 'wallets') => ({ name, folder });

export function wallet(name: string, fm: Record<string, unknown> = {}): RawNote {
	return {
		path: `Tane/wallets/${name}.md`,
		name,
		folder: 'wallets',
		fm: { kind: 'basic', currency: 'JPY', opening_balance: 0, opening_date: '2026-11-01', ...fm },
	};
}

export function category(name: string, fm: Record<string, unknown> = {}): RawNote {
	return { path: `Tane/categories/${name}.md`, name, folder: 'categories', fm: { kind: 'expense', ...fm } };
}

export function person(name: string): RawNote {
	return { path: `Tane/people/${name}.md`, name, folder: 'people', fm: {} };
}

let n = 0;
export function tx(fm: Record<string, unknown>, path?: string): RawNote {
	const id = (fm.id as string | undefined) ?? `TX-fake${String(n++).padStart(5, '0')}`;
	return {
		path: path ?? `Tane/transactions/2026/11/${String(fm.date ?? '2026-11-24')} ${id}.md`,
		name: id,
		folder: 'transactions',
		fm: { id, date: '2026-11-24', type: 'expense', currency: 'JPY', fx_rate: 1, ...fm, amount_base: fm.amount_base ?? fm.amount },
	};
}
