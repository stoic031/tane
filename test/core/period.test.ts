import { describe, expect, it } from 'vitest';
import {
	addDays,
	daysElapsedIncludingToday,
	daysLeftIncludingToday,
	diffDays,
	parseYmd,
	periodByKey,
	periodOf,
} from '../../src/core/period';

describe('periodByKey', () => {
	it('calendar month when start day is 1', () => {
		expect(periodByKey('2026-11', 1)).toEqual({
			key: '2026-11',
			start: '2026-11-01',
			end: '2026-11-30',
			days: 30,
		});
	});

	it('spec example: D = 25, period 2026-11 is 2026-10-25 .. 2026-11-24', () => {
		const p = periodByKey('2026-11', 25);
		expect(p.start).toBe('2026-10-25');
		expect(p.end).toBe('2026-11-24');
		expect(p.days).toBe(31);
	});

	it('D <= 15 names the period by its start month', () => {
		const p = periodByKey('2026-11', 15);
		expect(p.start).toBe('2026-11-15');
		expect(p.end).toBe('2026-12-14');
	});

	it('crosses the year for D > 15 in January', () => {
		const p = periodByKey('2027-01', 25);
		expect(p.start).toBe('2026-12-25');
		expect(p.end).toBe('2027-01-24');
	});

	it('February in a leap year', () => {
		expect(periodByKey('2028-02', 1).days).toBe(29);
	});

	it('rejects start days outside 1..28', () => {
		expect(() => periodByKey('2026-11', 0)).toThrow(RangeError);
		expect(() => periodByKey('2026-11', 29)).toThrow(RangeError);
	});
});

describe('periodOf', () => {
	it('finds the D = 25 period for a date before payday', () => {
		expect(periodOf('2026-11-09', 25).key).toBe('2026-11');
	});

	it('payday itself starts the next period', () => {
		const p = periodOf('2026-11-25', 25);
		expect(p.key).toBe('2026-12');
		expect(p.start).toBe('2026-11-25');
	});

	it('D <= 15, early in the month belongs to the previous period', () => {
		const p = periodOf('2026-01-05', 10);
		expect(p.key).toBe('2025-12');
		expect(p.start).toBe('2025-12-10');
		expect(p.end).toBe('2026-01-09');
	});

	it('every date of a period maps back to that period', () => {
		const p = periodByKey('2026-03', 25);
		for (let d = p.start; d <= p.end; d = addDays(d, 1)) {
			expect(periodOf(d, 25).key).toBe('2026-03');
		}
	});
});

describe('day counts', () => {
	const p = periodByKey('2026-11', 25); // 2026-10-25 .. 2026-11-24, 31 days

	it('days left counts today', () => {
		expect(daysLeftIncludingToday(p, '2026-11-24')).toBe(1);
		expect(daysLeftIncludingToday(p, '2026-10-25')).toBe(31);
		expect(daysLeftIncludingToday(p, '2026-11-25')).toBe(0);
	});

	it('days elapsed counts today', () => {
		expect(daysElapsedIncludingToday(p, '2026-10-25')).toBe(1);
		expect(daysElapsedIncludingToday(p, '2026-12-01')).toBe(31);
		expect(daysElapsedIncludingToday(p, '2026-10-01')).toBe(0);
	});

	it('diffDays and addDays agree across DST-free UTC math', () => {
		expect(diffDays('2026-03-01', '2026-04-01')).toBe(31);
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
	});

	it('rejects impossible dates', () => {
		expect(() => parseYmd('2026-02-30')).toThrow(RangeError);
		expect(() => parseYmd('26-2-3')).toThrow(RangeError);
	});
});
