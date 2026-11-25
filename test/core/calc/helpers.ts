// Fake parsed records for calculation tests. Fake data only.
import type { Category, Transaction, TxType, Wallet } from '../../../src/core/types';

let n = 0;
export function t(type: TxType, wallet: string, amount: number, fields: Partial<Transaction> = {}): Transaction {
	return {
		id: `TX-calc${String(n++).padStart(6, '0')}`,
		path: '',
		date: '2026-11-24',
		type,
		wallet,
		amount,
		currency: 'JPY',
		tags: [],
		fxRate: 1,
		amountBase: fields.amountBase ?? amount,
		review: false,
		...fields,
	};
}

export function w(name: string, fields: Partial<Wallet> = {}): Wallet {
	return { name, path: '', kind: 'basic', currency: 'JPY', openingBalance: 0, openingDate: '2026-11-01', categories: [], aliases: [], archived: false, ...fields };
}

export function c(name: string, fields: Partial<Category> = {}): Category {
	return { name, path: '', kind: 'expense', archived: false, ...fields };
}
