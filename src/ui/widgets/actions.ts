// Widgets with actions: confirm captured transactions, pay or skip reminders. Writes go through src/data.
import { dueReminders, estimate, upcoming } from '../../core/calc/recurring';
import { recurringOccurrenceId } from '../../core/ids';
import type { Recurring } from '../../core/types';
import { t } from '../i18n';
import { button, card, money, muted, openPath, row, txRow, type WidgetCtx } from './kit';

export function reviewWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const toReview = ctx.snap.transactions.filter((x) => x.review);
	const problems = ctx.snap.problems;
	const c = card(el, t.toReview);
	if (toReview.length === 0 && problems.length === 0) return muted(c, t.allClear);
	for (const tx of toReview) {
		const r = txRow(c, ctx, tx);
		const actions = r.createDiv({ cls: 'tane-actions' });
		button(actions, t.confirm, () => ctx.plugin.writer.confirmReview(tx.path), true);
	}
	if (problems.length) {
		const n = c.createDiv({ cls: 'tane-problems' });
		n.createDiv({ cls: 'tane-card-title', text: `${t.needsReview} (${problems.length})` });
		muted(n, t.needsReviewNote);
		for (const p of problems) {
			const item = n.createDiv({ cls: 'tane-problem tane-link' });
			item.createDiv({ cls: 'tane-tx-what', text: p.path.split('/').pop() ?? p.path });
			item.createDiv({ cls: 'tane-tx-sub', text: p.messages.join(' · ') });
			item.addEventListener('click', () => openPath(ctx, p.path));
		}
	}
}

/** Pay a reminder: the add modal pre-filled with the estimate; on save, the item moves to its next date. */
export function payReminder(ctx: WidgetCtx, rc: Recurring, date: string): void {
	ctx.plugin.openAddModal(
		{
			type: rc.type,
			date,
			wallet: rc.wallet,
			amount: Math.round(estimate(rc, ctx.snap.transactions)),
			category: rc.category,
			toWallet: rc.toWallet,
			toAmount: rc.toAmount,
			person: rc.person,
			note: rc.name,
			id: recurringOccurrenceId(rc.id, date),
			recurring: rc.name,
		},
		() => ctx.plugin.writer.advanceRecurring(rc, date),
	);
}

export function upcomingWidget(el: HTMLElement, ctx: WidgetCtx): void {
	const items = Object.values(ctx.snap.recurring);
	const due = items.flatMap((rc) => dueReminders(rc, ctx.today, ctx.plugin.settings.defaultRemindDays).map((d) => ({ rc, ...d })));
	if (due.length) {
		const c = card(el, t.dueSoon);
		const firstOf = new Set<string>();
		for (const d of due.sort((a, b) => a.date.localeCompare(b.date))) {
			const r = row(c, `${d.rc.name} · ${d.overdue ? t.overdue : d.date}`, money(ctx, estimate(d.rc, ctx.snap.transactions), ctx.snap.wallets[d.rc.wallet]?.currency));
			if (d.overdue) r.addClass('is-out');
			// Only the oldest occurrence of an item can be paid or skipped, so `next` moves in order.
			if (firstOf.has(d.rc.name)) continue;
			firstOf.add(d.rc.name);
			const actions = c.createDiv({ cls: 'tane-actions' });
			button(actions, t.pay, () => payReminder(ctx, d.rc, d.date), true);
			button(actions, t.skip, () => ctx.plugin.writer.advanceRecurring(d.rc, d.date));
		}
	}
	const c = card(el, t.upcoming);
	const list = upcoming(items, ctx.today, 30).filter((u) => !u.overdue);
	if (list.length === 0) return muted(c, t.nothingUpcoming);
	for (const u of list) row(c, `${u.date} · ${u.item.name}`, money(ctx, u.item.mode === 'remind' ? estimate(u.item, ctx.snap.transactions) : u.item.amount, ctx.snap.wallets[u.item.wallet]?.currency));
}
