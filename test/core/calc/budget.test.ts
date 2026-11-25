import { describe, expect, it } from 'vitest';
import { budgetStatus, budgets, expectedSpend, leftToSpendToday, overallLimit } from '../../../src/core/calc/budget';
import { periodByKey } from '../../../src/core/period';
import { c, t } from './helpers';

describe('overallLimit', () => {
	it('totalBudget wins', () => {
		expect(overallLimit({ Food: c('Food', { budget: 1 }) }, 150000)).toBe(150000);
	});

	it('top-level budgets plus child budgets whose parent has none', () => {
		const cats = {
			Food: c('Food', { budget: 60000 }),
			'Eating out': c('Eating out', { parent: 'Food', budget: 40000 }),
			Fun: c('Fun'),
			Games: c('Games', { parent: 'Fun', budget: 5000 }),
			Salary: c('Salary', { kind: 'income', budget: 999 }),
		};
		expect(overallLimit(cats, undefined)).toBe(65000);
	});

	it('no budgets at all → undefined', () => {
		expect(overallLimit({ Food: c('Food') }, undefined)).toBeUndefined();
	});
});

describe('budgetStatus', () => {
	it('normal below the threshold, warning from it to 100%, over above', () => {
		expect(budgetStatus(79, 100, 80)).toBe('normal');
		expect(budgetStatus(80, 100, 80)).toBe('warning');
		expect(budgetStatus(100, 100, 80)).toBe('warning');
		expect(budgetStatus(101, 100, 80)).toBe('over');
	});
});

describe('expectedSpend (pace)', () => {
	it('limit × days elapsed including today ÷ days in period', () => {
		const p = periodByKey('2026-11', 25); // 31 days
		expect(expectedSpend(31000, p, '2026-10-25')).toBe(1000);
		expect(expectedSpend(31000, p, '2026-11-09')).toBe(16000);
	});
});

describe('leftToSpendToday', () => {
	it('worked example: 150,000 limit, 90,000 spent before today, 10 days left → 6,000; after lunch 1,280 → 4,720', () => {
		expect(leftToSpendToday(150000, 90000, 0, 10)).toBe(6000);
		expect(leftToSpendToday(150000, 90000, 1280, 10)).toBe(4720);
	});

	it('never below 0', () => {
		expect(leftToSpendToday(100, 200, 0, 5)).toBe(0);
	});
});

describe('budgets', () => {
	it('per category and overall for the period', () => {
		const p = periodByKey('2026-11', 25);
		const cats = { Food: c('Food', { budget: 60000 }), 'Eating out': c('Eating out', { parent: 'Food', budget: 40000 }) };
		const txs = [t('expense', 'PayPay', 30000, { category: 'Eating out', date: '2026-11-01' }), t('expense', 'PayPay', 20000, { category: 'Food', date: '2026-11-02' })];
		const r = budgets(txs, cats, p, '2026-11-09', { totalBudget: undefined, budgetWarnPct: 80 });
		expect(r.items.map((b) => [b.name, b.spent, b.status])).toEqual([
			['Eating out', 30000, 'normal'],
			['Food', 50000, 'warning'],
		]);
		expect(r.overall).toMatchObject({ limit: 60000, spent: 50000 });
		expect(r.today).toMatchObject({ daysLeft: 16, amount: 625 });
	});
});
