// Ids: PREFIX-xxxxxxxxxx (10 chars, a-z 0-9). Never change, never reuse.
// Only transactions, recurring items and groups carry ids; wallets, categories
// and people are identified by their note name (docs/data-model.md § Conventions).

export const ID_PREFIX = {
	transaction: 'TX',
	recurring: 'RC',
	group: 'G',
} as const;

export type IdPrefix = (typeof ID_PREFIX)[keyof typeof ID_PREFIX];

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Fills a byte array with random values. Tests inject a fixed source. */
export type RandomBytes = (bytes: Uint8Array) => void;

const webCryptoBytes: RandomBytes = (bytes) => {
	crypto.getRandomValues(bytes);
};

/** Random id. Default randomness: Web Crypto (Obsidian desktop + mobile, Node 20+). */
export function newId(prefix: IdPrefix, length = 10, random: RandomBytes = webCryptoBytes): string {
	const bytes = new Uint8Array(length);
	random(bytes);
	let s = '';
	for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
	return `${prefix}-${s}`;
}

/**
 * Deterministic id for a transaction generated from a recurring template,
 * so two devices catching up the same occurrence produce the same id.
 * Example: recurringOccurrenceId("RC-abc", "2026-11-27") → "TX-RC-abc-20261127".
 */
export function recurringOccurrenceId(recurringId: string, date: string): string {
	return `TX-${recurringId}-${date.replace(/-/g, '')}`;
}

// Mixed case after the prefix: occurrence ids embed the uppercase RC prefix (TX-RC-…-YYYYMMDD).
export function isId(value: unknown, prefix?: IdPrefix): value is string {
	if (typeof value !== 'string') return false;
	const re = new RegExp(`^${prefix ?? '[A-Z]{1,2}'}-[A-Za-z0-9-]+$`);
	return re.test(value);
}

/** 32-bit FNV-1a hash, enough to tell inbox captures apart. */
function fnv1a(text: string, seed = 0x811c9dc5): number {
	let h = seed;
	for (let i = 0; i < text.length; i++) {
		h ^= text.charCodeAt(i);
		h = Math.imul(h, 0x01000193) >>> 0;
	}
	return h;
}

/**
 * Deterministic id for a transaction made from an inbox note (docs/data-model.md § Inbox note),
 * so the Mac and the iPhone processing the same note produce the same id and path (D-012).
 */
export function inboxTransactionId(item: { amount: number; card?: string; merchant?: string; capturedAt?: string }): string {
	const key = [item.capturedAt ?? '', item.amount, item.card ?? '', item.merchant ?? ''].join('|');
	// Two hashes with different seeds give 64 bits; 10 base-36 characters keep ~51 of them.
	const bytes = new Uint8Array(10);
	const a = fnv1a(key);
	const b = fnv1a(key, 0x01000193);
	for (let i = 0; i < 10; i++) bytes[i] = ((i < 5 ? a : b) >>> ((i % 5) * 6)) & 0xff;
	return newId('TX', 10, (out) => out.set(bytes));
}
