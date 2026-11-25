// docs/calculations.md § Recurring items; catch-up per D-003.
import { addDays, parseYmd, type Ymd } from '../period';
import type { Recurring, Transaction } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** k-th occurrence counted from `start` (k = 0 is start). Monthly days 29–31 fall on shorter months' last day. */
export function nthOccurrence(r: Pick<Recurring, 'start' | 'every' | 'interval'>, k: number): Ymd {
	const step = k * r.interval;
	if (r.every === 'day') return addDays(r.start, step);
	if (r.every === 'week') return addDays(r.start, 7 * step);
	const { y, m, d } = parseYmd(r.start);
	const months = r.every === 'month' ? step : 12 * step;
	const total = m - 1 + months;
	const yy = y + Math.floor(total / 12);
	const mm = (total % 12) + 1;
	return `${yy}-${pad(mm)}-${pad(Math.min(d, lastDay(yy, mm)))}`;
}

/** Occurrences from `from` through `to` (inclusive), never past `end`. */
export function occurrencesBetween(r: Recurring, from: Ymd, to: Ymd): Ymd[] {
	const out: Ymd[] = [];
	for (let k = 0; k < 100_000; k++) {
		const d = nthOccurrence(r, k);
		if (d > to || (r.end !== undefined && d > r.end)) break;
		if (d >= from) out.push(d);
	}
	return out;
}

/** First occurrence after `date`. */
export function occurrenceAfter(r: Recurring, date: Ymd): Ymd {
	for (let k = 0; k < 100_000; k++) {
		const d = nthOccurrence(r, k);
		if (d > date) return d;
	}
	return date;
}

/** Auto items: every occurrence from `next` through today, the new `next`, and whether it ends. */
export function catchUpPlan(r: Recurring, today: Ymd): { dates: Ymd[]; next: Ymd; archive: boolean } {
	const dates = occurrencesBetween(r, r.next, today);
	const next = dates.length ? occurrenceAfter(r, dates.at(-1)!) : r.next;
	return { dates, next, archive: r.end !== undefined && next > r.end };
}

/** Remind items that need attention today: overdue ones one by one (oldest first), or the next one when due soon. */
export function dueReminders(r: Recurring, today: Ymd, defaultRemindDays: number): { date: Ymd; overdue: boolean }[] {
	if (r.archived || r.mode !== 'remind') return [];
	if (today > r.next) return occurrencesBetween(r, r.next, addDays(today, -1)).map((date) => ({ date, overdue: true }));
	const from = addDays(r.next, -(r.remindDays ?? defaultRemindDays));
	return today >= from ? [{ date: r.next, overdue: false }] : [];
}

/** Suggested amount for a reminder: average of the last 3 transactions it produced, else its own amount. */
export function estimate(r: Recurring, txs: readonly Transaction[]): number {
	const mine = txs
		.filter((t) => t.recurring === r.name)
		.sort((a, b) => a.date.localeCompare(b.date))
		.slice(-3);
	return mine.length ? mine.reduce((s, t) => s + t.amount, 0) / mine.length : r.amount;
}

export interface Upcoming {
	item: Recurring;
	date: Ymd;
	overdue: boolean;
}

/** Every occurrence due in the next `days` days, plus overdue reminders, by date. */
export function upcoming(items: readonly Recurring[], today: Ymd, days = 30): Upcoming[] {
	const until = addDays(today, days);
	const out: Upcoming[] = [];
	for (const r of items) {
		if (r.archived) continue;
		const from = r.mode === 'remind' ? r.next : r.next > today ? r.next : today;
		for (const date of occurrencesBetween(r, from, until)) out.push({ item: r, date, overdue: date < today });
	}
	return out.sort((a, b) => a.date.localeCompare(b.date) || a.item.name.localeCompare(b.item.name));
}
