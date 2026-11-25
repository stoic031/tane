// A small fake vault (fake data only) wired to a VaultIndex and a Writer.
import type { App } from 'obsidian';
import { DEFAULT_SETTINGS, type TaneSettings } from '../../src/core/settings';
import { VaultIndex } from '../../src/data/index';
import { Writer } from '../../src/data/writer';
import { FakeApp } from './fake-app';

export async function setup(settings: Partial<TaneSettings> = {}) {
	const app = new FakeApp();
	const s: TaneSettings = { ...DEFAULT_SETTINGS, ...settings };
	app.note('Tane/wallets/PayPay.md', { kind: 'basic', currency: 'JPY', opening_balance: 10000, opening_date: '2026-11-01', categories: ['[[Eating out]]'] });
	app.note('Tane/wallets/Yucho.md', { kind: 'basic', currency: 'JPY', opening_balance: 300000, opening_date: '2026-11-01' });
	app.note('Tane/wallets/VN Bank.md', { kind: 'basic', currency: 'VND', opening_balance: 0, opening_date: '2026-11-01' });
	app.note('Tane/categories/Eating out.md', { kind: 'expense', budget: 40000 });
	app.note('Tane/categories/Fees.md', { kind: 'expense' });
	app.note('Tane/categories/Salary.md', { kind: 'income' });
	app.note('Tane/people/Minh.md', {});
	app.put('Tane/system/fx-rates.csv', 'date,pair,rate,source\n2026-11-01,JPYVND,175,manual\n');
	const index = new VaultIndex(app as unknown as App, () => s);
	const writer = new Writer(app as unknown as App, () => s, () => index.snapshot, () => '2026-11-24T12:32:05');
	await index.rebuild();
	return { app, index, writer, settings: s };
}
