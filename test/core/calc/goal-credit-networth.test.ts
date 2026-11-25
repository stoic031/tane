import { describe, expect, it } from 'vitest';
import { cardStatus, lastClosingDate } from '../../../src/core/calc/credit';
import { goalStatus } from '../../../src/core/calc/goal';
import { netWorth } from '../../../src/core/calc/networth';
import { EMPTY_SNAPSHOT } from '../../../src/core/types';
import { t, w } from './helpers';

describe('goalStatus', () => {
	const trip = w('Trip', { kind: 'goal', openingBalance: 100000, openingDate: '2026-01-01', goalAmount: 600000, goalDate: '2027-01-01' });

	it('progress, monthly amount needed (rounded up), on track', () => {
		const g = goalStatus(trip, 400000, '2026-07-01');
		expect(g.progress).toBeCloseTo(400000 / 600000, 10);
		expect(g.monthsLeft).toBe(6);
		expect(g.monthlyNeeded).toBe(33334);
		expect(g.onTrack).toBe(true);
		expect(g.reached).toBe(false);
	});

	it('behind: saved below the straight line from opening to goal', () => {
		expect(goalStatus(trip, 200000, '2026-07-01').onTrack).toBe(false);
	});

	it('reached or past the date: no monthly amount', () => {
		expect(goalStatus(trip, 600000, '2026-07-01')).toMatchObject({ reached: true, monthlyNeeded: undefined });
		expect(goalStatus(trip, 1, '2027-02-01').monthlyNeeded).toBeUndefined();
	});

	it('a partial month counts as one, at least 1', () => {
		expect(goalStatus(trip, 1, '2026-12-15').monthsLeft).toBe(1);
	});
});

describe('lastClosingDate', () => {
	it('31 means month end; shorter months clamp', () => {
		expect(lastClosingDate(31, '2026-11-24')).toBe('2026-10-31');
		expect(lastClosingDate(31, '2026-11-30')).toBe('2026-11-30');
		expect(lastClosingDate(30, '2026-03-05')).toBe('2026-02-28');
		expect(lastClosingDate(15, '2026-11-15')).toBe('2026-11-15');
		expect(lastClosingDate(15, '2026-01-10')).toBe('2025-12-15');
	});
});

describe('cardStatus', () => {
	const card = w('Card', { kind: 'credit', statementDay: 31, paymentDay: 27, paymentMonthOffset: 1, payFrom: 'Yucho', openingDate: '2026-10-01' });

	it('statement, still to pay, due date, current cycle', () => {
		const txs = [
			t('expense', 'Card', 48200, { date: '2026-10-12' }),
			t('expense', 'Card', 3000, { date: '2026-11-03' }),
			t('transfer', 'Yucho', 20000, { toWallet: 'Card', toAmount: 20000, date: '2026-11-10' }),
		];
		expect(cardStatus(card, txs, '2026-11-24')).toEqual({
			closing: '2026-10-31',
			statement: 48200,
			stillToPay: 28200,
			dueDate: '2026-11-27',
			cycleSpending: 3000,
		});
	});
});

describe('netWorth', () => {
	it('balances plus they owe me minus I owe, in base; second currency at the latest rate', () => {
		const s = {
			...EMPTY_SNAPSHOT,
			wallets: { Yucho: w('Yucho', { openingBalance: 100000 }), VN: w('VN', { currency: 'VND', openingBalance: 1_750_000 }), Card: w('Card', { kind: 'credit' as const, openingBalance: -5000 }) },
			transactions: [t('lend', 'Yucho', 2000, { person: 'Minh' }), t('borrow', 'Yucho', 1000, { person: 'Lan' })],
			fx: [{ date: '2026-11-01', pair: 'JPYVND', rate: 175, source: 'manual' as const }],
		};
		const r = netWorth(s, '2026-11-24', 'JPY', 'VND');
		// Yucho 100,000 − 2,000 + 1,000; VN 10,000 JPY; Card −5,000; +2,000 owed to me; −1,000 I owe.
		expect(r.base).toBe(99000 + 10000 - 5000 + 2000 - 1000);
		expect(r.second).toBe(r.base * 175);
		expect(r.missingRates).toEqual([]);
	});
});
