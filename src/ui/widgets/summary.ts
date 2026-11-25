// Overview widgets (docs/ui.md § Surfaces). Each renders from the snapshot; none writes.
import { walletBalance } from '../../core/calc/balance';
import { budgets } from '../../core/calc/budget';
import { cashflowPeriods, periodFlow, savedInPeriod, spendingByCategory } from '../../core/calc/flow';
import { loansByPerson } from '../../core/calc/loans';
import { netWorth } from '../../core/calc/networth';
import { periodOf } from '../../core/period';
import { t } from '../i18n';
import { bar, button, card, money, muted, row, type WidgetCtx } from './kit';

const period = (ctx: WidgetCtx) => periodOf(ctx.today, ctx.plugin.settings.periodStartDay);

export function todayWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const c = card(el);
	c.addClass('tane-today');
	const b = budgets(ctx.snap.transactions, ctx.snap.categories, period(ctx), ctx.today, ctx.plugin.settings);
	c.createDiv({ cls: 'tane-card-label', text: t.leftToday });
	if (b.today) {
		c.createDiv({ cls: 'tane-big', text: money(ctx, Math.floor(b.today.amount)) });
		muted(c, t.leftTodayNote(b.today.daysLeft));
	} else muted(c, t.noBudget);
	button(c, t.addTransaction, () => ctx.plugin.openAddModal({ type: 'expense', date: ctx.today }), true).addClass('tane-add-button');
}

export function periodWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const p = period(ctx);
	const c = card(el, t.period(p.key));
	muted(c, `${p.start} → ${p.end}`);
	const f = periodFlow(ctx.snap.transactions, p);
	row(c, t.income, money(ctx, f.income));
	row(c, t.spending, money(ctx, f.spending));
	row(c, t.balance, money(ctx, f.cashFlow), f.cashFlow < 0 ? 'is-out' : '');
	const saved = savedInPeriod(ctx.snap.transactions, ctx.snap.wallets, p);
	if (saved !== 0) row(c, t.savedGoals, money(ctx, saved));
	if (f.savingsRate !== undefined) muted(c, t.savingsRate(`${Math.round(f.savingsRate * 100)}%`));
}

export function budgetsWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const c = card(el, t.budgets);
	const p = period(ctx);
	const b = budgets(ctx.snap.transactions, ctx.snap.categories, p, ctx.today, ctx.plugin.settings);
	const lines = b.overall ? [{ ...b.overall, name: t.overall }, ...b.items] : b.items;
	if (lines.length === 0) return muted(c, t.noBudgets);
	for (const l of lines) {
		const item = c.createDiv({ cls: 'tane-budget' });
		row(item, l.name, t.budgetLine(money(ctx, l.spent), money(ctx, l.limit)));
		bar(item, l.limit > 0 ? l.spent / l.limit : 1, l.status, l.limit > 0 ? l.expected / l.limit : undefined);
		if (l.spent > l.expected && l.status !== 'over') muted(item, t.aheadOfPace);
	}
}

export function spendingWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const c = card(el, t.spendingByCategory);
	const list = spendingByCategory(ctx.snap.transactions, period(ctx), ctx.snap.categories);
	if (list.length === 0) return muted(c, t.noSpending);
	const max = Math.max(...list.map((x) => x.amount));
	for (const x of list) {
		row(c, `${ctx.snap.categories[x.name]?.icon ?? ''} ${x.name}`.trim(), money(ctx, x.amount));
		bar(c, max > 0 ? x.amount / max : 0);
	}
}

export function cashflowWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const c = card(el, t.cashflow);
	const months = cashflowPeriods(ctx.snap.transactions, ctx.today, ctx.plugin.settings.periodStartDay, 6);
	const max = Math.max(1, ...months.flatMap((m) => [m.income, m.spending]));
	const chart = c.createDiv({ cls: 'tane-chart' });
	for (const m of months) {
		const col = chart.createDiv({ cls: 'tane-chart-col' });
		col.setAttr('aria-label', `${m.key}: ${t.income} ${money(ctx, m.income)}, ${t.spending} ${money(ctx, m.spending)}`);
		const bars = col.createDiv({ cls: 'tane-chart-bars' });
		bars.createDiv({ cls: 'tane-chart-in' }).style.setProperty('--tane-h', `${(Math.max(0, m.income) / max) * 100}%`);
		bars.createDiv({ cls: 'tane-chart-out' }).style.setProperty('--tane-h', `${(Math.max(0, m.spending) / max) * 100}%`);
		col.createDiv({ cls: 'tane-chart-label', text: m.key.slice(5) });
	}
	const last = months.at(-1);
	if (last) {
		row(c, t.income, money(ctx, last.income), 'is-in');
		row(c, t.spending, money(ctx, last.spending), 'is-out');
	}
}

export function netWorthWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const s = ctx.plugin.settings;
	const c = card(el, t.netWorth);
	const n = netWorth(ctx.snap, ctx.today, s.baseCurrency, s.secondCurrency);
	c.createDiv({ cls: 'tane-big', text: money(ctx, Math.round(n.base)) });
	if (n.second !== undefined) muted(c, money(ctx, Math.round(n.second), s.secondCurrency));
	if (n.missingRates.length) muted(c, t.missingRates(n.missingRates.join(', ')));
}

export function walletsWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const c = card(el, t.wallets);
	const list = Object.values(ctx.snap.wallets)
		.filter((w) => !w.archived)
		.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name));
	for (const w of list) {
		const r = row(c, `${w.icon ?? ''} ${w.name}`.trim(), money(ctx, walletBalance(w, ctx.snap.transactions, ctx.today), w.currency));
		r.addClass('tane-link');
		r.addEventListener('click', () => void ctx.plugin.app.workspace.openLinkText(w.path, '', false));
	}
}

export function loansWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const c = card(el, t.loans);
	const lines = loansByPerson(ctx.snap.transactions, ctx.snap.fx, ctx.today);
	if (lines.length === 0) return muted(c, t.noLoans);
	for (const l of lines) {
		const due = l.dueDate ? ` · ${t.due(l.dueDate)}` : '';
		if (l.theyOwe) row(c, t.theyOweMe(l.person) + due, money(ctx, l.theyOwe, l.currency), l.overdue ? 'is-out' : '');
		if (l.iOwe) row(c, t.iOwe(l.person), money(ctx, l.iOwe, l.currency));
	}
}
