import { budgets } from '../core/calc/budget';
import { formatMoney } from '../core/money';
import { daysLeftIncludingToday, periodOf } from '../core/period';
import { currencyOf } from '../core/settings';
import type TanePlugin from '../main';
import { t } from './i18n';
import { todayLocal } from './time';

/** Desktop status bar: left to spend today (days left when no budget). Click opens the overview. */
export function addStatusBar(plugin: TanePlugin): () => void {
	const item = plugin.addStatusBarItem();
	item.addClass('tane-status', 'mod-clickable');
	plugin.registerDomEvent(item, 'click', () => void plugin.activateView());
	const update = () => {
		const s = plugin.settings;
		const today = todayLocal();
		const p = periodOf(today, s.periodStartDay);
		const b = budgets(plugin.index.snapshot.transactions, plugin.index.snapshot.categories, p, today, s);
		item.setText(
			b.today
				? t.statusBarLeft(formatMoney(Math.floor(b.today.amount), currencyOf(s, s.baseCurrency)))
				: t.statusBar(daysLeftIncludingToday(p, today)),
		);
	};
	update();
	return update;
}
