import { describe, expect, it } from 'vitest';
import { walletBalance } from '../../../src/core/calc/balance';
import { t, w } from './helpers';

describe('walletBalance', () => {
	const paypay = w('PayPay', { openingBalance: 10000 });
	const yucho = w('Yucho', { openingBalance: 300000 });
	const vn = w('VN Bank', { currency: 'VND' });

	it('lunch: PayPay −1,280', () => {
		expect(walletBalance(paypay, [t('expense', 'PayPay', 1280)])).toBe(8720);
	});

	it('cross-currency transfer with fee: Yucho −101,500; VN Bank +17,500,000', () => {
		const txs = [t('transfer', 'Yucho', 100000, { toWallet: 'VN Bank', toAmount: 17_500_000 }), t('expense', 'Yucho', 1500)];
		expect(walletBalance(yucho, txs)).toBe(300000 - 101500);
		expect(walletBalance(vn, txs)).toBe(17_500_000);
	});

	it('card payment: Yucho −48,200; card +48,200', () => {
		const txs = [t('transfer', 'Yucho', 48200, { toWallet: 'Card', toAmount: 48200 })];
		expect(walletBalance(w('Card', { kind: 'credit', openingBalance: -48200 }), txs)).toBe(0);
	});

	it('lend and collect: wallet −15,000 net; adjust is signed', () => {
		const txs = [t('lend', 'Yucho', 20000), t('collect', 'Yucho', 5000), t('adjust', 'Yucho', -300)];
		expect(walletBalance(yucho, txs)).toBe(300000 - 15000 - 300);
	});

	it('only from opening_date through the given day', () => {
		const txs = [t('expense', 'PayPay', 100, { date: '2026-10-31' }), t('expense', 'PayPay', 200, { date: '2026-11-10' }), t('expense', 'PayPay', 400, { date: '2026-11-20' })];
		expect(walletBalance(paypay, txs, '2026-11-15')).toBe(9800);
	});
});
