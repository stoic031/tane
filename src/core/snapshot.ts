// Parsed notes → one consistent Snapshot. Applies the rules of docs/data-model.md:
// a note that fails parsing or a rule goes to `problems` and counts in no totals.
import { parseCategory, parseInboxItem, parsePerson, parseRecurring, parseTransaction, parseWallet, type RawNote } from './parse';
import { loansByPerson } from './calc/loans';
import { inboxDraft } from './guess';
import { type Category, type FxRow, type Problem, type Recurring, type Snapshot, type Transaction, type Wallet, WALLET_ACCEPTS } from './types';

export { WALLET_ACCEPTS };

type TxFields = Pick<Transaction, 'wallet' | 'type' | 'date' | 'currency' | 'amount'> & Partial<Pick<Transaction, 'category' | 'toWallet' | 'person'>>;

function txRules(t: TxFields, s: Pick<Snapshot, 'wallets' | 'categories' | 'people'>, forWrite: boolean): string[] {
	const out: string[] = [];
	const w = s.wallets[t.wallet];
	if (!w) out.push(`Wallet "${t.wallet}" is missing or needs review`);
	else {
		if (!WALLET_ACCEPTS[w.kind].includes(t.type)) out.push(`A ${w.kind} wallet does not accept ${t.type}`);
		if (t.currency !== w.currency) out.push(`currency ${t.currency} is not the wallet's currency ${w.currency}`);
		if (t.date < w.openingDate) out.push(`date is before the wallet's opening date ${w.openingDate}`);
		if (forWrite && w.archived) out.push(`Wallet "${w.name}" is archived`);
	}
	if (t.category !== undefined) {
		const c = s.categories[t.category];
		if (!c) out.push(`Category "${t.category}" is missing or needs review`);
		else {
			if (c.kind !== t.type) out.push(`Category "${c.name}" is for ${c.kind}, not ${t.type}`);
			// An empty list means the wallet uses every category.
			if (forWrite && w && w.categories.length > 0 && !w.categories.includes(c.name)) out.push(`Wallet "${w.name}" does not use category "${c.name}"`);
			if (forWrite && c.archived) out.push(`Category "${c.name}" is archived`);
		}
	}
	if (t.type === 'transfer') {
		const to = t.toWallet === undefined ? undefined : s.wallets[t.toWallet];
		if (!to) out.push(`Wallet "${t.toWallet ?? ''}" is missing or needs review`);
		else {
			if (to.name === t.wallet) out.push('A transfer needs two different wallets');
			if (t.date < to.openingDate) out.push(`date is before "${to.name}" opened (${to.openingDate})`);
			if (forWrite && to.archived) out.push(`Wallet "${to.name}" is archived`);
		}
	}
	if (t.person !== undefined && !s.people[t.person]) out.push(`Person "${t.person}" is missing`);
	return out;
}

/** Rules the writer checks before creating a transaction (docs/data-model.md § Rules checked before writing). */
export function newTransactionProblems(t: TxFields, s: Snapshot): string[] {
	return txRules(t, s, true);
}

function byNewest<T>(items: { value: T; path: string; key: string }[], idOf: (v: T) => string, problems: Problem[]): T[] {
	const keep = new Map<string, { value: T; path: string; key: string }>();
	for (const it of items) {
		const id = idOf(it.value);
		const other = keep.get(id);
		if (!other) {
			keep.set(id, it);
			continue;
		}
		const [win, lose] = it.key > other.key ? [it, other] : [other, it];
		keep.set(id, win);
		problems.push({ path: lose.path, messages: [`Duplicate id ${id}, also in ${win.path} (usually a sync conflict copy)`] });
	}
	return [...keep.values()].map((x) => x.value);
}

export function buildSnapshot(notes: readonly RawNote[], fx: readonly FxRow[], extraProblems: readonly Problem[] = []): Snapshot {
	const problems: Problem[] = [...extraProblems];
	const fail = (path: string, messages: string[]) => problems.push({ path, messages });

	const parsed = <T>(folder: RawNote['folder'], parse: (n: RawNote) => { ok: true; value: T } | { ok: false; problems: string[] }) => {
		const out: { value: T; note: RawNote }[] = [];
		for (const n of notes) {
			if (n.folder !== folder) continue;
			const r = parse(n);
			if (r.ok) out.push({ value: r.value, note: n });
			else fail(n.path, r.problems);
		}
		return out;
	};

	// Categories: parent must exist, be top level and have the same kind.
	const rawCats = parsed('categories', parseCategory);
	const catByName = new Map(rawCats.map((c) => [c.value.name, c.value]));
	const categories: Record<string, Category> = {};
	for (const { value: c } of rawCats) {
		const msgs: string[] = [];
		if (c.parent !== undefined) {
			const p = catByName.get(c.parent);
			if (!p) msgs.push(`parent "${c.parent}" is missing or needs review`);
			else {
				if (p.kind !== c.kind) msgs.push(`parent "${p.name}" is ${p.kind}, this category is ${c.kind}`);
				if (p.parent !== undefined) msgs.push(`parent "${p.name}" is itself a child; two levels at most`);
			}
		}
		if (msgs.length) fail(c.path, msgs);
		else categories[c.name] = c;
	}

	// Wallets: listed categories must exist and fit the wallet kind; pay_from must be a basic wallet.
	const rawWallets = parsed('wallets', parseWallet);
	const walletKinds = new Map(rawWallets.map((w) => [w.value.name, w.value.kind]));
	const wallets: Record<string, Wallet> = {};
	for (const { value: w } of rawWallets) {
		const msgs: string[] = [];
		for (const name of w.categories) {
			const c = categories[name];
			if (!c) msgs.push(`category "${name}" is missing or needs review`);
			else if (w.kind === 'goal' && c.kind !== 'income') msgs.push(`a goal wallet can only use income categories, not "${name}"`);
		}
		if (w.payFrom !== undefined && walletKinds.get(w.payFrom) !== 'basic') msgs.push(`pay_from "${w.payFrom}" must be a basic wallet`);
		if (msgs.length) fail(w.path, msgs);
		else wallets[w.name] = w;
	}

	const people = Object.fromEntries(parsed('people', parsePerson).map(({ value }) => [value.name, value]));
	const refs = { wallets, categories, people };

	const recurringList = byNewest(
		parsed('recurring', parseRecurring).map(({ value, note }) => ({ value, path: note.path, key: String(note.mtime ?? 0).padStart(16, '0') })),
		(r) => r.id,
		problems,
	);
	const recurring: Record<string, Recurring> = {};
	for (const rc of recurringList) {
		const msgs = txRules({ ...rc, date: rc.start, currency: wallets[rc.wallet]?.currency ?? '' }, refs, false);
		if (msgs.length) fail(rc.path, msgs);
		else recurring[rc.name] = rc;
	}

	const txList = byNewest(
		parsed('transactions', parseTransaction).map(({ value, note }) => ({ value, path: note.path, key: `${value.updated ?? ''}|${note.path}` })),
		(t) => t.id,
		problems,
	);
	const transactions: Transaction[] = [];
	for (const t of txList) {
		const msgs = txRules(t, refs, false);
		if (msgs.length) fail(t.path, msgs);
		else transactions.push(t);
	}
	transactions.sort((a, b) => (a.date === b.date ? (a.created ?? '').localeCompare(b.created ?? '') : a.date.localeCompare(b.date)));

	const snap: Snapshot = { transactions, wallets, categories, people, recurring, inbox: [], fx: [...fx], problems };

	// Inbox notes Tane cannot turn into a transaction stay in place and are listed (docs/data-model.md § Inbox note).
	for (const item of parsed('inbox', parseInboxItem).map((x) => x.value)) {
		const d = inboxDraft(snap, item, '');
		if (d.ok) snap.inbox.push(item);
		else fail(item.path, d.problems);
	}

	// Over-repaid loans (negative balance) need a look (docs/calculations.md § Loans by person).
	for (const l of loansByPerson(transactions, fx, '')) {
		if (l.theyOwe < 0 || l.iOwe < 0) {
			fail(people[l.person]?.path ?? l.person, [`Loans with ${l.person} in ${l.currency} are over-repaid; check the lend/collect or borrow/repay notes`]);
		}
	}

	return snap;
}
