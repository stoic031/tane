import { describe, expect, it } from 'vitest';
import { categoryChoices, lastUsed, walletChoices } from '../../src/core/choices';
import { buildSnapshot } from '../../src/core/snapshot';
import { category, L, tx, wallet } from './fake';

const s = buildSnapshot(
	[
		wallet('PayPay', { categories: [L('Eating out', 'categories'), L('Salary', 'categories')], order: 1 }),
		wallet('Yucho', { order: 2 }),
		wallet('Old', { archived: true }),
		wallet('Card', { kind: 'credit', statement_day: 31, payment_day: 27, pay_from: L('Yucho') }),
		category('Eating out'),
		category('Food'),
		category('Lunch', { parent: L('Food', 'categories') }),
		category('Salary', { kind: 'income' }),
		category('Retired', { archived: true }),
		tx({ wallet: L('PayPay'), amount: 1, category: L('Eating out', 'categories'), created: '2026-11-24T08:00:00' }),
		tx({ wallet: L('Yucho'), amount: 1, category: L('Food', 'categories'), created: '2026-11-24T09:00:00' }),
	],
	[],
);

describe('walletChoices', () => {
	it('active wallets that accept the type, by order then name', () => {
		expect(walletChoices(s, 'expense').map((c) => c.name)).toEqual(['PayPay', 'Yucho', 'Card']);
		expect(walletChoices(s, 'lend').map((c) => c.name)).toEqual(['PayPay', 'Yucho']);
	});
});

describe('categoryChoices', () => {
	it("the wallet's categories of the right kind", () => {
		expect(categoryChoices(s, 'PayPay', 'expense').map((c) => c.name)).toEqual(['Eating out']);
	});

	it('every active category of the kind when the wallet lists none, child labelled with its parent', () => {
		expect(categoryChoices(s, 'Yucho', 'expense').map((c) => c.label)).toEqual(['Eating out', 'Food', 'Food › Lunch']);
	});
});

describe('lastUsed', () => {
	it('newest transaction overall, then the newest category used with a wallet', () => {
		expect(lastUsed(s).wallet).toBe('Yucho');
		expect(lastUsed(s, 'PayPay', 'expense').category).toBe('Eating out');
	});
});
