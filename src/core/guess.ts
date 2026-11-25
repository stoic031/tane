// Matching captured payments to wallets and categories (docs/data-model.md § Inbox note).
import { categoryChoices } from './choices';
import { inboxTransactionId } from './ids';
import type { Parsed } from './parse';
import type { Ymd } from './period';
import type { InboxItem, Snapshot, Wallet } from './types';

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

/** Wallet whose name or one of whose aliases equals the card name iOS reports. */
export function matchWallet(wallets: Readonly<Record<string, Wallet>>, card: string | undefined): string | undefined {
	if (!card) return undefined;
	const c = norm(card);
	if (!c) return undefined;
	for (const w of Object.values(wallets)) {
		if (w.archived) continue;
		if (norm(w.name) === c || w.aliases.some((a) => norm(a) === c)) return w.name;
	}
	return undefined;
}

/** Category of the latest transaction with the same merchant that the wallet may use; else its first expense category. */
export function guessCategory(s: Snapshot, merchant: string | undefined, wallet: string): string | undefined {
	const allowed = categoryChoices(s, wallet, 'expense').map((c) => c.name);
	if (merchant) {
		const m = norm(merchant);
		const same = s.transactions
			.filter((t) => t.type === 'expense' && t.category && t.merchant && norm(t.merchant) === m)
			.sort((a, b) => (b.created ?? b.date).localeCompare(a.created ?? a.date));
		const hit = same.find((t) => allowed.includes(t.category!));
		if (hit) return hit.category;
	}
	return allowed[0];
}

export interface InboxDraft {
	type: 'expense';
	id: string;
	date: Ymd;
	wallet: string;
	amount: number;
	category?: string;
	merchant?: string;
	review: true;
}

/** The review transaction an inbox note becomes, or why it cannot. */
export function inboxDraft(s: Snapshot, item: InboxItem, today: Ymd): Parsed<InboxDraft> {
	const wallet = matchWallet(s.wallets, item.card);
	if (!wallet) return { ok: false, problems: [`No wallet matches card "${item.card ?? ''}"; add it to a wallet's aliases`] };
	const w = s.wallets[wallet]!;
	if (item.currency && item.currency !== w.currency) return { ok: false, problems: [`Currency ${item.currency} differs from ${wallet}'s ${w.currency}`] };
	const category = guessCategory(s, item.merchant, wallet);
	if (!category) return { ok: false, problems: [`Wallet "${wallet}" has no expense category to use`] };
	const date = item.capturedAt && /^\d{4}-\d{2}-\d{2}/.test(item.capturedAt) ? item.capturedAt.slice(0, 10) : today;
	return { ok: true, value: { type: 'expense', id: inboxTransactionId(item), date, wallet, amount: item.amount, category, merchant: item.merchant, review: true } };
}
