// CSV export of transactions (docs/product.md § Insight). RFC 4180 quoting.
import type { Transaction } from './types';

const COLUMNS = ['id', 'date', 'type', 'wallet', 'amount', 'currency', 'category', 'to_wallet', 'to_amount', 'person', 'merchant', 'note', 'tags', 'fx_rate', 'amount_base', 'group', 'recurring', 'review'];

function cell(v: string | number | boolean | string[] | undefined): string {
	if (v === undefined) return '';
	let s = Array.isArray(v) ? v.join(' ') : String(v);
	// A leading = + - @ would run as a formula in spreadsheet apps.
	if (typeof v === 'string' && /^[=+\-@]/.test(s)) s = `'${s}`;
	return /[",\n\r]/.test(s) || s.startsWith("'") ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsCsv(txs: readonly Transaction[]): string {
	const rows = [COLUMNS.join(',')];
	for (const t of [...txs].sort((a, b) => a.date.localeCompare(b.date))) {
		rows.push(
			[t.id, t.date, t.type, t.wallet, t.amount, t.currency, t.category, t.toWallet, t.toAmount, t.person, t.merchant, t.note, t.tags, t.fxRate, t.amountBase, t.group, t.recurring, t.review]
				.map(cell)
				.join(','),
		);
	}
	return rows.join('\n') + '\n';
}
