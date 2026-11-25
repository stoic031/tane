import { type App, normalizePath, TFile } from 'obsidian';
import { occurrenceAfter } from '../core/calc/recurring';
import { rateOn } from '../core/fx';
import { newId } from '../core/ids';
import { roundTo } from '../core/money';
import type { Ymd } from '../core/period';
import { type LinkField, propertyValue, toFrontmatter, transactionProperties } from '../core/serialize';
import { currencyOf, type TaneSettings } from '../core/settings';
import { newTransactionProblems } from '../core/snapshot';
import { LOAN_TYPES, type Recurring, type Snapshot, type Transaction, type TxType } from '../core/types';
import { nowLocal } from './clock';
import { linkTo } from './links';
import { tanePaths, transactionPath } from './paths';

/** What a surface hands the writer: plain values, names instead of links. */
export interface NewTransaction {
	type: TxType;
	date: Ymd;
	wallet: string;
	amount: number;
	category?: string;
	toWallet?: string;
	toAmount?: number;
	person?: string;
	dueDate?: Ymd;
	merchant?: string;
	note?: string;
	tags?: string[];
	review?: boolean;
	recurring?: string;
	group?: string;
	/** Deterministic ids for recurring occurrences and inbox items; random otherwise. */
	id?: string;
}

export type WriteResult = { ok: true; path: string; existed?: boolean } | { ok: false; problems: string[] };

/**
 * Every write to Tane's notes (docs/architecture.md § Writing). Validates with src/core first and
 * writes nothing if a rule fails. Does not touch the index: vault events do.
 */
export class Writer {
	constructor(
		private readonly app: App,
		private readonly settings: () => TaneSettings,
		private readonly snapshot: () => Snapshot,
		private readonly now: () => string = nowLocal,
	) {}

	private get paths() {
		return tanePaths(this.settings().rootFolder);
	}

	/** Full record with frozen fx_rate and amount_base, or the problems that stop it. */
	build(input: NewTransaction, existing?: Pick<Transaction, 'id' | 'created'>): { ok: true; tx: Transaction } | { ok: false; problems: string[] } {
		const s = this.snapshot();
		const settings = this.settings();
		const wallet = s.wallets[input.wallet];
		const problems: string[] = [];
		if (!wallet) return { ok: false, problems: [`Wallet "${input.wallet}" is missing or needs review`] };
		if (!Number.isFinite(input.amount) || input.amount === 0) problems.push('Amount must be a number other than 0');
		if (input.amount < 0 && input.type !== 'expense' && input.type !== 'adjust') problems.push(`Amount must be positive for ${input.type}`);
		const fxRate = rateOn(s.fx, wallet.currency, settings.baseCurrency, input.date);
		if (fxRate === undefined) problems.push(`No exchange rate from ${wallet.currency} to ${settings.baseCurrency}; add one in Tane's settings`);
		const isLoan = LOAN_TYPES.includes(input.type);
		const toWallet = input.type === 'transfer' ? input.toWallet : undefined;
		const toCurrency = toWallet ? s.wallets[toWallet]?.currency : undefined;
		const toAmount = toWallet ? (toCurrency === wallet.currency ? (input.toAmount ?? input.amount) : input.toAmount) : undefined;
		if (toWallet && toAmount === undefined) problems.push('Enter the amount received');
		const now = this.now();
		const tx: Transaction = {
			id: existing?.id ?? input.id ?? newId('TX'),
			path: '',
			date: input.date,
			type: input.type,
			wallet: wallet.name,
			amount: input.amount,
			currency: wallet.currency,
			category: input.type === 'expense' || input.type === 'income' ? input.category : undefined,
			toWallet,
			toAmount,
			person: isLoan ? input.person : undefined,
			dueDate: input.type === 'lend' || input.type === 'borrow' ? input.dueDate : undefined,
			merchant: input.merchant?.trim() || undefined,
			note: input.note?.trim() || undefined,
			tags: input.tags ?? [],
			fxRate: fxRate ?? 1,
			amountBase: roundTo(input.amount * (fxRate ?? 1), currencyOf(settings, settings.baseCurrency).decimals),
			group: input.group,
			recurring: input.recurring,
			review: input.review ?? false,
			created: existing?.created ?? now,
			updated: now,
		};
		if ((tx.type === 'expense' || tx.type === 'income') && !tx.category) problems.push('Choose a category');
		if (isLoan && !tx.person) problems.push('Choose a person');
		problems.push(...newTransactionProblems(tx, s));
		return problems.length ? { ok: false, problems } : { ok: true, tx };
	}

	private link(name: string, folder: string, sourcePath: string): string {
		const file = this.app.vault.getFileByPath(normalizePath(`${folder}/${name}.md`));
		return file ? linkTo(this.app, file, sourcePath) : name;
	}

	private props(tx: Transaction, sourcePath: string) {
		const p = this.paths;
		const dirs: Record<LinkField, string> = { wallet: p.wallets, category: p.categories, person: p.people, recurring: p.recurring };
		return transactionProperties(tx, (name, field) => this.link(name, dirs[field], sourcePath));
	}

	private async ensureFolder(dir: string): Promise<void> {
		const parts = normalizePath(dir).split('/');
		for (let i = 1; i <= parts.length; i++) {
			const p = parts.slice(0, i).join('/');
			if (!this.app.vault.getAbstractFileByPath(p)) await this.app.vault.createFolder(p);
		}
	}

	private async create(tx: Transaction, body = ''): Promise<WriteResult> {
		const path = transactionPath(this.paths, tx.date, tx.id);
		if (this.app.vault.getAbstractFileByPath(path)) return { ok: true, path, existed: true };
		await this.ensureFolder(path.split('/').slice(0, -1).join('/'));
		await this.app.vault.create(path, toFrontmatter(this.props(tx, path)) + body);
		return { ok: true, path };
	}

	async createTransaction(input: NewTransaction, body = ''): Promise<WriteResult> {
		const r = this.build(input);
		return r.ok ? this.create(r.tx, body) : r;
	}

	/** A transfer and its optional fee (an expense in the fee category), linked by one group id. */
	async createTransfer(input: NewTransaction, fee?: number): Promise<WriteResult> {
		const group = fee ? newId('G') : undefined;
		const t = this.build({ ...input, type: 'transfer', group });
		const feeCategory = this.settings().feeCategory;
		const noFeeCategory: WriteResult = { ok: false, problems: ['Set a fee category in Tane settings first'] };
		const f = fee
			? feeCategory
				? this.build({ type: 'expense', date: input.date, wallet: input.wallet, amount: fee, category: feeCategory, group, note: input.note })
				: noFeeCategory
			: undefined;
		if (!t.ok) return t;
		if (f && !f.ok) return f;
		const result = await this.create(t.tx);
		if (f?.ok) await this.create(f.tx);
		return result;
	}

	/** Edit in place; moves the file when the date changes month. */
	async updateTransaction(path: string, input: NewTransaction): Promise<WriteResult> {
		const file = this.app.vault.getFileByPath(path);
		const old = this.snapshot().transactions.find((t) => t.path === path);
		if (!file) return { ok: false, problems: ['The transaction note no longer exists'] };
		const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
		const id = old?.id ?? (typeof fm.id === 'string' ? fm.id : undefined);
		const r = this.build(input, { id: id ?? newId('TX'), created: old?.created ?? (typeof fm.created === 'string' ? fm.created : undefined) });
		if (!r.ok) return r;
		const props = this.props(r.tx, path);
		await this.app.fileManager.processFrontMatter(file, (front: Record<string, unknown>) => {
			for (const [k, v] of props) {
				if (v === undefined) delete front[k];
				else front[k] = propertyValue(v);
			}
		});
		const target = transactionPath(this.paths, r.tx.date, r.tx.id);
		if (target !== path) {
			await this.ensureFolder(target.split('/').slice(0, -1).join('/'));
			await this.app.fileManager.renameFile(file, target);
		}
		return { ok: true, path: target };
	}

	async setProperties(path: string, patch: Record<string, unknown>): Promise<void> {
		const file = this.app.vault.getFileByPath(path);
		if (!file) return;
		const stamp = path.startsWith(this.paths.transactions + '/');
		await this.app.fileManager.processFrontMatter(file, (front: Record<string, unknown>) => {
			for (const [k, v] of Object.entries(patch)) {
				if (v === undefined) delete front[k];
				else front[k] = v;
			}
			if (stamp) front.updated = this.now();
		});
	}

	/** Move a recurring item past `done` (paid, skipped or auto-logged); archive it past its end. */
	advanceRecurring(rc: Recurring, done: Ymd): Promise<void> {
		const next = occurrenceAfter(rc, done);
		return this.setProperties(rc.path, { next, archived: rc.end !== undefined && next > rc.end ? true : undefined });
	}

	/** Confirm a captured transaction: it leaves the to-review box. */
	confirmReview(path: string): Promise<void> {
		return this.setProperties(path, { review: undefined });
	}

	async trash(path: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file) await this.app.fileManager.trashFile(file);
	}

	/** Append text to a plain file (fx-rates.csv), creating it with `header` if missing. */
	async appendFile(path: string, header: string, text: string): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) await this.app.vault.append(file, text);
		else {
			await this.ensureFolder(path.split('/').slice(0, -1).join('/'));
			await this.app.vault.create(path, header + '\n' + text);
		}
	}

	/** Create a plain note only if nothing exists at the path (generated .base files, exports). */
	async createIfMissing(path: string, content: string): Promise<boolean> {
		if (this.app.vault.getAbstractFileByPath(path)) return false;
		await this.ensureFolder(path.split('/').slice(0, -1).join('/'));
		await this.app.vault.create(path, content);
		return true;
	}
}
