// Money arithmetic. docs/calculations.md § Money arithmetic and conversion.
import type { Currency } from './types';

export function toMinor(amount: number, decimals: number): number {
	return Math.round(amount * 10 ** decimals);
}

export function fromMinor(minor: number, decimals: number): number {
	return minor / 10 ** decimals;
}

/** Sum amounts without float drift: add as integers in minor units. */
export function sumMoney(amounts: Iterable<number>, decimals: number): number {
	let s = 0;
	for (const a of amounts) s += toMinor(a, decimals);
	return fromMinor(s, decimals);
}

/** Round half away from zero to `decimals`, tolerant of binary noise (1.005 → 1.01). */
export function roundTo(amount: number, decimals: number): number {
	const f = 10 ** decimals;
	return (Math.sign(amount) * Math.round(Math.abs(amount) * f + 1e-9)) / f;
}

export function formatMoney(amount: number, cur: Currency, locale?: string): string {
	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: cur.code,
			minimumFractionDigits: cur.decimals,
			maximumFractionDigits: cur.decimals,
		}).format(amount);
	} catch {
		// Unknown ISO code: plain number and the user's symbol.
		const n = new Intl.NumberFormat(locale, { minimumFractionDigits: cur.decimals, maximumFractionDigits: cur.decimals }).format(amount);
		return `${n} ${cur.symbol}`;
	}
}
