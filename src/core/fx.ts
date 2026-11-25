// Exchange rates. docs/data-model.md § Exchange rates (system/fx-rates.csv).
import { parseYmd, type Ymd } from './period';
import type { FxRow } from './types';

export const FX_HEADER = 'date,pair,rate,source';

export function parseFxCsv(text: string): { rows: FxRow[]; problems: string[] } {
	const rows: FxRow[] = [];
	const problems: string[] = [];
	text.split(/\r?\n/).forEach((line, i) => {
		const l = line.trim();
		if (!l || l === FX_HEADER) return;
		const [date = '', pair = '', rate = '', source = ''] = l.split(',').map((s) => s.trim());
		const r = Number(rate);
		let ok = /^[A-Z]{6}$/.test(pair) && Number.isFinite(r) && r > 0 && (source === 'api' || source === 'manual');
		try {
			parseYmd(date);
		} catch {
			ok = false;
		}
		if (ok) rows.push({ date, pair, rate: r, source: source as FxRow['source'] });
		else problems.push(`fx-rates.csv line ${i + 1}: "${l}"`);
	});
	return { rows, problems };
}

export function fxCsvLine(r: FxRow): string {
	return `${r.date},${r.pair},${r.rate},${r.source}\n`;
}

/** Rate of one pair on a date: latest row not after it, else the first row. Manual beats api on the same date. */
function pairRate(rows: readonly FxRow[], pair: string, date: Ymd): number | undefined {
	const list = rows.filter((r) => r.pair === pair);
	if (list.length === 0) return undefined;
	const better = (a: FxRow, b: FxRow) => a.date > b.date || (a.date === b.date && a.source === 'manual' && b.source === 'api');
	let best: FxRow | undefined;
	let first: FxRow | undefined;
	for (const r of list) {
		if (!first || r.date < first.date || (r.date === first.date && better(r, first))) first = r;
		if (r.date <= date && (!best || better(r, best))) best = r;
	}
	return (best ?? first)?.rate;
}

/** Units of `to` per 1 `from` on `date`, from the direct or reverse pair. */
export function rateOn(rows: readonly FxRow[], from: string, to: string, date: Ymd): number | undefined {
	if (from === to) return 1;
	const direct = pairRate(rows, from + to, date);
	if (direct !== undefined) return direct;
	const reverse = pairRate(rows, to + from, date);
	return reverse === undefined ? undefined : 1 / reverse;
}

/** Convert, going through the base currency when there is no direct pair. */
export function convert(amount: number, from: string, to: string, date: Ymd, rows: readonly FxRow[], base: string): number | undefined {
	const direct = rateOn(rows, from, to, date);
	if (direct !== undefined) return amount * direct;
	const a = rateOn(rows, from, base, date);
	const b = rateOn(rows, base, to, date);
	return a === undefined || b === undefined ? undefined : amount * a * b;
}
