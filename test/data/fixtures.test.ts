import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { App } from 'obsidian';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../../src/core/settings';
import { VaultIndex } from '../../src/data/index';
import { FakeApp } from './fake-app';

/** Load a folder of notes from disk into the in-memory vault (fake data only). */
export function loadFixture(app: FakeApp, dir: string, prefix = ''): void {
	for (const name of readdirSync(dir)) {
		const p = path.join(dir, name);
		const vaultPath = prefix ? `${prefix}/${name}` : name;
		if (statSync(p).isDirectory()) loadFixture(app, p, vaultPath);
		else app.put(vaultPath, readFileSync(p, 'utf8'));
	}
}

describe('fixtures/vault-small', () => {
	it('loads with every note valid', async () => {
		const app = new FakeApp();
		loadFixture(app, 'fixtures/vault-small');
		const index = new VaultIndex(app as unknown as App, () => DEFAULT_SETTINGS);
		const s = await index.rebuild();
		expect(s.problems).toEqual([]);
		expect(s.transactions).toHaveLength(13);
		expect(Object.keys(s.wallets)).toHaveLength(5);
		expect(Object.keys(s.recurring)).toHaveLength(3);
		expect(s.inbox).toHaveLength(1);
		expect(new Set(s.transactions.map((t) => t.type))).toEqual(new Set(['expense', 'income', 'transfer', 'lend', 'collect', 'borrow', 'repay']));
	});
});
