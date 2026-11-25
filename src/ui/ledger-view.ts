import { BasesView, type QueryController } from 'obsidian';
import { sumMoney } from '../core/money';
import { periodOf } from '../core/period';
import type { Transaction } from '../core/types';
import type TanePlugin from '../main';
import { t } from './i18n';
import { todayLocal } from './time';
import { money, txRow, type WidgetCtx } from './widgets/kit';

export const LEDGER_VIEW = 'tane-ledger';

/**
 * Tane's Bases view (docs/ui.md § Ledger): the base's rows grouped by day, newest first, with day
 * totals of spending. Rows are looked up in the index, so only valid Tane transactions show.
 */
export class LedgerView extends BasesView {
	type = LEDGER_VIEW;

	constructor(
		controller: QueryController,
		private readonly containerEl: HTMLElement,
		private readonly plugin: TanePlugin,
	) {
		super(controller);
	}

	onload(): void {
		this.registerEvent(this.plugin.index.on('snapshot', () => this.onDataUpdated()));
	}

	onDataUpdated(): void {
		const el = this.containerEl;
		el.empty();
		el.addClass('tane-ledger', 'tane-panel');
		const snap = this.plugin.index.snapshot;
		const byPath = new Map(snap.transactions.map((x) => [x.path, x]));
		const today = todayLocal();
		const p = periodOf(today, this.plugin.settings.periodStartDay);
		const onlyPeriod = (this.config.get('range') ?? 'period') === 'period';
		const txs: Transaction[] = [];
		for (const entry of this.data.data) {
			const tx = byPath.get(entry.file.path);
			if (tx && (!onlyPeriod || (tx.date >= p.start && tx.date <= p.end))) txs.push(tx);
		}
		const ctx: WidgetCtx = { plugin: this.plugin, snap, today };
		if (txs.length === 0) {
			el.createDiv({ cls: 'tane-muted', text: t.noTransactions });
			return;
		}
		const days = new Map<string, Transaction[]>();
		for (const tx of txs.sort((a, b) => b.date.localeCompare(a.date) || (b.created ?? '').localeCompare(a.created ?? ''))) {
			days.set(tx.date, [...(days.get(tx.date) ?? []), tx]);
		}
		for (const [date, list] of days) {
			const day = el.createDiv({ cls: 'tane-card tane-day' });
			const head = day.createDiv({ cls: 'tane-row tane-day-head' });
			head.createSpan({ cls: 'tane-row-label', text: date });
			const spent = sumMoney(list.filter((x) => x.type === 'expense').map((x) => x.amountBase), 2);
			if (spent) head.createSpan({ cls: 'tane-row-value', text: `${t.dayTotal} ${money(ctx, -spent)}` });
			for (const tx of list) txRow(day, ctx, tx, false);
		}
	}
}

export function registerLedger(plugin: TanePlugin): boolean {
	return plugin.registerBasesView(LEDGER_VIEW, {
		name: t.ledger,
		icon: 'wallet',
		factory: (controller, containerEl) => new LedgerView(controller, containerEl, plugin),
		options: () => [{ type: 'dropdown', key: 'range', displayName: t.range, default: 'period', options: { period: t.rangePeriod, all: t.rangeAll } }],
	});
}
