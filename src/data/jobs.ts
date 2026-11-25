// Background jobs (docs/architecture.md § Background jobs). Idempotent: deterministic ids,
// check before create, so running twice or on two devices before sync settles is safe (D-012).
import { catchUpPlan } from '../core/calc/recurring';
import { FX_HEADER, fxCsvLine, fxRowsFromApi, rateOn } from '../core/fx';
import { inboxDraft } from '../core/guess';
import { recurringOccurrenceId } from '../core/ids';
import { roundTo } from '../core/money';
import type { Ymd } from '../core/period';
import { currencyOf, type TaneSettings } from '../core/settings';
import type { Snapshot } from '../core/types';
import type { Writer } from './writer';

export interface JobDeps {
	writer: Writer;
	snapshot: () => Snapshot;
	settings: () => TaneSettings;
	today: Ymd;
}

/** Inbox notes → review transactions; the inbox note goes to the trash once its transaction exists. */
export async function processInbox({ writer, snapshot, today }: JobDeps): Promise<number> {
	let done = 0;
	for (const item of snapshot().inbox) {
		const d = inboxDraft(snapshot(), item, today);
		if (!d.ok) continue;
		const r = await writer.createTransaction(d.value);
		if (r.ok) {
			await writer.trash(item.path);
			done++;
		}
	}
	return done;
}

/** Log due `auto` occurrences from `next` through today, then move `next` on (D-003). */
export async function catchUp({ writer, snapshot, today }: JobDeps): Promise<{ logged: number; problems: string[] }> {
	let logged = 0;
	const problems: string[] = [];
	for (const rc of Object.values(snapshot().recurring)) {
		if (rc.mode !== 'auto' || rc.archived) continue;
		const plan = catchUpPlan(rc, today);
		if (plan.dates.length === 0) continue;
		let last: Ymd | undefined;
		for (const date of plan.dates) {
			const r = await writer.createTransaction({
				type: rc.type,
				date,
				wallet: rc.wallet,
				amount: rc.amount,
				category: rc.category,
				toWallet: rc.toWallet,
				toAmount: rc.toAmount,
				person: rc.person,
				note: rc.name,
				recurring: rc.name,
				id: recurringOccurrenceId(rc.id, date),
			});
			if (!r.ok) {
				problems.push(`${rc.name} ${date}: ${r.problems.join(', ')}`);
				break;
			}
			if (!r.existed) logged++;
			last = date;
		}
		// Advance only past what was written, so a refused occurrence is retried next time.
		if (last) await writer.advanceRecurring(rc, last);
	}
	return { logged, problems };
}

export type Fetcher = (url: string) => Promise<unknown>;

/** jsDelivr first, Cloudflare Pages as fallback (D-013). */
export function fxUrls(base: string): string[] {
	const b = base.toLowerCase();
	return [
		`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${b}.min.json`,
		`https://latest.currency-api.pages.dev/v1/currencies/${b}.min.json`,
	];
}

/** Fetch today's rates for every configured currency and append them to fx-rates.csv. */
export async function fetchRates({ writer, snapshot, settings }: JobDeps, fetcher: Fetcher, fxPath: string): Promise<number> {
	const s = settings();
	let json: unknown;
	let lastError: unknown;
	for (const url of fxUrls(s.baseCurrency)) {
		try {
			json = await fetcher(url);
			break;
		} catch (e) {
			lastError = e;
		}
	}
	if (json === undefined) throw lastError instanceof Error ? lastError : new Error('Exchange rates could not be fetched');
	const rows = fxRowsFromApi(json, s.baseCurrency, s.currencies.map((c) => c.code), snapshot().fx);
	if (rows.length) await writer.appendFile(fxPath, FX_HEADER, rows.map(fxCsvLine).join(''));
	return rows.length;
}

/** Transactions whose frozen base amount differs from what today's rate table gives (docs/calculations.md § Money). */
export function staleBaseAmounts(s: Snapshot, settings: TaneSettings): { path: string; fxRate: number; amountBase: number }[] {
	const decimals = currencyOf(settings, settings.baseCurrency).decimals;
	const out: { path: string; fxRate: number; amountBase: number }[] = [];
	for (const t of s.transactions) {
		const rate = rateOn(s.fx, t.currency, settings.baseCurrency, t.date);
		if (rate === undefined) continue;
		const amountBase = roundTo(t.amount * rate, decimals);
		if (Math.abs(rate - t.fxRate) > 1e-12 || amountBase !== t.amountBase) out.push({ path: t.path, fxRate: rate, amountBase });
	}
	return out;
}
