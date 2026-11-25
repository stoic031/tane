// docs/calculations.md § Loans by person, with D-016 (repayments in another currency).
import { convert } from '../fx';
import type { Ymd } from '../period';
import type { FxRow, Transaction } from '../types';

export interface LoanLine {
	person: string;
	currency: string;
	/** Σ lend − Σ collect. */
	theyOwe: number;
	/** Σ borrow − Σ repay. */
	iOwe: number;
	dueDate?: Ymd;
	overdue: boolean;
}

type Side = 'theyOwe' | 'iOwe';
const SIDE: Partial<Record<Transaction['type'], [Side, 1 | -1]>> = {
	lend: ['theyOwe', 1],
	collect: ['theyOwe', -1],
	borrow: ['iOwe', 1],
	repay: ['iOwe', -1],
};

/** Per person and currency; wallets combined; the two directions never netted. Settled lines are left out. */
export function loansByPerson(txs: readonly Transaction[], fx: readonly FxRow[], today: Ymd): LoanLine[] {
	const lines = new Map<string, LoanLine & { opened: Ymd; dues: Ymd[] }>();
	const key = (p: string, c: string) => `${p}\u0000${c}`;
	const sorted = [...txs].filter((t) => t.person !== undefined && SIDE[t.type]).sort((a, b) => a.date.localeCompare(b.date));
	for (const t of sorted) {
		const [side, sign] = SIDE[t.type]!;
		const person = t.person!;
		let currency = t.currency;
		let amount = t.amount;
		if (sign < 0 && !((lines.get(key(person, currency))?.[side] ?? 0) > 0)) {
			// D-016: pay back the oldest open loan of this direction, converted at the payment date's rate.
			const open = [...lines.values()].filter((l) => l.person === person && l[side] > 0).sort((a, b) => a.opened.localeCompare(b.opened))[0];
			const converted = open ? convert(t.amount, t.currency, open.currency, t.date, fx, open.currency) : undefined;
			if (open && converted !== undefined) {
				currency = open.currency;
				amount = converted;
			}
		}
		const k = key(person, currency);
		const line = lines.get(k) ?? { person, currency, theyOwe: 0, iOwe: 0, overdue: false, opened: t.date, dues: [] };
		line[side] += sign * amount;
		if (sign > 0 && t.dueDate) line.dues.push(t.dueDate);
		lines.set(k, line);
	}
	return [...lines.values()]
		.filter((l) => Math.abs(l.theyOwe) > 1e-9 || Math.abs(l.iOwe) > 1e-9)
		.map(({ person, currency, theyOwe, iOwe, dues }) => {
			const dueDate = dues.length ? dues.sort().at(-1) : undefined;
			return { person, currency, theyOwe: Math.round(theyOwe * 100) / 100, iOwe: Math.round(iOwe * 100) / 100, dueDate, overdue: dueDate !== undefined && today > dueDate };
		})
		.sort((a, b) => a.person.localeCompare(b.person) || a.currency.localeCompare(b.currency));
}
