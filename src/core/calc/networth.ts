// docs/calculations.md § Net worth, in the base currency at the latest rates.
import { convert, rateOn } from '../fx';
import type { Ymd } from '../period';
import type { Snapshot } from '../types';
import { walletBalance } from './balance';
import { loansByPerson } from './loans';

export interface NetWorth {
	base: number;
	second?: number;
	/** Currencies left out because no rate to the base currency exists. */
	missingRates: string[];
}

export function netWorth(s: Snapshot, today: Ymd, base: string, second?: string): NetWorth {
	const missing = new Set<string>();
	const toBase = (amount: number, currency: string) => {
		const v = convert(amount, currency, base, today, s.fx, base);
		if (v === undefined) missing.add(currency);
		return v ?? 0;
	};
	let total = 0;
	for (const w of Object.values(s.wallets)) total += toBase(walletBalance(w, s.transactions, today), w.currency);
	for (const l of loansByPerson(s.transactions, s.fx, today)) total += toBase(l.theyOwe - l.iOwe, l.currency);
	const rate = second ? rateOn(s.fx, base, second, today) : undefined;
	return { base: total, second: rate === undefined ? undefined : total * rate, missingRates: [...missing].sort() };
}
