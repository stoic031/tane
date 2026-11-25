// docs/calculations.md § Goals (goal wallets).
import { diffDays, parseYmd, type Ymd } from '../period';
import type { Wallet } from '../types';

export interface GoalStatus {
	saved: number;
	progress: number;
	reached: boolean;
	monthsLeft?: number;
	/** Not shown when reached or past the date. */
	monthlyNeeded?: number;
	onTrack: boolean;
}

/** Calendar months from today to the goal date, a partial month counting as one, at least 1. */
function monthsUntil(today: Ymd, goal: Ymd): number {
	const a = parseYmd(today);
	const b = parseYmd(goal);
	const months = (b.y - a.y) * 12 + (b.m - a.m) + (b.d > a.d ? 1 : 0);
	return Math.max(1, months);
}

export function goalStatus(w: Wallet, saved: number, today: Ymd): GoalStatus {
	const goal = w.goalAmount ?? 0;
	const reached = goal > 0 && saved >= goal;
	const past = w.goalDate !== undefined && today > w.goalDate;
	const monthsLeft = w.goalDate && !past ? monthsUntil(today, w.goalDate) : undefined;
	const monthlyNeeded = !reached && monthsLeft !== undefined ? Math.max(1, Math.ceil((goal - saved) / monthsLeft)) : undefined;
	let onTrack = reached;
	if (!reached && w.goalDate) {
		const total = diffDays(w.openingDate, w.goalDate);
		const done = Math.min(total, Math.max(0, diffDays(w.openingDate, today)));
		onTrack = total <= 0 || saved >= w.openingBalance + ((goal - w.openingBalance) * done) / total;
	}
	return { saved, progress: goal > 0 ? saved / goal : 0, reached, monthsLeft, monthlyNeeded, onTrack };
}
