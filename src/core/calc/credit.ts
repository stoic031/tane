// docs/calculations.md § Credit cards. Estimates: purchases near closing may land on the next statement.
import { parseYmd, type Ymd } from '../period';
import type { Transaction, Wallet } from '../types';
import { walletBalance } from './balance';

const pad = (n: number) => String(n).padStart(2, '0');
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** Day `day` of a month, clamped to the month's last day (31 = month end). m may overflow. */
function clampedDate(y: number, m: number, day: number): Ymd {
	const yy = y + Math.floor((m - 1) / 12);
	const mm = ((((m - 1) % 12) + 12) % 12) + 1;
	return `${yy}-${pad(mm)}-${pad(Math.min(day, lastDay(yy, mm)))}`;
}

/** Latest statement closing date not after today. */
export function lastClosingDate(statementDay: number, today: Ymd): Ymd {
	const { y, m } = parseYmd(today);
	const thisMonth = clampedDate(y, m, statementDay);
	return thisMonth <= today ? thisMonth : clampedDate(y, m - 1, statementDay);
}

export interface CardStatus {
	closing: Ymd;
	/** −B(card, closing): what the last statement asks for. */
	statement: number;
	stillToPay: number;
	dueDate: Ymd;
	cycleSpending: number;
}

export function cardStatus(card: Wallet, txs: readonly Transaction[], today: Ymd): CardStatus {
	const closing = lastClosingDate(card.statementDay ?? 31, today);
	const statement = -walletBalance(card, txs, closing);
	const after = txs.filter((t) => t.date > closing && t.date <= today);
	const paid = after.filter((t) => t.type === 'transfer' && t.toWallet === card.name).reduce((s, t) => s + (t.toAmount ?? 0), 0);
	const { y, m } = parseYmd(closing);
	return {
		closing,
		statement,
		stillToPay: Math.max(0, statement - paid),
		dueDate: clampedDate(y, m + (card.paymentMonthOffset ?? 1), card.paymentDay ?? 27),
		cycleSpending: after.filter((t) => t.type === 'expense' && t.wallet === card.name).reduce((s, t) => s + t.amount, 0),
	};
}

