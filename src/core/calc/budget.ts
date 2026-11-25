// docs/calculations.md § Budgets and § Left to spend today (D-015).
import { daysElapsedIncludingToday, daysLeftIncludingToday, type Period, type Ymd } from '../period';
import type { TaneSettings } from '../settings';
import type { Category, Transaction } from '../types';
import { categorySpending, periodFlow } from './flow';

export type BudgetState = 'normal' | 'warning' | 'over';

/** totalBudget if set; else top-level budgets plus child budgets whose parent has none. */
export function overallLimit(cats: Readonly<Record<string, Category>>, totalBudget: number | undefined): number | undefined {
	if (totalBudget !== undefined) return totalBudget;
	let sum = 0;
	let any = false;
	for (const c of Object.values(cats)) {
		if (c.kind !== 'expense' || c.budget === undefined) continue;
		const parent = c.parent === undefined ? undefined : cats[c.parent];
		if (parent === undefined || parent.budget === undefined) {
			sum += c.budget;
			any = true;
		}
	}
	return any ? sum : undefined;
}

export function budgetStatus(spent: number, limit: number, warnPct: number): BudgetState {
	if (spent > limit) return 'over';
	return spent >= (limit * warnPct) / 100 ? 'warning' : 'normal';
}

/** Pace: where spending "should" be today. Ahead of pace when spent > expected. */
export function expectedSpend(limit: number, p: Period, today: Ymd): number {
	return (limit * daysElapsedIncludingToday(p, today)) / p.days;
}

/** max(0, (limit − spent before today) ÷ days left including today − spent today). */
export function leftToSpendToday(limit: number, spentBeforeToday: number, spentToday: number, daysLeft: number): number {
	if (daysLeft <= 0) return 0;
	return Math.max(0, (limit - spentBeforeToday) / daysLeft - spentToday);
}

export interface BudgetLine {
	name: string;
	limit: number;
	spent: number;
	status: BudgetState;
	expected: number;
}

export interface Budgets {
	items: BudgetLine[];
	overall?: BudgetLine;
	/** Left to spend today; undefined when there is no overall limit. */
	today?: { amount: number; daysLeft: number };
}

export function budgets(
	txs: readonly Transaction[],
	cats: Readonly<Record<string, Category>>,
	p: Period,
	today: Ymd,
	settings: Pick<TaneSettings, 'totalBudget' | 'budgetWarnPct'>,
): Budgets {
	const line = (name: string, limit: number, spent: number): BudgetLine => ({
		name,
		limit,
		spent,
		status: budgetStatus(spent, limit, settings.budgetWarnPct),
		expected: expectedSpend(limit, p, today),
	});
	const items = Object.values(cats)
		.filter((c) => c.kind === 'expense' && c.budget !== undefined && !c.archived)
		.map((c) => line(c.name, c.budget!, categorySpending(c.name, txs, p, cats)))
		.sort((a, b) => a.name.localeCompare(b.name));
	const limit = overallLimit(cats, settings.totalBudget);
	if (limit === undefined) return { items };
	const spent = periodFlow(txs, p).spending;
	const todayFlow = periodFlow(
		txs.filter((t) => t.date === today),
		p,
	).spending;
	const daysLeft = daysLeftIncludingToday(p, today);
	return {
		items,
		overall: line('overall', limit, spent),
		today: { amount: leftToSpendToday(limit, spent - todayFlow, todayFlow, daysLeft), daysLeft },
	};
}
