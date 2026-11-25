import { en } from '../core/i18n/en';
import { daysLeftIncludingToday, periodOf } from '../core/period';
import type TanePlugin from '../main';
import { todayLocal } from './time';

/** Desktop status bar item; click opens the overview. M1 shows days left, M4 left to spend today. */
export function addStatusBar(plugin: TanePlugin): () => void {
	const item = plugin.addStatusBarItem();
	item.addClass('tane-status', 'mod-clickable');
	plugin.registerDomEvent(item, 'click', () => void plugin.activateView());
	const update = () => {
		const today = todayLocal();
		item.setText(en.statusBar(daysLeftIncludingToday(periodOf(today, plugin.settings.periodStartDay), today)));
	};
	update();
	return update;
}
