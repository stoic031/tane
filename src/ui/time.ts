import type { Ymd } from '../core/period';

/** Today in the device's local time zone as YYYY-MM-DD. Only shells read the clock; core never does. */
export function todayLocal(now: Date = new Date()): Ymd {
	const y = now.getFullYear();
	const m = String(now.getMonth() + 1).padStart(2, '0');
	const d = String(now.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}
