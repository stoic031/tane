// docs/calculations.md § Wallet balance. Amounts in the wallet's own currency.
import { sumMoney } from '../money';
import type { Ymd } from '../period';
import type { Transaction, TxType, Wallet } from '../types';

const SIGN: Record<TxType, 1 | -1> = { income: 1, collect: 1, borrow: 1, adjust: 1, expense: -1, lend: -1, repay: -1, transfer: -1 };

/** Change to `wallet` caused by one transaction (0 if it does not touch it). */
export function walletDelta(t: Transaction, wallet: string): number {
	let d = 0;
	if (t.wallet === wallet) d += SIGN[t.type] * t.amount;
	if (t.type === 'transfer' && t.toWallet === wallet) d += t.toAmount ?? 0;
	return d;
}

/** B(W, d): opening balance plus every transaction from opening_date through `until` (default: all). */
export function walletBalance(w: Wallet, txs: readonly Transaction[], until?: Ymd): number {
	const deltas = txs.filter((t) => t.date >= w.openingDate && (until === undefined || t.date <= until)).map((t) => walletDelta(t, w.name));
	// ponytail: 2 decimals covers every currency in use; read decimals from settings if a 3-decimal currency appears.
	return sumMoney([w.openingBalance, ...deltas], 2);
}
