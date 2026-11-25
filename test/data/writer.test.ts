import { describe, expect, it } from 'vitest';
import { setup } from './setup';

describe('Writer.createTransaction', () => {
	it('lunch 1,280 JPY: writes the note at transactions/YYYY/MM and it round-trips', async () => {
		const { app, index, writer } = await setup();
		const r = await writer.createTransaction({ type: 'expense', date: '2026-11-24', wallet: 'PayPay', amount: 1280, category: 'Eating out', merchant: 'Lawson', note: 'Lunch' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.path).toMatch(/^Tane\/transactions\/2026\/11\/2026-11-24 TX-[a-z0-9]{10}\.md$/);
		expect(app.fm(r.path)).toMatchObject({ type: 'expense', wallet: '[[PayPay]]', category: '[[Eating out]]', amount: 1280, currency: 'JPY', fx_rate: 1, amount_base: 1280 });
		const s = await index.rebuild();
		expect(s.problems).toEqual([]);
		expect(s.transactions).toHaveLength(1);
	});

	it('freezes amount_base from the rate on the date for a VND wallet', async () => {
		const { app, writer } = await setup();
		const r = await writer.createTransaction({ type: 'income', date: '2026-11-24', wallet: 'VN Bank', amount: 1_750_000, category: 'Salary' });
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(app.fm(r.path)).toMatchObject({ currency: 'VND', amount_base: 10000 });
	});

	it('refuses with a message and writes nothing when a rule fails', async () => {
		const { app, writer } = await setup();
		const before = app.contents.size;
		const r = await writer.createTransaction({ type: 'expense', date: '2026-11-24', wallet: 'PayPay', amount: 100, category: 'Salary' });
		expect(r.ok).toBe(false);
		expect(!r.ok && r.problems.join(' ')).toMatch(/Salary/);
		expect(app.contents.size).toBe(before);
	});

	it('the same deterministic id twice creates one note (two devices)', async () => {
		const { app, writer } = await setup();
		const input = { type: 'expense' as const, date: '2026-11-24', wallet: 'PayPay', amount: 1, category: 'Eating out', id: 'TX-samesame01' };
		await writer.createTransaction(input);
		const second = await writer.createTransaction(input);
		expect(second.ok && second.existed).toBe(true);
		expect([...app.contents.keys()].filter((p) => p.includes('TX-samesame01'))).toHaveLength(1);
	});
});

describe('Writer.createTransfer', () => {
	it('100,000 JPY → 17,500,000 VND with a 1,500 fee: two notes in one group', async () => {
		const { app, index, writer } = await setup({ feeCategory: 'Fees' });
		const r = await writer.createTransfer({ type: 'transfer', date: '2026-11-24', wallet: 'Yucho', amount: 100000, toWallet: 'VN Bank', toAmount: 17_500_000 }, 1500);
		expect(r.ok).toBe(true);
		const s = await index.rebuild();
		expect(s.problems).toEqual([]);
		expect(s.transactions.map((t) => t.type).sort()).toEqual(['expense', 'transfer']);
		const [a, b] = s.transactions;
		expect(a!.group).toBeDefined();
		expect(a!.group).toBe(b!.group);
		expect(app.fm(s.transactions.find((t) => t.type === 'transfer')!.path).to_amount).toBe(17_500_000);
	});

	it('cross-currency transfer without the amount received is refused', async () => {
		const { writer } = await setup();
		const r = await writer.createTransfer({ type: 'transfer', date: '2026-11-24', wallet: 'Yucho', amount: 100000, toWallet: 'VN Bank' });
		expect(r.ok).toBe(false);
	});
});

describe('Writer.updateTransaction', () => {
	it('moving the date to another month moves the file and keeps id and created', async () => {
		const { app, index, writer } = await setup();
		const r = await writer.createTransaction({ type: 'expense', date: '2026-11-24', wallet: 'PayPay', amount: 1280, category: 'Eating out' });
		await index.rebuild();
		if (!r.ok) throw new Error('create failed');
		const id = app.fm(r.path).id;
		const u = await writer.updateTransaction(r.path, { type: 'expense', date: '2026-12-02', wallet: 'PayPay', amount: 1300, category: 'Eating out' });
		expect(u.ok && u.path).toBe(`Tane/transactions/2026/12/2026-12-02 ${String(id)}.md`);
		if (!u.ok) return;
		expect(app.fm(u.path)).toMatchObject({ id, amount: 1300, created: '2026-11-24T12:32:05' });
		expect(app.contents.has(r.path)).toBe(false);
	});
});

describe('Writer review and trash', () => {
	it('confirming removes review; trash goes to the Obsidian trash', async () => {
		const { app, writer } = await setup();
		const r = await writer.createTransaction({ type: 'expense', date: '2026-11-24', wallet: 'PayPay', amount: 1, category: 'Eating out', review: true });
		if (!r.ok) throw new Error('create failed');
		expect(app.fm(r.path).review).toBe(true);
		await writer.confirmReview(r.path);
		expect(app.fm(r.path).review).toBeUndefined();
		await writer.trash(r.path);
		expect(app.trashed).toEqual([r.path]);
	});
});
