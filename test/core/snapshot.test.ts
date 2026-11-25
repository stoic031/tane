import { describe, expect, it } from 'vitest';
import { buildSnapshot, newTransactionProblems } from '../../src/core/snapshot';
import { category, L, person, tx, wallet } from './fake';

const base = [
	wallet('PayPay', { categories: [L('Eating out', 'categories')] }),
	wallet('Yucho', { categories: [L('Salary', 'categories')] }),
	wallet('VN Bank', { currency: 'VND' }),
	wallet('Card', { kind: 'credit', statement_day: 31, payment_day: 27, pay_from: L('Yucho') }),
	wallet('Trip', { kind: 'goal', goal_amount: 600000, goal_date: '2027-12-31' }),
	category('Eating out'),
	category('Salary', { kind: 'income' }),
	person('Minh'),
];

describe('buildSnapshot', () => {
	it('valid notes end up in the snapshot', () => {
		const s = buildSnapshot([...base, tx({ wallet: L('PayPay'), amount: 1280, category: L('Eating out', 'categories') })], []);
		expect(s.problems).toEqual([]);
		expect(s.transactions).toHaveLength(1);
		expect(Object.keys(s.wallets)).toHaveLength(5);
	});

	it('a note that fails parsing goes to problems and counts nowhere', () => {
		const s = buildSnapshot([...base, tx({ wallet: L('PayPay'), amount: 'x', category: L('Eating out', 'categories') })], []);
		expect(s.transactions).toHaveLength(0);
		expect(s.problems).toHaveLength(1);
	});

	it('wallet kind must accept the type: no loans on a credit card, no expense on a goal', () => {
		const s = buildSnapshot(
			[
				...base,
				tx({ type: 'lend', wallet: L('Card'), amount: 1, person: L('Minh', 'people') }),
				tx({ wallet: L('Trip'), amount: 1, category: L('Eating out', 'categories') }),
			],
			[],
		);
		expect(s.transactions).toHaveLength(0);
		expect(s.problems).toHaveLength(2);
	});

	it('category kind must match the type', () => {
		const s = buildSnapshot([...base, tx({ wallet: L('PayPay'), amount: 1, category: L('Salary', 'categories') })], []);
		expect(s.problems).toHaveLength(1);
	});

	it('currency must be the wallet currency, and not before opening_date', () => {
		const s = buildSnapshot(
			[
				...base,
				tx({ wallet: L('PayPay'), amount: 1, currency: 'VND', category: L('Eating out', 'categories') }),
				tx({ wallet: L('PayPay'), amount: 1, date: '2026-10-31', category: L('Eating out', 'categories') }),
			],
			[],
		);
		expect(s.problems).toHaveLength(2);
	});

	it('a link to a note that itself needs review fails too', () => {
		const s = buildSnapshot([...base, wallet('Broken', { kind: 'nope' }), tx({ wallet: L('Broken'), amount: 1, category: L('Eating out', 'categories') })], []);
		expect(s.problems).toHaveLength(2);
	});

	it('duplicate ids (iCloud conflict copy): newer updated counts, the other is listed', () => {
		const a = tx({ id: 'TX-dup0000001', wallet: L('PayPay'), amount: 1, category: L('Eating out', 'categories'), updated: '2026-11-24T10:00:00' });
		const b = tx(
			{ id: 'TX-dup0000001', wallet: L('PayPay'), amount: 2, category: L('Eating out', 'categories'), updated: '2026-11-24T11:00:00' },
			'Tane/transactions/2026/11/2026-11-24 TX-dup0000001 2.md',
		);
		const s = buildSnapshot([...base, a, b], []);
		expect(s.transactions.map((t) => t.amount)).toEqual([2]);
		expect(s.problems.map((p) => p.path)).toEqual([a.path]);
	});

	it('duplicate recurring ids are caught too (D-012)', () => {
		const rc = (path: string, mtime: number) => ({
			path,
			name: 'Rent',
			folder: 'recurring' as const,
			mtime,
			fm: { id: 'RC-rent000001', mode: 'auto', type: 'expense', wallet: L('PayPay'), amount: 80000, category: L('Eating out', 'categories'), every: 'month', interval: 1, start: '2026-11-27', next: '2026-11-27' },
		});
		const s = buildSnapshot([...base, rc('Tane/recurring/Rent.md', 2), rc('Tane/recurring/Rent 2.md', 1)], []);
		expect(Object.keys(s.recurring)).toEqual(['Rent']);
		expect(s.problems.map((p) => p.path)).toEqual(['Tane/recurring/Rent 2.md']);
	});

	it('goal wallets may list income categories only; parent must be top level of the same kind', () => {
		const s = buildSnapshot(
			[
				...base,
				wallet('Saving', { kind: 'goal', goal_amount: 1, goal_date: '2027-01-01', categories: [L('Eating out', 'categories')] }),
				category('Food'),
				category('Lunch', { parent: L('Food', 'categories') }),
				category('Bento', { parent: L('Lunch', 'categories') }),
				category('Bonus', { kind: 'income', parent: L('Food', 'categories') }),
			],
			[],
		);
		expect(s.problems.map((p) => p.path).sort()).toEqual(['Tane/categories/Bento.md', 'Tane/categories/Bonus.md', 'Tane/wallets/Saving.md']);
	});
});

describe('over-repaid loans', () => {
	it('show on the person note', () => {
		const s = buildSnapshot([...base, tx({ type: 'lend', wallet: L('Yucho'), amount: 100, person: L('Minh', 'people') }), tx({ type: 'collect', wallet: L('Yucho'), amount: 150, person: L('Minh', 'people') })], []);
		expect(s.problems.map((p) => p.path)).toEqual(['Tane/people/Minh.md']);
		expect(s.transactions).toHaveLength(2);
	});
});

describe('newTransactionProblems', () => {
	const s = buildSnapshot(base, []);

	it('the category must be one the wallet uses', () => {
		const t = { wallet: 'Yucho', type: 'expense' as const, category: 'Eating out', date: '2026-11-24', amount: 1, currency: 'JPY' };
		expect(newTransactionProblems(t, s)).toHaveLength(1);
		expect(newTransactionProblems({ ...t, wallet: 'PayPay' }, s)).toEqual([]);
	});

	it('transfer wallets must differ', () => {
		const t = { wallet: 'Yucho', toWallet: 'Yucho', type: 'transfer' as const, date: '2026-11-24', amount: 1, currency: 'JPY' };
		expect(newTransactionProblems(t, s).length).toBeGreaterThan(0);
	});
});
