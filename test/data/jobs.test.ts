import { describe, expect, it } from 'vitest';
import { catchUp, fetchRates, processInbox, staleBaseAmounts } from '../../src/data/jobs';
import { setup } from './setup';

describe('processInbox', () => {
	it('a captured payment becomes a review expense and the inbox note goes to the trash; twice is safe', async () => {
		const { app, index, writer, settings } = await setup();
		app.note('Tane/inbox/cap.md', { amount: 1280, merchant: 'Lawson', card: 'PayPay', captured_at: '2026-11-24T12:32:05', source: 'wallet-tap' });
		await index.rebuild();
		const deps = { writer, snapshot: () => index.snapshot, settings: () => settings, today: '2026-11-25' };
		expect(await processInbox(deps)).toBe(1);
		expect(app.trashed).toEqual(['Tane/inbox/cap.md']);
		const s = await index.rebuild();
		expect(s.transactions).toHaveLength(1);
		expect(s.transactions[0]).toMatchObject({ review: true, wallet: 'PayPay', category: 'Eating out', date: '2026-11-24' });

		// The other device saw the same inbox note before the trash synced.
		app.note('Tane/inbox/cap.md', { amount: 1280, merchant: 'Lawson', card: 'PayPay', captured_at: '2026-11-24T12:32:05' });
		await index.rebuild();
		await processInbox(deps);
		expect((await index.rebuild()).transactions).toHaveLength(1);
	});

	it('an unknown card stays in the inbox and shows in needs-review', async () => {
		const { app, index } = await setup();
		app.note('Tane/inbox/x.md', { amount: 5, card: 'Mystery card' });
		const s = await index.rebuild();
		expect(s.inbox).toEqual([]);
		expect(s.problems.map((p) => p.path)).toEqual(['Tane/inbox/x.md']);
	});
});

describe('catchUp', () => {
	it('logs every missed auto occurrence with deterministic ids and moves next on', async () => {
		const { app, index, writer, settings } = await setup();
		app.note('Tane/categories/Rent.md', { kind: 'expense' });
		app.note('Tane/recurring/Rent.md', { id: 'RC-rent000001', mode: 'auto', type: 'expense', wallet: '[[Yucho]]', amount: 80000, category: '[[Rent]]', every: 'month', interval: 1, start: '2026-11-27', next: '2026-11-27' });
		await index.rebuild();
		const deps = { writer, snapshot: () => index.snapshot, settings: () => settings, today: '2027-01-30' };
		expect((await catchUp(deps)).logged).toBe(3);
		expect(app.fm('Tane/recurring/Rent.md').next).toBe('2027-02-27');
		const s = await index.rebuild();
		expect(s.transactions.map((t) => t.id)).toEqual(['TX-RC-rent000001-20261127', 'TX-RC-rent000001-20261227', 'TX-RC-rent000001-20270127']);
		expect(s.problems).toEqual([]);

		// Second device with the old `next`: nothing new is written.
		expect((await catchUp({ ...deps, snapshot: () => ({ ...s, recurring: { Rent: { ...s.recurring.Rent!, next: '2026-11-27' } } }) })).logged).toBe(0);
	});
});

describe('fetchRates', () => {
	it('appends api rows for configured currencies; falls back to the second host', async () => {
		const { app, index, writer, settings } = await setup();
		const urls: string[] = [];
		const fetcher = async (url: string) => {
			urls.push(url);
			if (url.includes('jsdelivr')) throw new Error('offline');
			return { date: '2026-11-25', jpy: { vnd: 161.9, usd: 0.0064 } };
		};
		const n = await fetchRates({ writer, snapshot: () => index.snapshot, settings: () => settings, today: '2026-11-25' }, fetcher, 'Tane/system/fx-rates.csv');
		expect(n).toBe(1);
		expect(urls).toHaveLength(2);
		expect(app.contents.get('Tane/system/fx-rates.csv')).toContain('2026-11-25,JPYVND,161.9,api');
	});
});

describe('staleBaseAmounts', () => {
	it('finds transactions whose amount_base no longer matches the rate table', async () => {
		const { app, index, writer } = await setup();
		await writer.createTransaction({ type: 'income', date: '2026-11-24', wallet: 'VN Bank', amount: 1_750_000, category: 'Salary' });
		app.put('Tane/system/fx-rates.csv', 'date,pair,rate,source\n2026-11-01,JPYVND,175,manual\n2026-11-20,JPYVND,170,manual\n');
		const s = await index.rebuild();
		expect(staleBaseAmounts(s, { ...(await setup()).settings })).toEqual([{ path: s.transactions[0]!.path, fxRate: 1 / 170, amountBase: 10294 }]);
	});
});
