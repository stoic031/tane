import { describe, expect, it } from 'vitest';
import { cashflowPeriods, categorySpending, periodFlow, savedInPeriod, spendingByCategory } from '../../../src/core/calc/flow';
import { periodByKey } from '../../../src/core/period';
import { c, t, w } from './helpers';

const p = periodByKey('2026-11', 25); // 2026-10-25 .. 2026-11-24
const cats = { Food: c('Food'), 'Eating out': c('Eating out', { parent: 'Food' }), Shoes: c('Shoes'), Fees: c('Fees') };

describe('periodFlow', () => {
	it('lunch, refund, transfer with fee, salary; transfers and loans are not income or spending', () => {
		const txs = [
			t('expense', 'PayPay', 1280, { category: 'Eating out' }),
			t('expense', 'Card', -8900, { category: 'Shoes' }),
			t('transfer', 'Yucho', 100000, { toWallet: 'VN Bank', toAmount: 17_500_000 }),
			t('expense', 'Yucho', 1500, { category: 'Fees' }),
			t('lend', 'Yucho', 20000),
			t('income', 'Yucho', 300000, { category: 'Salary', date: '2026-11-01' }),
			t('expense', 'PayPay', 999, { category: 'Eating out', date: '2026-11-25' }),
		];
		const f = periodFlow(txs, p);
		expect(f.spending).toBe(1280 - 8900 + 1500);
		expect(f.income).toBe(300000);
		expect(f.cashFlow).toBe(300000 - (1280 - 8900 + 1500));
		expect(f.savingsRate).toBeCloseTo(f.cashFlow / 300000, 10);
	});

	it('no savings rate without income', () => {
		expect(periodFlow([t('expense', 'PayPay', 1)], p).savingsRate).toBeUndefined();
	});
});

describe('categorySpending / spendingByCategory', () => {
	const txs = [t('expense', 'PayPay', 1280, { category: 'Eating out' }), t('expense', 'PayPay', 500, { category: 'Food' }), t('expense', 'PayPay', 3000, { category: 'Shoes' })];

	it('a parent includes its children', () => {
		expect(categorySpending('Food', txs, p, cats)).toBe(1780);
		expect(categorySpending('Eating out', txs, p, cats)).toBe(1280);
	});

	it('by top-level category, largest first', () => {
		expect(spendingByCategory(txs, p, cats)).toEqual([
			{ name: 'Shoes', amount: 3000 },
			{ name: 'Food', amount: 1780 },
		]);
	});
});

describe('savedInPeriod', () => {
	it('transfers into goal wallets minus out of them', () => {
		const wallets = { Trip: w('Trip', { kind: 'goal' }), Yucho: w('Yucho') };
		const txs = [t('transfer', 'Yucho', 30000, { toWallet: 'Trip', toAmount: 30000 }), t('transfer', 'Trip', 5000, { toWallet: 'Yucho', toAmount: 5000 })];
		expect(savedInPeriod(txs, wallets, p)).toBe(25000);
	});
});

describe('cashflowPeriods', () => {
	it('six periods ending with the current one, oldest first', () => {
		const txs = [t('income', 'Yucho', 300000, { category: 'Salary', date: '2026-11-01' }), t('expense', 'Yucho', 1000, { date: '2026-06-30' })];
		const r = cashflowPeriods(txs, '2026-11-09', 25, 6);
		expect(r.map((x) => x.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
		expect(r[5]).toMatchObject({ income: 300000, spending: 0 });
		expect(r[1]).toMatchObject({ spending: 1000 });
	});
});
