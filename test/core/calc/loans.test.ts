import { describe, expect, it } from 'vitest';
import { loansByPerson } from '../../../src/core/calc/loans';
import { t } from './helpers';

const fx = [{ date: '2026-11-01', pair: 'JPYVND', rate: 175, source: 'manual' as const }];

describe('loansByPerson', () => {
	it('lend Minh 20,000; collect 5,000 → Minh owes 15,000', () => {
		const r = loansByPerson([t('lend', 'Yucho', 20000, { person: 'Minh' }), t('collect', 'Yucho', 5000, { person: 'Minh' })], fx, '2026-11-24');
		expect(r).toEqual([{ person: 'Minh', currency: 'JPY', theyOwe: 15000, iOwe: 0, dueDate: undefined, overdue: false }]);
	});

	it('borrow Lan 50,000; repay 20,000 → I owe Lan 30,000; directions are never netted', () => {
		const r = loansByPerson(
			[t('borrow', 'Yucho', 50000, { person: 'Lan' }), t('repay', 'Yucho', 20000, { person: 'Lan' }), t('lend', 'Yucho', 1000, { person: 'Lan' })],
			fx,
			'2026-11-24',
		);
		expect(r).toEqual([{ person: 'Lan', currency: 'JPY', theyOwe: 1000, iOwe: 30000, dueDate: undefined, overdue: false }]);
	});

	it('D-016: lend 20,000 JPY, collect 1,750,000 VND at 175 → Minh owes 10,000 JPY', () => {
		const r = loansByPerson(
			[t('lend', 'Yucho', 20000, { person: 'Minh', date: '2026-11-05' }), t('collect', 'VN Bank', 1_750_000, { person: 'Minh', currency: 'VND', date: '2026-11-20' })],
			fx,
			'2026-11-24',
		);
		expect(r).toEqual([{ person: 'Minh', currency: 'JPY', theyOwe: 10000, iOwe: 0, dueDate: undefined, overdue: false }]);
	});

	it('settled loans disappear; due date is the latest while open; overdue after it', () => {
		const r = loansByPerson(
			[
				t('lend', 'Yucho', 1000, { person: 'Minh', dueDate: '2026-11-10' }),
				t('lend', 'Yucho', 1000, { person: 'Minh', dueDate: '2026-11-20' }),
				t('borrow', 'Yucho', 500, { person: 'Lan' }),
				t('repay', 'Yucho', 500, { person: 'Lan' }),
			],
			fx,
			'2026-11-24',
		);
		expect(r).toEqual([{ person: 'Minh', currency: 'JPY', theyOwe: 2000, iOwe: 0, dueDate: '2026-11-20', overdue: true }]);
	});

	it('over-repaid shows as negative (needs review)', () => {
		const r = loansByPerson([t('lend', 'Yucho', 100, { person: 'Minh' }), t('collect', 'Yucho', 150, { person: 'Minh' })], fx, '2026-11-24');
		expect(r[0]!.theyOwe).toBe(-50);
	});
});
