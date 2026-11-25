import { Component } from 'obsidian';
import { describe, expect, it } from 'vitest';
import { setup } from './setup';

describe('VaultIndex', () => {
	it('loads wallets, categories, people and rates from the vault', async () => {
		const { index } = await setup();
		const s = index.snapshot;
		expect(Object.keys(s.wallets).sort()).toEqual(['PayPay', 'VN Bank', 'Yucho']);
		expect(s.wallets.PayPay!.categories).toEqual(['Eating out']);
		expect(Object.keys(s.people)).toEqual(['Minh']);
		expect(s.fx).toHaveLength(1);
		expect(s.problems).toEqual([]);
	});

	it('a broken note shows in problems, a note outside Tane is ignored', async () => {
		const { app, index } = await setup();
		app.note('Tane/transactions/2026/11/2026-11-24 TX-broken0001.md', { id: 'TX-broken0001', date: '2026-11-24', type: 'expense', wallet: '[[Nowhere]]', amount: 5 });
		app.note('Daily/2026-11-24.md', { amount: 'not tane' });
		const s = await index.rebuild();
		expect(s.problems.map((p) => p.path)).toEqual(['Tane/transactions/2026/11/2026-11-24 TX-broken0001.md']);
		expect(s.transactions).toEqual([]);
	});

	it('vault events trigger a rebuild and a snapshot event', async () => {
		const { app, index } = await setup();
		const owner = new Component();
		index.attach(owner);
		let published = 0;
		index.on('snapshot', () => published++);
		app.note('Tane/people/Lan.md', {});
		await Promise.resolve();
		await Promise.resolve();
		expect(published).toBeGreaterThan(0);
		expect(Object.keys(index.snapshot.people).sort()).toEqual(['Lan', 'Minh']);
		owner.unload();
	});
});
