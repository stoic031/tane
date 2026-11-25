// The add-transaction form's state before it becomes a transaction (docs/ui.md § Add-transaction modal).
// Pure: the caller passes today. Bad input is dropped, never thrown (it comes from links and typing).
import { parseYmd, type Ymd } from './period';

export const DRAFT_TYPES = ['expense', 'income', 'transfer'] as const;
export type DraftType = (typeof DRAFT_TYPES)[number];

export interface Draft {
	type: DraftType;
	amount?: number;
	/** Note names (docs/data-model.md: wallets and categories are identified by name). */
	wallet?: string;
	category?: string;
	toWallet?: string;
	date: Ymd;
	merchant?: string;
	note?: string;
}

export type DraftField = 'amount' | 'wallet' | 'category' | 'toWallet';

/** "1,280", "1 280", "12.5" → number. Empty, malformed, zero or negative → undefined (refunds come later). */
export function parseAmount(text: string): number | undefined {
	const s = text.trim().replace(/[,\s]/g, '');
	if (!/^\d+(\.\d+)?$/.test(s)) return undefined;
	const n = Number(s);
	return n > 0 ? n : undefined;
}

function isYmd(s: string): boolean {
	try {
		parseYmd(s);
		return true;
	} catch {
		return false;
	}
}

/** Draft from an `obsidian://tane?amount=…&merchant=…` link. Unknown or invalid values are ignored. */
export function draftFromParams(params: Record<string, string | undefined>, today: Ymd): Draft {
	const text = (k: string) => {
		const v = params[k]?.trim();
		return v ? v : undefined;
	};
	const type = text('type');
	const date = text('date');
	const draft: Draft = {
		type: DRAFT_TYPES.includes(type as DraftType) ? (type as DraftType) : 'expense',
		date: date && isYmd(date) ? date : today,
	};
	const amount = parseAmount(params.amount ?? '');
	if (amount !== undefined) draft.amount = amount;
	for (const k of ['wallet', 'category', 'merchant', 'note'] as const) {
		const v = text(k);
		if (v) draft[k] = v;
	}
	return draft;
}

/** Fields that must be filled before the draft can be saved, in form order. */
export function missingFields(d: Draft): DraftField[] {
	const missing: DraftField[] = [];
	if (d.amount === undefined) missing.push('amount');
	if (!d.wallet) missing.push('wallet');
	if (d.type === 'transfer') {
		if (!d.toWallet) missing.push('toWallet');
	} else if (!d.category) missing.push('category');
	return missing;
}
