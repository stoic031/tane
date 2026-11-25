import { describe, expect, it } from 'vitest';
import { tanePaths, transactionPath } from '../../src/data/paths';

describe('tanePaths', () => {
	it('builds every folder under the root', () => {
		const p = tanePaths('Tane');
		expect(p.transactions).toBe('Tane/transactions');
		expect(p.people).toBe('Tane/people');
		expect(p.fxRates).toBe('Tane/system/fx-rates.csv');
	});

	it('normalises slashes and falls back to Tane for a blank root', () => {
		expect(tanePaths('/Finance/Tane/').root).toBe('Finance/Tane');
		expect(tanePaths('   ').root).toBe('Tane');
	});
});

describe('transactionPath', () => {
	it('files a transaction under its year and month', () => {
		expect(transactionPath(tanePaths('Tane'), '2026-11-24', 'TX-k7x2m9p4qa')).toBe(
			'Tane/transactions/2026/11/2026-11-24 TX-k7x2m9p4qa.md',
		);
	});
});
