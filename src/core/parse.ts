// Raw properties → typed records. Spec: docs/data-model.md. Never throws on bad user data.
// The data layer resolves wikilinks before calling these: a link field holds
// { name, folder } (where the target note lives) or { broken: text }.
import { isId } from './ids';
import { parseYmd, type Ymd } from './period';
import {
	type Category,
	type Every,
	type InboxItem,
	LOAN_TYPES,
	type Person,
	type Recurring,
	TX_TYPES,
	type Transaction,
	type TxType,
	WALLET_KINDS,
	type Wallet,
} from './types';

export type FolderKind = 'transactions' | 'wallets' | 'categories' | 'people' | 'recurring' | 'inbox';

export interface RawNote {
	path: string;
	/** File basename: the identity of wallets, categories, people and recurring items. */
	name: string;
	folder: FolderKind;
	fm: Record<string, unknown>;
	/** File modification time, to pick the newer of two duplicate recurring notes. */
	mtime?: number;
}

/** Properties that hold wikilinks, and the folder each must point into. */
export const LINK_FIELDS: Record<string, FolderKind> = {
	wallet: 'wallets',
	to_wallet: 'wallets',
	pay_from: 'wallets',
	category: 'categories',
	parent: 'categories',
	categories: 'categories',
	person: 'people',
	recurring: 'recurring',
};

export type Parsed<T> = { ok: true; value: T } | { ok: false; problems: string[] };

/** Collects problems while reading one note's properties. */
class Reader {
	problems: string[] = [];
	constructor(private readonly fm: Record<string, unknown>) {}

	private has(key: string): boolean {
		const v = this.fm[key];
		return v !== undefined && v !== null && v !== '';
	}

	str(key: string, required = false): string | undefined {
		if (!this.has(key)) {
			if (required) this.problems.push(`Missing ${key}`);
			return undefined;
		}
		const v = this.fm[key];
		if (typeof v === 'string') return v.trim();
		if (typeof v === 'number' || typeof v === 'boolean') return String(v);
		this.problems.push(`${key} must be text`);
		return undefined;
	}

	num(key: string, required = false): number | undefined {
		if (!this.has(key)) {
			if (required) this.problems.push(`Missing ${key}`);
			return undefined;
		}
		const v = this.fm[key];
		const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(/[,\s]/g, '')) : NaN;
		if (!Number.isFinite(n)) {
			this.problems.push(`${key} must be a number`);
			return undefined;
		}
		return n;
	}

	int(key: string, min: number, max: number, required = false): number | undefined {
		const n = this.num(key, required);
		if (n === undefined) return undefined;
		if (!Number.isInteger(n) || n < min || n > max) {
			this.problems.push(`${key} must be a whole number from ${min} to ${max}`);
			return undefined;
		}
		return n;
	}

	date(key: string, required = false): Ymd | undefined {
		const s = this.str(key, required);
		if (s === undefined) return undefined;
		try {
			parseYmd(s);
			return s;
		} catch {
			this.problems.push(`${key} must be a date YYYY-MM-DD`);
			return undefined;
		}
	}

	bool(key: string): boolean {
		const v = this.fm[key];
		return v === true || v === 'true';
	}

	oneOf<T extends string>(key: string, allowed: readonly T[], required = false): T | undefined {
		const s = this.str(key, required);
		if (s === undefined) return undefined;
		if (!allowed.includes(s as T)) {
			this.problems.push(`${key} must be one of ${allowed.join(', ')}`);
			return undefined;
		}
		return s as T;
	}

	private linkValue(key: string, v: unknown): string | undefined {
		const expected = LINK_FIELDS[key];
		if (v && typeof v === 'object' && 'broken' in v) {
			this.problems.push(`${key} links to a note that does not exist: ${String(v.broken)}`);
			return undefined;
		}
		if (v && typeof v === 'object' && 'name' in v && 'folder' in v) {
			const { name, folder } = v as { name: string; folder: string };
			if (folder !== expected) {
				this.problems.push(`${key} must link to a note in ${expected}/, not ${folder}/`);
				return undefined;
			}
			return name;
		}
		this.problems.push(`${key} must be a link like "[[Name]]"`);
		return undefined;
	}

	link(key: string, required = false): string | undefined {
		if (!this.has(key)) {
			if (required) this.problems.push(`Missing ${key}`);
			return undefined;
		}
		return this.linkValue(key, this.fm[key]);
	}

	links(key: string): string[] {
		if (!this.has(key)) return [];
		const v = this.fm[key];
		const list = Array.isArray(v) ? v : [v];
		return list.map((x) => this.linkValue(key, x)).filter((x): x is string => x !== undefined);
	}

	list(key: string): string[] {
		if (!this.has(key)) return [];
		const v = this.fm[key];
		const list = Array.isArray(v) ? v : [v];
		return list.filter((x) => typeof x === 'string' || typeof x === 'number').map((x) => String(x).trim()).filter(Boolean);
	}

	forbid(key: string, why: string): void {
		if (this.has(key)) this.problems.push(`${key} ${why}`);
	}

	result<T>(value: T): Parsed<T> {
		return this.problems.length > 0 ? { ok: false, problems: this.problems } : { ok: true, value };
	}
}

/** Types whose amount may be negative: refunds and signed balance corrections. */
const SIGNED: readonly TxType[] = ['expense', 'adjust'];

export function parseTransaction(note: RawNote): Parsed<Transaction> {
	const r = new Reader(note.fm);
	const id = r.str('id', true);
	if (id !== undefined && !isId(id, 'TX')) r.problems.push('id must look like TX-xxxxxxxxxx');
	const date = r.date('date', true);
	const type = r.oneOf('type', TX_TYPES, true);
	const wallet = r.link('wallet', true);
	const amount = r.num('amount', true);
	if (amount !== undefined && type !== undefined) {
		if (amount === 0) r.problems.push('amount must not be 0');
		else if (amount < 0 && !SIGNED.includes(type)) r.problems.push(`amount must be positive for ${type}`);
	}
	const currency = r.str('currency', true);
	const needsCategory = type === 'expense' || type === 'income';
	const category = needsCategory ? r.link('category', true) : (r.forbid('category', `is not used by ${type}`), undefined);
	let toWallet: string | undefined;
	let toAmount: number | undefined;
	if (type === 'transfer') {
		toWallet = r.link('to_wallet', true);
		toAmount = r.num('to_amount', true);
		if (toAmount !== undefined && toAmount <= 0) r.problems.push('to_amount must be positive');
	}
	const isLoan = type !== undefined && LOAN_TYPES.includes(type);
	const person = isLoan ? r.link('person', true) : (r.forbid('person', 'is only for lend, collect, borrow and repay'), undefined);
	const value: Transaction = {
		id: id ?? '',
		path: note.path,
		date: date ?? '',
		type: type ?? 'expense',
		wallet: wallet ?? '',
		amount: amount ?? 0,
		currency: currency ?? '',
		category,
		toWallet,
		toAmount,
		person,
		dueDate: r.date('due_date'),
		merchant: r.str('merchant'),
		note: r.str('note'),
		tags: r.list('tags'),
		fxRate: r.num('fx_rate', true) ?? 1,
		amountBase: r.num('amount_base', true) ?? 0,
		group: r.str('group'),
		recurring: r.link('recurring'),
		review: r.bool('review'),
		created: r.str('created'),
		updated: r.str('updated'),
	};
	if (value.fxRate <= 0) r.problems.push('fx_rate must be positive');
	return r.result(value);
}

export function parseWallet(note: RawNote): Parsed<Wallet> {
	const r = new Reader(note.fm);
	const kind = r.oneOf('kind', WALLET_KINDS, true);
	const value: Wallet = {
		name: note.name,
		path: note.path,
		kind: kind ?? 'basic',
		currency: r.str('currency', true) ?? '',
		openingBalance: r.num('opening_balance', true) ?? 0,
		openingDate: r.date('opening_date', true) ?? '',
		categories: r.links('categories'),
		aliases: r.list('aliases'),
		icon: r.str('icon'),
		order: r.num('order'),
		archived: r.bool('archived'),
		creditLimit: r.num('credit_limit'),
		interestRate: r.num('interest_rate'),
	};
	if (kind === 'credit') {
		value.statementDay = r.int('statement_day', 1, 31, true);
		value.paymentDay = r.int('payment_day', 1, 31, true);
		value.paymentMonthOffset = r.int('payment_month_offset', 0, 1) ?? 1;
		value.payFrom = r.link('pay_from', true);
	}
	if (kind === 'goal') {
		value.goalAmount = r.num('goal_amount', true);
		if (value.goalAmount !== undefined && value.goalAmount <= 0) r.problems.push('goal_amount must be positive');
		value.goalDate = r.date('goal_date', true);
	}
	return r.result(value);
}

export function parseCategory(note: RawNote): Parsed<Category> {
	const r = new Reader(note.fm);
	const value: Category = {
		name: note.name,
		path: note.path,
		kind: r.oneOf('kind', ['expense', 'income'] as const, true) ?? 'expense',
		parent: r.link('parent'),
		budget: r.num('budget'),
		icon: r.str('icon'),
		order: r.num('order'),
		archived: r.bool('archived'),
	};
	if (value.budget !== undefined && value.budget < 0) r.problems.push('budget must not be negative');
	if (value.parent === note.name) r.problems.push('parent must be another category');
	return r.result(value);
}

export function parsePerson(note: RawNote): Parsed<Person> {
	return { ok: true, value: { name: note.name, path: note.path, archived: new Reader(note.fm).bool('archived') } };
}

const RECURRING_TYPES = ['expense', 'income', 'transfer', 'repay', 'collect'] as const;
const EVERY: readonly Every[] = ['day', 'week', 'month', 'year'];

export function parseRecurring(note: RawNote): Parsed<Recurring> {
	const r = new Reader(note.fm);
	const id = r.str('id', true);
	if (id !== undefined && !isId(id, 'RC')) r.problems.push('id must look like RC-xxxxxxxxxx');
	const type = r.oneOf('type', RECURRING_TYPES, true);
	const amount = r.num('amount', true);
	if (amount !== undefined && amount <= 0) r.problems.push('amount must be positive');
	const value: Recurring = {
		name: note.name,
		path: note.path,
		id: id ?? '',
		mode: r.oneOf('mode', ['auto', 'remind'] as const, true) ?? 'remind',
		type: type ?? 'expense',
		wallet: r.link('wallet', true) ?? '',
		amount: amount ?? 0,
		every: r.oneOf('every', EVERY, true) ?? 'month',
		interval: r.int('interval', 1, 1000, true) ?? 1,
		start: r.date('start', true) ?? '',
		end: r.date('end'),
		next: r.date('next', true) ?? '',
		remindDays: r.int('remind_days', 0, 365),
		archived: r.bool('archived'),
	};
	if (type === 'expense' || type === 'income') value.category = r.link('category', true);
	if (type === 'transfer') {
		value.toWallet = r.link('to_wallet', true);
		value.toAmount = r.num('to_amount', true);
	}
	if (type === 'repay' || type === 'collect') value.person = r.link('person', true);
	return r.result(value);
}

export function parseInboxItem(note: RawNote): Parsed<InboxItem> {
	const r = new Reader(note.fm);
	const amount = r.num('amount', true);
	if (amount !== undefined && amount <= 0) r.problems.push('amount must be positive');
	return r.result({
		path: note.path,
		amount: amount ?? 0,
		currency: r.str('currency'),
		merchant: r.str('merchant'),
		card: r.str('card'),
		capturedAt: r.str('captured_at'),
		source: r.str('source'),
	});
}
