// The add-transaction form's state before it becomes a transaction (docs/ui.md § Add-transaction modal).
// Pure: the caller passes today. Bad input is dropped, never thrown (it comes from links and typing).
import { parseYmd, type Ymd } from './period';
import { LOAN_TYPES, TX_TYPES, type Transaction, type TxType } from './types';

export interface Draft {
	type: TxType;
	amount?: number;
	/** Note names (docs/data-model.md: wallets, categories and people are identified by name). */
	wallet?: string;
	category?: string;
	toWallet?: string;
	toAmount?: number;
	/** Transfer fee, logged as an expense in the fee category. */
	fee?: number;
	person?: string;
	dueDate?: Ymd;
	date: Ymd;
	merchant?: string;
	note?: string;
	/** Kept as they are when editing. */
	tags?: string[];
	group?: string;
	/** Set when editing an existing transaction note. */
	editPath?: string;
	/** Set when paying a recurring reminder: deterministic id and the recurring link. */
	id?: string;
	recurring?: string;
}

export type DraftField = 'amount' | 'wallet' | 'category' | 'toWallet' | 'person';

/** "1,280", "1 280", "12.5" → number. Empty, malformed or zero → undefined; negative only if allowed. */
export function parseAmount(text: string, allowNegative = false): number | undefined {
	const s = text.trim().replace(/[,\s]/g, '');
	if (!/^-?\d+(\.\d+)?$/.test(s)) return undefined;
	const n = Number(s);
	if (n === 0 || (n < 0 && !allowNegative)) return undefined;
	return n;
}

/** Refunds (negative expense) and balance corrections may be negative. */
export function allowsNegative(type: TxType): boolean {
	return type === 'expense' || type === 'adjust';
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
		type: TX_TYPES.includes(type as TxType) ? (type as TxType) : 'expense',
		date: date && isYmd(date) ? date : today,
	};
	const amount = parseAmount(params.amount ?? '', allowsNegative(draft.type));
	if (amount !== undefined) draft.amount = amount;
	for (const k of ['wallet', 'category', 'merchant', 'note', 'person'] as const) {
		const v = text(k);
		if (v) draft[k] = v;
	}
	return draft;
}

/** Draft for editing an existing transaction. */
export function draftFromTransaction(t: Transaction): Draft {
	return {
		type: t.type,
		amount: t.amount,
		wallet: t.wallet,
		category: t.category,
		toWallet: t.toWallet,
		toAmount: t.toAmount,
		person: t.person,
		dueDate: t.dueDate,
		date: t.date,
		merchant: t.merchant,
		note: t.note,
		tags: t.tags,
		group: t.group,
		editPath: t.path,
		recurring: t.recurring,
	};
}

/** Fields that must be filled before the draft can be saved, in form order. */
export function missingFields(d: Draft): DraftField[] {
	const missing: DraftField[] = [];
	if (d.amount === undefined) missing.push('amount');
	if (!d.wallet) missing.push('wallet');
	if (d.type === 'transfer') {
		if (!d.toWallet) missing.push('toWallet');
	} else if (LOAN_TYPES.includes(d.type)) {
		if (!d.person) missing.push('person');
	} else if ((d.type === 'expense' || d.type === 'income') && !d.category) missing.push('category');
	return missing;
}
