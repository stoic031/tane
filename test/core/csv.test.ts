import { describe, expect, it } from 'vitest';
import { transactionsCsv } from '../../src/core/csv';
import { t } from './calc/helpers';

describe('transactionsCsv', () => {
	it('header and one row per transaction, quoting commas and quotes', () => {
		const csv = transactionsCsv([t('expense', 'PayPay', 1280, { id: 'TX-k7x2m9p4qa', category: 'Eating out', merchant: 'Lawson, Shibuya', note: 'He said "hi"' })]);
		const [head, row] = csv.trim().split('\n');
		expect(head).toBe('id,date,type,wallet,amount,currency,category,to_wallet,to_amount,person,merchant,note,tags,fx_rate,amount_base,group,recurring,review');
		expect(row).toBe('TX-k7x2m9p4qa,2026-11-24,expense,PayPay,1280,JPY,Eating out,,,,"Lawson, Shibuya","He said ""hi""",,1,1280,,,false');
	});

	it('guards against spreadsheet formulas in text', () => {
		expect(transactionsCsv([t('expense', 'PayPay', 1, { note: '=HYPERLINK("x")' })])).toContain(`"'=HYPERLINK(""x"")"`);
	});
});
