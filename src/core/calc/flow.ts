// docs/calculations.md § Income and spending for a period. Uses amount_base (base currency).
import { sumMoney } from '../money';
import { addDays, type Period, periodOf, type Ymd } from '../period';
import type { Category, Transaction, Wallet } from '../types';

const inPeriod = (t: Transaction, p: Period) => t.date >= p.start && t.date <= p.end;
const sum = (xs: number[]) => sumMoney(xs, 2);

export interface Flow {
	income: number;
	spending: number;
	cashFlow: number;
	/** Not defined when income is 0. */
	savingsRate?: number;
}

export function periodFlow(txs: readonly Transaction[], p: Period): Flow {
	const inside = txs.filter((t) => inPeriod(t, p));
	const income = sum(inside.filter((t) => t.type === 'income').map((t) => t.amountBase));
	const spending = sum(inside.filter((t) => t.type === 'expense').map((t) => t.amountBase));
	const cashFlow = income - spending;
	return { income, spending, cashFlow, savingsRate: income !== 0 ? cashFlow / income : undefined };
}

/** Top-level category a category rolls up into. */
export function topOf(name: string, cats: Readonly<Record<string, Category>>): string {
	return cats[name]?.parent ?? name;
}

/** Spending of a category in the period: its own plus its children's. */
export function categorySpending(name: string, txs: readonly Transaction[], p: Period, cats: Readonly<Record<string, Category>>): number {
	return sum(
		txs.filter((t) => t.type === 'expense' && inPeriod(t, p) && t.category !== undefined && (t.category === name || cats[t.category]?.parent === name)).map((t) => t.amountBase),
	);
}

/** Spending per top-level category, largest first; categories with no spending left out. */
export function spendingByCategory(txs: readonly Transaction[], p: Period, cats: Readonly<Record<string, Category>>): { name: string; amount: number }[] {
	const by = new Map<string, number[]>();
	for (const t of txs) {
		if (t.type !== 'expense' || !inPeriod(t, p) || t.category === undefined) continue;
		const top = topOf(t.category, cats);
		by.set(top, [...(by.get(top) ?? []), t.amountBase]);
	}
	return [...by.entries()]
		.map(([name, xs]) => ({ name, amount: sum(xs) }))
		.filter((x) => x.amount !== 0)
		.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

/** Transfers into goal wallets minus transfers out of them, in the period. */
export function savedInPeriod(txs: readonly Transaction[], wallets: Readonly<Record<string, Wallet>>, p: Period): number {
	const isGoal = (n: string | undefined) => n !== undefined && wallets[n]?.kind === 'goal';
	const xs: number[] = [];
	for (const t of txs) {
		if (t.type !== 'transfer' || !inPeriod(t, p)) continue;
		if (isGoal(t.toWallet) && !isGoal(t.wallet)) xs.push(t.amountBase);
		if (isGoal(t.wallet) && !isGoal(t.toWallet)) xs.push(-t.amountBase);
	}
	return sum(xs);
}

/** Income and spending for the last `n` periods ending with today's, oldest first. */
export function cashflowPeriods(txs: readonly Transaction[], today: Ymd, startDay: number, n = 6): ({ key: string } & Flow)[] {
	const out: ({ key: string } & Flow)[] = [];
	let p = periodOf(today, startDay);
	for (let i = 0; i < n; i++) {
		out.unshift({ key: p.key, ...periodFlow(txs, p) });
		p = periodOf(addDays(p.start, -1), startDay);
	}
	return out;
}

