// Parsed records. Spec: docs/data-model.md. Links are stored as note names (identity = note name, D-005).
import type { Ymd } from './period';

export const TX_TYPES = ['expense', 'income', 'transfer', 'adjust', 'lend', 'collect', 'borrow', 'repay'] as const;
export type TxType = (typeof TX_TYPES)[number];
export const LOAN_TYPES: readonly TxType[] = ['lend', 'collect', 'borrow', 'repay'];

export const WALLET_KINDS = ['basic', 'credit', 'goal'] as const;
export type WalletKind = (typeof WALLET_KINDS)[number];

/** docs/data-model.md: which transaction types each wallet kind accepts. */
export const WALLET_ACCEPTS: Record<WalletKind, readonly TxType[]> = {
	basic: ['expense', 'income', 'transfer', 'adjust', 'lend', 'collect', 'borrow', 'repay'],
	credit: ['expense', 'income', 'transfer', 'adjust'],
	goal: ['income', 'transfer', 'adjust'],
};

export type CategoryKind = 'expense' | 'income';

export interface Transaction {
	id: string;
	path: string;
	date: Ymd;
	type: TxType;
	wallet: string;
	/** In the wallet's currency; negative only for refunds and adjustments. */
	amount: number;
	currency: string;
	category?: string;
	toWallet?: string;
	toAmount?: number;
	person?: string;
	dueDate?: Ymd;
	merchant?: string;
	note?: string;
	tags: string[];
	fxRate: number;
	amountBase: number;
	group?: string;
	recurring?: string;
	review: boolean;
	created?: string;
	updated?: string;
}

export interface Wallet {
	name: string;
	path: string;
	kind: WalletKind;
	currency: string;
	openingBalance: number;
	openingDate: Ymd;
	categories: string[];
	aliases: string[];
	icon?: string;
	order?: number;
	archived: boolean;
	statementDay?: number;
	paymentDay?: number;
	paymentMonthOffset?: number;
	payFrom?: string;
	creditLimit?: number;
	goalAmount?: number;
	goalDate?: Ymd;
	interestRate?: number;
}

export interface Category {
	name: string;
	path: string;
	kind: CategoryKind;
	parent?: string;
	budget?: number;
	icon?: string;
	order?: number;
	archived: boolean;
}

export interface Person {
	name: string;
	path: string;
	archived: boolean;
}

export type RecurringMode = 'auto' | 'remind';
export type Every = 'day' | 'week' | 'month' | 'year';

export interface Recurring {
	name: string;
	path: string;
	id: string;
	mode: RecurringMode;
	type: TxType;
	wallet: string;
	amount: number;
	category?: string;
	toWallet?: string;
	toAmount?: number;
	person?: string;
	every: Every;
	interval: number;
	start: Ymd;
	end?: Ymd;
	next: Ymd;
	remindDays?: number;
	archived: boolean;
}

export interface InboxItem {
	path: string;
	amount: number;
	currency?: string;
	merchant?: string;
	card?: string;
	capturedAt?: string;
	source?: string;
}

export interface Currency {
	code: string;
	symbol: string;
	decimals: number;
}

export interface FxRow {
	date: Ymd;
	/** "JPYVND" = VND per 1 JPY. */
	pair: string;
	rate: number;
	source: 'api' | 'manual';
}

/** A note left out of every total until fixed (docs/data-model.md § Needs review). */
export interface Problem {
	path: string;
	messages: string[];
}

/** Everything the UI and calculations read; immutable once published. */
export interface Snapshot {
	transactions: Transaction[];
	wallets: Record<string, Wallet>;
	categories: Record<string, Category>;
	people: Record<string, Person>;
	recurring: Record<string, Recurring>;
	inbox: InboxItem[];
	fx: FxRow[];
	problems: Problem[];
}

export const EMPTY_SNAPSHOT: Snapshot = {
	transactions: [],
	wallets: {},
	categories: {},
	people: {},
	recurring: {},
	inbox: [],
	fx: [],
	problems: [],
};
