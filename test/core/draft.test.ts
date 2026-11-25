import { describe, expect, it } from 'vitest';
import { draftFromParams, missingFields, parseAmount } from '../../src/core/draft';

describe('parseAmount', () => {
	it('plain and with thousands separators (lunch 1,280 JPY)', () => {
		expect(parseAmount('1280')).toBe(1280);
		expect(parseAmount('1,280')).toBe(1280);
		expect(parseAmount('1 280')).toBe(1280);
		expect(parseAmount(' 17,500,000 ')).toBe(17_500_000);
	});

	it('negative only when allowed (refunds, adjustments)', () => {
		expect(parseAmount('-8,900', true)).toBe(-8900);
		expect(parseAmount('-8900')).toBeUndefined();
	});

	it('decimals', () => {
		expect(parseAmount('12.5')).toBe(12.5);
	});

	it('empty, garbage, zero or negative is no amount', () => {
		expect(parseAmount('')).toBeUndefined();
		expect(parseAmount('abc')).toBeUndefined();
		expect(parseAmount('12a')).toBeUndefined();
		expect(parseAmount('0')).toBeUndefined();
		expect(parseAmount('-8900')).toBeUndefined();
		expect(parseAmount('1.2.3')).toBeUndefined();
	});
});

describe('draftFromParams', () => {
	const today = '2026-11-24';

	it('fills the draft from an obsidian://tane link', () => {
		expect(
			draftFromParams({ action: 'tane', amount: '1280', merchant: 'Lawson', wallet: 'PayPay', category: 'Eating out' }, today),
		).toEqual({
			type: 'expense',
			amount: 1280,
			merchant: 'Lawson',
			wallet: 'PayPay',
			category: 'Eating out',
			date: today,
		});
	});

	it('defaults to an expense dated today', () => {
		expect(draftFromParams({ action: 'tane' }, today)).toEqual({ type: 'expense', date: today });
	});

	it('keeps a valid type and date', () => {
		const d = draftFromParams({ action: 'tane', type: 'lend', date: '2026-11-25', person: 'Minh' }, today);
		expect(d.type).toBe('lend');
		expect(d.person).toBe('Minh');
		expect(d.date).toBe('2026-11-25');
	});

	it('drops invalid values instead of failing', () => {
		const d = draftFromParams({ action: 'tane', amount: 'lots', type: 'gift', date: '2026-02-30', merchant: '  ' }, today);
		expect(d).toEqual({ type: 'expense', date: today });
	});
});

describe('missingFields', () => {
	const base = { date: '2026-11-24' };

	it('expense needs amount, wallet and category', () => {
		expect(missingFields({ ...base, type: 'expense' })).toEqual(['amount', 'wallet', 'category']);
		expect(missingFields({ ...base, type: 'expense', amount: 1280, wallet: 'PayPay', category: 'Eating out' })).toEqual([]);
	});

	it('loan types need a person, adjust needs only amount and wallet', () => {
		expect(missingFields({ ...base, type: 'lend', amount: 20000, wallet: 'Yucho' })).toEqual(['person']);
		expect(missingFields({ ...base, type: 'adjust', amount: -500, wallet: 'Yucho' })).toEqual([]);
	});

	it('transfer needs a receiving wallet instead of a category', () => {
		expect(missingFields({ ...base, type: 'transfer', amount: 48200, wallet: 'Yucho' })).toEqual(['toWallet']);
		expect(missingFields({ ...base, type: 'transfer', amount: 48200, wallet: 'Yucho', toWallet: 'Card' })).toEqual([]);
	});
});
