import { describe, expect, it } from 'vitest';
import { catchUpPlan, dueReminders, estimate, nthOccurrence, occurrencesBetween, upcoming } from '../../../src/core/calc/recurring';
import type { Recurring } from '../../../src/core/types';
import { t } from './helpers';

const rc = (fields: Partial<Recurring>): Recurring => ({
	name: 'Rent',
	path: '',
	id: 'RC-rent000001',
	mode: 'auto',
	type: 'expense',
	wallet: 'Yucho',
	amount: 80000,
	category: 'Rent',
	every: 'month',
	interval: 1,
	start: '2026-11-27',
	next: '2026-11-27',
	archived: false,
	...fields,
});

describe('nthOccurrence', () => {
	it('monthly on the 31st falls on the last day of shorter months and comes back', () => {
		const r = rc({ start: '2026-01-31' });
		expect([0, 1, 2, 3].map((k) => nthOccurrence(r, k))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
	});

	it('days, weeks, years', () => {
		expect(nthOccurrence(rc({ every: 'day', interval: 3 }), 2)).toBe('2026-12-03');
		expect(nthOccurrence(rc({ every: 'week', interval: 2 }), 1)).toBe('2026-12-11');
		expect(nthOccurrence(rc({ every: 'year', start: '2028-02-29' }), 1)).toBe('2029-02-28');
	});
});

describe('occurrencesBetween', () => {
	it('from next through a date, never past end', () => {
		const r = rc({ next: '2026-12-27', end: '2027-02-27' });
		expect(occurrencesBetween(r, r.next, '2027-12-31')).toEqual(['2026-12-27', '2027-01-27', '2027-02-27']);
	});
});

describe('catchUpPlan', () => {
	it('auto: every missed occurrence through today, then the next one', () => {
		expect(catchUpPlan(rc({}), '2027-01-30')).toEqual({ dates: ['2026-11-27', '2026-12-27', '2027-01-27'], next: '2027-02-27', archive: false });
	});

	it('nothing due yet', () => {
		expect(catchUpPlan(rc({}), '2026-11-26')).toEqual({ dates: [], next: '2026-11-27', archive: false });
	});

	it('archives past end', () => {
		expect(catchUpPlan(rc({ end: '2026-12-27' }), '2027-01-30')).toEqual({ dates: ['2026-11-27', '2026-12-27'], next: '2027-01-27', archive: true });
	});
});

describe('dueReminders', () => {
	const elec = rc({ name: 'Electricity', mode: 'remind', next: '2026-11-30', start: '2026-10-30', remindDays: 5 });

	it('due soon from next − remind_days', () => {
		expect(dueReminders(elec, '2026-11-24', 3)).toEqual([]);
		expect(dueReminders(elec, '2026-11-25', 3)).toEqual([{ date: '2026-11-30', overdue: false }]);
	});

	it('overdue occurrences one by one, oldest first', () => {
		expect(dueReminders(elec, '2027-01-02', 3)).toEqual([
			{ date: '2026-11-30', overdue: true },
			{ date: '2026-12-30', overdue: true },
		]);
	});
});

describe('estimate', () => {
	it('average of the last 3 transactions it produced, else its amount', () => {
		const txs = [1000, 2000, 3000, 9000].map((a, i) => t('expense', 'Yucho', a, { recurring: 'Electricity', date: `2026-0${i + 1}-30` }));
		expect(estimate(rc({ name: 'Electricity', amount: 8500 }), txs)).toBe(14000 / 3);
		expect(estimate(rc({ name: 'Water', amount: 4000 }), txs)).toBe(4000);
	});
});

describe('upcoming', () => {
	it('occurrences in the next 30 days plus overdue reminders, by date', () => {
		const items = [rc({}), rc({ name: 'Electricity', mode: 'remind', next: '2026-11-20', start: '2026-10-20' })];
		expect(upcoming(items, '2026-11-24', 30).map((u) => [u.item.name, u.date, u.overdue])).toEqual([
			['Electricity', '2026-11-20', true],
			['Rent', '2026-11-27', false],
			['Electricity', '2026-12-20', false],
		]);
	});
});
