import { describe, expect, it } from 'vitest';
import { transactionProperties, toFrontmatter } from '../../src/core/serialize';
import type { Transaction } from '../../src/core/types';

const lunch: Transaction = {
	id: 'TX-k7x2m9p4qa',
	path: '',
	date: '2026-11-24',
	type: 'expense',
	wallet: 'PayPay',
	amount: 1280,
	currency: 'JPY',
	category: 'Eating out',
	merchant: 'Lawson',
	note: 'Lunch',
	tags: [],
	fxRate: 1,
	amountBase: 1280,
	review: false,
	created: '2026-11-24T12:32:05',
	updated: '2026-11-24T12:32:05',
};

describe('toFrontmatter', () => {
	it('matches the example in docs/data-model.md', () => {
		expect(toFrontmatter(transactionProperties(lunch, (n) => n))).toBe(`---
id: TX-k7x2m9p4qa
date: 2026-11-24
type: expense
wallet: "[[PayPay]]"
amount: 1280
currency: JPY
category: "[[Eating out]]"
merchant: Lawson
note: Lunch
fx_rate: 1
amount_base: 1280
created: 2026-11-24T12:32:05
updated: 2026-11-24T12:32:05
---
`);
	});

	it('quotes text that YAML would misread, and writes lists and booleans', () => {
		const fm = toFrontmatter([
			['merchant', 'Café: "Blue"'],
			['note', '123'],
			['tags', ['okinawa-2027']],
			['review', true],
			['empty', undefined],
		]);
		expect(fm).toContain('merchant: "Café: \\"Blue\\""');
		expect(fm).toContain('note: "123"');
		expect(fm).toContain('tags:\n  - okinawa-2027');
		expect(fm).toContain('review: true');
		expect(fm).not.toContain('empty');
	});
});
