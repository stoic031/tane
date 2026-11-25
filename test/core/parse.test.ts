import { describe, expect, it } from 'vitest';
import { parseCategory, parseInboxItem, parseRecurring, parseTransaction, parseWallet } from '../../src/core/parse';
import { category, L, tx, wallet } from './fake';

describe('parseTransaction', () => {
	it('lunch 1,280 JPY from PayPay', () => {
		const r = parseTransaction(tx({ id: 'TX-k7x2m9p4qa', wallet: L('PayPay'), amount: 1280, category: L('Eating out', 'categories'), merchant: 'Lawson', note: 'Lunch' }));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.value).toMatchObject({ id: 'TX-k7x2m9p4qa', type: 'expense', wallet: 'PayPay', amount: 1280, category: 'Eating out', amountBase: 1280, review: false, tags: [] });
	});

	it('refund is a negative expense', () => {
		expect(parseTransaction(tx({ wallet: L('PayPay'), amount: -8900, category: L('Shoes', 'categories') })).ok).toBe(true);
	});

	it('negative income is a problem', () => {
		const r = parseTransaction(tx({ type: 'income', wallet: L('PayPay'), amount: -1, category: L('Salary', 'categories') }));
		expect(r.ok).toBe(false);
	});

	it('reports every missing or wrong property', () => {
		const r = parseTransaction(tx({ type: 'gift', amount: 'abc', date: '2026-02-30' }));
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(r.problems.join(' ')).toMatch(/type/);
		expect(r.problems.join(' ')).toMatch(/date/);
		expect(r.problems.join(' ')).toMatch(/amount/);
		expect(r.problems.join(' ')).toMatch(/wallet/);
	});

	it('a wallet link that lands outside wallets/ is a problem', () => {
		const r = parseTransaction(tx({ wallet: L('Eating out', 'categories'), amount: 1, category: L('Eating out', 'categories') }));
		expect(r.ok).toBe(false);
	});

	it('a broken link is a problem', () => {
		const r = parseTransaction(tx({ wallet: { broken: 'Nowhere' }, amount: 1, category: L('X', 'categories') }));
		expect(r.ok).toBe(false);
	});

	it('transfer needs to_wallet and to_amount; loan types need a person', () => {
		expect(parseTransaction(tx({ type: 'transfer', wallet: L('Yucho'), amount: 100000 })).ok).toBe(false);
		expect(
			parseTransaction(tx({ type: 'transfer', wallet: L('Yucho'), amount: 100000, to_wallet: L('VN Bank'), to_amount: 17500000 })).ok,
		).toBe(true);
		expect(parseTransaction(tx({ type: 'lend', wallet: L('Yucho'), amount: 20000 })).ok).toBe(false);
		expect(parseTransaction(tx({ type: 'lend', wallet: L('Yucho'), amount: 20000, person: L('Minh', 'people') })).ok).toBe(true);
		expect(parseTransaction(tx({ wallet: L('Yucho'), amount: 1, category: L('X', 'categories'), person: L('Minh', 'people') })).ok).toBe(false);
	});

	it('accepts numeric strings and a single tag string', () => {
		const r = parseTransaction(tx({ wallet: L('PayPay'), amount: '1280', category: L('X', 'categories'), tags: 'okinawa-2027' }));
		expect(r.ok && r.value.amount).toBe(1280);
		expect(r.ok && r.value.tags).toEqual(['okinawa-2027']);
	});
});

describe('parseWallet', () => {
	it('basic wallet with categories', () => {
		const r = parseWallet(wallet('PayPay', { opening_balance: 152000, categories: [L('Eating out', 'categories')], aliases: ['PayPay Card'] }));
		expect(r.ok && r.value).toMatchObject({ kind: 'basic', openingBalance: 152000, categories: ['Eating out'], aliases: ['PayPay Card'], archived: false });
	});

	it('credit wallet needs statement and payment days and pay_from', () => {
		expect(parseWallet(wallet('Card', { kind: 'credit' })).ok).toBe(false);
		const r = parseWallet(wallet('Card', { kind: 'credit', statement_day: 31, payment_day: 27, pay_from: L('Yucho') }));
		expect(r.ok && r.value.paymentMonthOffset).toBe(1);
	});

	it('goal wallet needs amount and date', () => {
		expect(parseWallet(wallet('Trip', { kind: 'goal' })).ok).toBe(false);
		expect(parseWallet(wallet('Trip', { kind: 'goal', goal_amount: 600000, goal_date: '2027-12-31' })).ok).toBe(true);
	});
});

describe('parseCategory', () => {
	it('kind and optional parent and budget', () => {
		const r = parseCategory(category('Eating out', { parent: L('Food', 'categories'), budget: 40000 }));
		expect(r.ok && r.value).toMatchObject({ kind: 'expense', parent: 'Food', budget: 40000 });
		expect(parseCategory(category('X', { kind: 'other' })).ok).toBe(false);
	});
});

describe('parseRecurring', () => {
	const base = {
		id: 'RC-a1b2c3d4e5',
		mode: 'remind',
		type: 'expense',
		wallet: L('Yucho'),
		amount: 8500,
		category: L('Electricity', 'categories'),
		every: 'month',
		interval: 1,
		start: '2026-12-27',
		next: '2026-12-27',
	};

	it('electricity reminder', () => {
		const r = parseRecurring({ path: 'Tane/recurring/Electricity.md', name: 'Electricity', folder: 'recurring', fm: base });
		expect(r.ok && r.value).toMatchObject({ mode: 'remind', every: 'month', interval: 1, next: '2026-12-27' });
	});

	it('rejects an unsupported type and a bad interval', () => {
		const r = parseRecurring({ path: 'p', name: 'X', folder: 'recurring', fm: { ...base, type: 'lend', interval: 0 } });
		expect(r.ok).toBe(false);
	});
});

describe('parseInboxItem', () => {
	it('Shortcut capture with a string amount', () => {
		const r = parseInboxItem({
			path: 'Tane/inbox/a.md',
			name: 'a',
			folder: 'inbox',
			fm: { amount: '1,280', merchant: 'Lawson', card: 'Rakuten Card', captured_at: '2026-11-24T12:32:05', source: 'wallet-tap' },
		});
		expect(r.ok && r.value).toMatchObject({ amount: 1280, merchant: 'Lawson', card: 'Rakuten Card', capturedAt: '2026-11-24T12:32:05' });
	});

	it('no amount → problem', () => {
		expect(parseInboxItem({ path: 'p', name: 'a', folder: 'inbox', fm: { merchant: 'Lawson' } }).ok).toBe(false);
	});
});
