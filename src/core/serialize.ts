// Records → YAML frontmatter, in the property order of docs/data-model.md.
import type { Transaction } from './types';

export type PropValue = string | number | boolean | string[] | { link: string } | undefined;
export type Props = [key: string, value: PropValue][];

export type LinkField = 'wallet' | 'category' | 'person' | 'recurring';

/** `link` turns a note name into the link text Obsidian should store (shortest unambiguous path). */
export function transactionProperties(t: Transaction, link: (name: string, field: LinkField) => string): Props {
	const l = (name: string | undefined, field: LinkField = 'wallet') => (name === undefined ? undefined : { link: link(name, field) });
	return [
		['id', t.id],
		['date', t.date],
		['type', t.type],
		['wallet', l(t.wallet)],
		['amount', t.amount],
		['currency', t.currency],
		['category', l(t.category, 'category')],
		['to_wallet', l(t.toWallet)],
		['to_amount', t.toAmount],
		['person', l(t.person, 'person')],
		['due_date', t.dueDate],
		['merchant', t.merchant],
		['note', t.note],
		['tags', t.tags.length ? t.tags : undefined],
		['fx_rate', t.fxRate],
		['amount_base', t.amountBase],
		['group', t.group],
		['recurring', l(t.recurring, 'recurring')],
		['review', t.review || undefined],
		['created', t.created],
		['updated', t.updated],
	];
}

const DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/;
const PLAIN = /^[\p{L}\p{N}][\p{L}\p{N} _.\-/]*$/u;
const RESERVED = /^(true|false|yes|no|on|off|null|~)$/i;

function scalar(v: string | number | boolean): string {
	if (typeof v !== 'string') return String(v);
	if (DATE.test(v)) return v;
	const looksNumeric = v.trim() !== '' && !Number.isNaN(Number(v));
	if (PLAIN.test(v) && v === v.trim() && !looksNumeric && !RESERVED.test(v)) return v;
	return JSON.stringify(v);
}

/** Value as Obsidian stores it in frontmatter: links become "[[...]]" strings. */
export function propertyValue(v: Exclude<PropValue, undefined>): string | number | boolean | string[] {
	return typeof v === 'object' && !Array.isArray(v) ? `[[${v.link}]]` : v;
}

export function toFrontmatter(props: Props): string {
	const lines = ['---'];
	for (const [k, v] of props) {
		if (v === undefined) continue;
		if (Array.isArray(v)) {
			lines.push(`${k}:`);
			for (const item of v) lines.push(`  - ${scalar(item)}`);
		} else if (typeof v === 'object') lines.push(`${k}: ${JSON.stringify(`[[${v.link}]]`)}`);
		else lines.push(`${k}: ${scalar(v)}`);
	}
	lines.push('---', '');
	return lines.join('\n');
}
