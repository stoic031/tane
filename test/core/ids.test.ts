import { describe, expect, it } from 'vitest';
import { isId, newId, recurringOccurrenceId } from '../../src/core/ids';

describe('ids', () => {
	it('newId has the prefix and 10 lowercase alphanumerics', () => {
		const id = newId('TX');
		expect(id).toMatch(/^TX-[a-z0-9]{10}$/);
	});

	it('newId is not repeated in a quick sample', () => {
		const seen = new Set(Array.from({ length: 1000 }, () => newId('G')));
		expect(seen.size).toBe(1000);
	});

	it('recurring occurrence ids are deterministic', () => {
		expect(recurringOccurrenceId('RC-abc123defg', '2026-11-27')).toBe('TX-RC-abc123defg-20261127');
		expect(recurringOccurrenceId('RC-abc123defg', '2026-11-27')).toBe(
			recurringOccurrenceId('RC-abc123defg', '2026-11-27'),
		);
	});

	it('isId checks the prefix', () => {
		expect(isId('TX-k7x2m9p4qa', 'TX')).toBe(true);
		expect(isId('RC-k7x2m9p4qa', 'TX')).toBe(false);
		expect(isId(42)).toBe(false);
	});

	it('isId accepts recurring occurrence ids as transaction ids', () => {
		expect(isId(recurringOccurrenceId('RC-abc123defg', '2026-11-27'), 'TX')).toBe(true);
	});
});
