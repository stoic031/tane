import { describe, expect, it } from 'vitest';
import { formatMoney, fromMinor, roundTo, toMinor } from '../../src/core/money';

describe('toMinor / fromMinor', () => {
	it('JPY and VND have no decimals', () => {
		expect(toMinor(1280, 0)).toBe(1280);
		expect(fromMinor(17_500_000, 0)).toBe(17_500_000);
	});

	it('two decimals avoid float drift (0.1 + 0.2)', () => {
		expect(fromMinor(toMinor(0.1, 2) + toMinor(0.2, 2), 2)).toBe(0.3);
	});
});

describe('roundTo', () => {
	it('rounds to the currency decimals', () => {
		expect(roundTo(108.0864, 0)).toBe(108);
		expect(roundTo(1.005, 2)).toBe(1.01);
	});
});

describe('formatMoney', () => {
	it('uses the currency decimals and grouping', () => {
		expect(formatMoney(1280, { code: 'JPY', symbol: '¥', decimals: 0 }, 'en-US')).toBe('¥1,280');
		expect(formatMoney(-8900, { code: 'JPY', symbol: '¥', decimals: 0 }, 'en-US')).toBe('-¥8,900');
	});

	it('falls back to the symbol when the code is not a valid ISO code', () => {
		expect(formatMoney(5, { code: 'POINTS', symbol: 'pt', decimals: 0 }, 'en-US')).toBe('5 pt');
	});
});
