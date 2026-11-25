// What the add-transaction pickers offer and preselect (docs/ui.md § Add-transaction modal).
import { WALLET_ACCEPTS } from './snapshot';
import type { CategoryKind, Snapshot, TxType } from './types';

export interface Choice {
	name: string;
	label: string;
}

const byOrder = <T extends { name: string; order?: number }>(a: T, b: T) =>
	(a.order ?? Infinity) - (b.order ?? Infinity) || a.name.localeCompare(b.name);

const label = (name: string, icon?: string) => (icon ? `${icon} ${name}` : name);

/** Active wallets that accept the type (docs/data-model.md § wallet kind × type). */
export function walletChoices(s: Snapshot, type: TxType): Choice[] {
	return Object.values(s.wallets)
		.filter((w) => !w.archived && WALLET_ACCEPTS[w.kind].includes(type))
		.sort(byOrder)
		.map((w) => ({ name: w.name, label: label(w.name, w.icon) }));
}

/** The wallet's categories of the kind; every active one of the kind when the wallet lists none. */
export function categoryChoices(s: Snapshot, wallet: string | undefined, kind: CategoryKind): Choice[] {
	const listed = (wallet && s.wallets[wallet]?.categories) || [];
	return Object.values(s.categories)
		.filter((c) => !c.archived && c.kind === kind && (listed.length === 0 || listed.includes(c.name)))
		.map((c) => ({ c, key: c.parent ? `${c.parent} › ${c.name}` : c.name }))
		.sort((a, b) => a.key.localeCompare(b.key))
		.map(({ c, key }) => ({ name: c.name, label: label(key, c.icon) }));
}

export function personChoices(s: Snapshot): Choice[] {
	return Object.values(s.people)
		.filter((p) => !p.archived)
		.sort(byOrder)
		.map((p) => ({ name: p.name, label: p.name }));
}

/** Wallet of the newest transaction; with a wallet, the category last used with it for that type. */
export function lastUsed(s: Snapshot, wallet?: string, type?: TxType): { wallet?: string; category?: string } {
	const newest = [...s.transactions].sort((a, b) => (b.created ?? b.date).localeCompare(a.created ?? a.date));
	const forWallet = wallet ? newest.find((t) => t.wallet === wallet && t.type === type && t.category) : undefined;
	return { wallet: newest[0]?.wallet, category: forWallet?.category };
}
