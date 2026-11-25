import type { Ymd } from '../core/period';

// The only places that read the device clock (core never does). Local time, no zone suffix:
// dates and date-times in notes are local (docs/data-model.md § Conventions).

const pad = (n: number) => String(n).padStart(2, '0');

export function todayLocal(now: Date = new Date()): Ymd {
	return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function nowLocal(now: Date = new Date()): string {
	return `${todayLocal(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
