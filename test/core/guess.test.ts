import { describe, expect, it } from 'vitest';
import { guessCategory, inboxDraft, matchWallet } from '../../src/core/guess';
import { buildSnapshot } from '../../src/core/snapshot';
import { category, L, tx, wallet } from './fake';

const s = buildSnapshot(
	[
		wallet('Rakuten Card', { kind: 'credit', statement_day: 31, payment_day: 27, pay_from: L('Yucho'), aliases: ['楽天カード', 'Rakuten'] }),
		wallet('Yucho'),
		wallet('PayPay', { categories: [L('Eating out', 'categories'), L('Groceries', 'categories')] }),
		category('Eating out'),
		category('Groceries'),
		category('Transport'),
		tx({ wallet: L('Yucho'), amount: 500, category: L('Transport', 'categories'), merchant: 'Lawson', created: '2026-11-01T08:00:00' }),
		tx({ wallet: L('Yucho'), amount: 600, category: L('Groceries', 'categories'), merchant: 'lawson', created: '2026-11-02T08:00:00' }),
	],
	[],
);

describe('matchWallet', () => {
	it('by name or alias, ignoring case and spacing', () => {
		expect(matchWallet(s.wallets, 'Rakuten Card')).toBe('Rakuten Card');
		expect(matchWallet(s.wallets, '楽天カード')).toBe('Rakuten Card');
		expect(matchWallet(s.wallets, ' rakuten ')).toBe('Rakuten Card');
		expect(matchWallet(s.wallets, 'Unknown')).toBeUndefined();
		expect(matchWallet(s.wallets, undefined)).toBeUndefined();
	});
});

describe('guessCategory', () => {
	it('category of the latest transaction with the same merchant, if the wallet uses it', () => {
		expect(guessCategory(s, 'LAWSON', 'Yucho')).toBe('Groceries');
		expect(guessCategory(s, 'Lawson', 'PayPay')).toBe('Groceries');
	});

	it('otherwise the first expense category the wallet uses', () => {
		expect(guessCategory(s, 'New shop', 'PayPay')).toBe('Eating out');
	});
});

describe('inboxDraft', () => {
	it('expense for review, dated from captured_at, deterministic id', () => {
		const item = { path: 'Tane/inbox/a.md', amount: 1280, merchant: 'Lawson', card: 'Rakuten Card', capturedAt: '2026-11-24T12:32:05' };
		const d = inboxDraft(s, item, '2026-11-25');
		expect(d.ok && d.value).toMatchObject({ type: 'expense', wallet: 'Rakuten Card', amount: 1280, date: '2026-11-24', merchant: 'Lawson', review: true });
		expect(d.ok && d.value.id).toMatch(/^TX-[a-z0-9]{10}$/);
	});

	it('no matching wallet or a different currency → problem', () => {
		expect(inboxDraft(s, { path: 'p', amount: 1, card: 'Nope' }, '2026-11-25').ok).toBe(false);
		expect(inboxDraft(s, { path: 'p', amount: 1, card: 'Yucho', currency: 'VND' }, '2026-11-25').ok).toBe(false);
	});
});
