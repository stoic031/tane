// Widgets for a wallet, category or person note: ```tane wallet``` inside that note (docs/ui.md § Code blocks).
import { walletBalance } from '../../core/calc/balance';
import { budgetStatus, expectedSpend } from '../../core/calc/budget';
import { cardStatus } from '../../core/calc/credit';
import { categorySpending } from '../../core/calc/flow';
import { goalStatus } from '../../core/calc/goal';
import { loansByPerson } from '../../core/calc/loans';
import { periodOf } from '../../core/period';
import type { Transaction } from '../../core/types';
import { t } from '../i18n';
import { bar, card, money, muted, row, txRow, type WidgetCtx } from './kit';

/** The entity name: an explicit argument, else the note the block sits in. */
function nameOf(ctx: WidgetCtx): string {
	return ctx.arg?.trim() || (ctx.sourcePath?.split('/').pop()?.replace(/\.md$/, '') ?? '');
}

function recent(el: HTMLElement, ctx: WidgetCtx, txs: Transaction[], n = 10): void {
	const c = card(el, t.recent);
	if (txs.length === 0) return muted(c, t.noTransactions);
	for (const tx of [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n)) txRow(c, ctx, tx);
}

export function walletWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const w = ctx.snap.wallets[nameOf(ctx)];
	if (!w) return muted(el, t.notFound(nameOf(ctx)));
	const txs = ctx.snap.transactions;
	const balance = walletBalance(w, txs, ctx.today);
	const c = card(el, `${w.icon ?? ''} ${w.name}`.trim());
	c.createDiv({ cls: 'tane-big', text: money(ctx, balance, w.currency) });
	if (w.kind === 'credit') {
		const s = cardStatus(w, txs, ctx.today);
		row(c, `${t.statement} (${s.closing})`, money(ctx, s.statement, w.currency));
		row(c, t.stillToPay, money(ctx, s.stillToPay, w.currency), s.stillToPay > 0 ? 'is-out' : '');
		muted(c, t.dueOn(s.dueDate));
		row(c, t.thisCycle, money(ctx, s.cycleSpending, w.currency));
		if (w.creditLimit) {
			row(c, t.creditLimit, money(ctx, w.creditLimit, w.currency));
			bar(c, -balance / w.creditLimit, -balance > w.creditLimit ? 'over' : 'normal');
		}
	}
	if (w.kind === 'goal') {
		const g = goalStatus(w, balance, ctx.today);
		bar(c, g.progress, g.reached ? 'normal' : g.onTrack ? 'normal' : 'warning');
		muted(c, t.goalProgress(`${Math.round(g.progress * 100)}%`));
		if (g.reached) muted(c, t.reached);
		else {
			if (g.monthlyNeeded !== undefined) muted(c, t.monthlyNeeded(money(ctx, g.monthlyNeeded, w.currency)));
			muted(c, g.onTrack ? t.onTrack : t.behind);
		}
	}
	recent(el, ctx, txs.filter((x) => x.wallet === w.name || x.toWallet === w.name));
}

export function categoryWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const cat = ctx.snap.categories[nameOf(ctx)];
	if (!cat) return muted(el, t.notFound(nameOf(ctx)));
	const p = periodOf(ctx.today, ctx.plugin.settings.periodStartDay);
	const spent = categorySpending(cat.name, ctx.snap.transactions, p, ctx.snap.categories);
	const c = card(el, `${cat.icon ?? ''} ${cat.name}`.trim());
	muted(c, t.period(p.key));
	if (cat.budget !== undefined) {
		row(c, t.spending, t.budgetLine(money(ctx, spent), money(ctx, cat.budget)));
		bar(c, cat.budget > 0 ? spent / cat.budget : 1, budgetStatus(spent, cat.budget, ctx.plugin.settings.budgetWarnPct), cat.budget > 0 ? expectedSpend(cat.budget, p, ctx.today) / cat.budget : undefined);
	} else row(c, cat.kind === 'income' ? t.income : t.spending, money(ctx, spent));
	recent(el, ctx, ctx.snap.transactions.filter((x) => x.category === cat.name || (x.category !== undefined && ctx.snap.categories[x.category]?.parent === cat.name)));
}

export function personWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const name = nameOf(ctx);
	if (!ctx.snap.people[name]) return muted(el, t.notFound(name));
	const c = card(el, name);
	const lines = loansByPerson(ctx.snap.transactions, ctx.snap.fx, ctx.today).filter((l) => l.person === name);
	if (lines.length === 0) muted(c, t.noLoans);
	for (const l of lines) {
		if (l.theyOwe) row(c, t.theyOweMe(name) + (l.dueDate ? ` · ${t.due(l.dueDate)}` : ''), money(ctx, l.theyOwe, l.currency), l.overdue ? 'is-out' : '');
		if (l.iOwe) row(c, t.iOwe(name), money(ctx, l.iOwe, l.currency));
	}
	recent(el, ctx, ctx.snap.transactions.filter((x) => x.person === name));
}
