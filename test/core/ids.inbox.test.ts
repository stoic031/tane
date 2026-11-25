import { describe, expect, it } from 'vitest';
import { inboxTransactionId, isId } from '../../src/core/ids';

describe('inboxTransactionId', () => {
	const item = { amount: 1280, card: 'Rakuten Card', merchant: 'Lawson', capturedAt: '2026-11-24T12:32:05' };

	it('is a valid TX id and the same on every device', () => {
		const id = inboxTransactionId(item);
		expect(isId(id, 'TX')).toBe(true);
		expect(id).toMatch(/^TX-[a-z0-9]{10}$/);
		expect(inboxTransactionId({ ...item })).toBe(id);
	});

	it('differs when the capture differs', () => {
		expect(inboxTransactionId({ ...item, amount: 1281 })).not.toBe(inboxTransactionId(item));
		expect(inboxTransactionId({ ...item, capturedAt: '2026-11-24T12:32:06' })).not.toBe(inboxTransactionId(item));
	});
});
