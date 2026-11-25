// Pay-cycle periods. Pure functions: no Obsidian imports, no Date.now().
// Spec: docs/calculations.md § Period.
//
// - periodStartDay = D (1..28). A period starts on day D and ends the day
//   before day D of the next month.
// - Name (key "YYYY-MM"): D <= 15 → the month the period starts in;
//   D > 15 → the next month (the one holding most of the days).
// - Example, D = 25: period "2026-11" runs 2026-10-25 .. 2026-11-24.
//
// Dates are plain "YYYY-MM-DD" strings in the user's local calendar.
// Arithmetic uses UTC internally so time zones never shift a day.

export type Ymd = string; // "YYYY-MM-DD"

export interface Period {
	/** "YYYY-MM", the name shown to the user. */
	key: string;
	/** First day, inclusive. */
	start: Ymd;
	/** Last day, inclusive. */
	end: Ymd;
	/** Number of days in the period. */
	days: number;
}

const DAY_MS = 86_400_000;

export function assertStartDay(d: number): void {
	if (!Number.isInteger(d) || d < 1 || d > 28) {
		throw new RangeError(`periodStartDay must be an integer 1..28, got ${d}`);
	}
}

export function parseYmd(s: Ymd): { y: number; m: number; d: number } {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
	if (!m) throw new RangeError(`Not a YYYY-MM-DD date: ${s}`);
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const d = Number(m[3]);
	const t = Date.UTC(y, mo - 1, d);
	const back = new Date(t);
	if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) {
		throw new RangeError(`Invalid calendar date: ${s}`);
	}
	return { y, m: mo, d };
}

function toUtc(s: Ymd): number {
	const { y, m, d } = parseYmd(s);
	return Date.UTC(y, m - 1, d);
}

function fromUtc(t: number): Ymd {
	const x = new Date(t);
	const y = x.getUTCFullYear();
	const m = String(x.getUTCMonth() + 1).padStart(2, '0');
	const d = String(x.getUTCDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function addDays(s: Ymd, n: number): Ymd {
	return fromUtc(toUtc(s) + n * DAY_MS);
}

/** Days from a to b (b - a). Same day = 0. */
export function diffDays(a: Ymd, b: Ymd): number {
	return Math.round((toUtc(b) - toUtc(a)) / DAY_MS);
}

function ymd(y: number, m: number, d: number): Ymd {
	// m is 1-based and may overflow (13 → next year); Date.UTC normalises it.
	return fromUtc(Date.UTC(y, m - 1, d));
}

/** The period with the given key, e.g. periodByKey("2026-11", 25). */
export function periodByKey(key: string, startDay: number): Period {
	assertStartDay(startDay);
	const m = /^(\d{4})-(\d{2})$/.exec(key);
	if (!m) throw new RangeError(`Not a YYYY-MM key: ${key}`);
	const y = Number(m[1]);
	const mo = Number(m[2]);
	// D > 15: the period named M starts in M-1.
	const startMonth = startDay > 15 ? mo - 1 : mo;
	const start = ymd(y, startMonth, startDay);
	const nextStart = ymd(y, startMonth + 1, startDay);
	const end = addDays(nextStart, -1);
	return { key, start, end, days: diffDays(start, nextStart) };
}

/** The period that contains the given date. */
export function periodOf(date: Ymd, startDay: number): Period {
	assertStartDay(startDay);
	const { y, m, d } = parseYmd(date);
	// Month in which this date's period starts.
	const startMonth = d >= startDay ? m : m - 1;
	const keyMonthIndex = startDay > 15 ? startMonth + 1 : startMonth;
	const keyDate = new Date(Date.UTC(y, keyMonthIndex - 1, 1));
	const key = `${keyDate.getUTCFullYear()}-${String(keyDate.getUTCMonth() + 1).padStart(2, '0')}`;
	return periodByKey(key, startDay);
}

/** Days left in the period counting today. Outside the period → 0. */
export function daysLeftIncludingToday(p: Period, today: Ymd): number {
	if (today < p.start || today > p.end) return 0;
	return diffDays(today, p.end) + 1;
}

/** Days already passed, counting today (pace = spent vs limit × elapsed / days). */
export function daysElapsedIncludingToday(p: Period, today: Ymd): number {
	if (today < p.start) return 0;
	if (today > p.end) return p.days;
	return diffDays(p.start, today) + 1;
}
