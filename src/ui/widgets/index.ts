import { periodOf, daysLeftIncludingToday } from '../../core/period';
import { t } from '../i18n';
import { reviewWidget, upcomingWidget } from './actions';
import { categoryWidget, personWidget, walletWidget } from './entity';
import { card, muted, type Widget } from './kit';
import { budgetsWidget, cashflowWidget, loansWidget, netWorthWidget, periodWidget, spendingWidget, todayWidget, walletsWidget } from './summary';

/** Widget names usable in ```tane <name>``` blocks (docs/ui.md § Code blocks). */
export const WIDGETS: Record<string, Widget> = {
	today: todayWidget,
	period: periodWidget,
	budgets: budgetsWidget,
	review: reviewWidget,
	upcoming: upcomingWidget,
	cashflow: cashflowWidget,
	spending: spendingWidget,
	networth: netWorthWidget,
	wallets: walletsWidget,
	loans: loansWidget,
	wallet: walletWidget,
	category: categoryWidget,
	person: personWidget,
};

/** The overview panel, top to bottom. */
export const PANEL: Widget[] = [todayWidget, reviewWidget, upcomingWidget, periodWidget, budgetsWidget, spendingWidget, walletsWidget, loansWidget, netWorthWidget];

/** Shown before the index has loaded: the period card needs no data. */
export const loadingWidget: Widget = (el, ctx) => {
	const p = periodOf(ctx.today, ctx.plugin.settings.periodStartDay);
	const c = card(el, t.period(p.key));
	muted(c, t.daysLeft(daysLeftIncludingToday(p, ctx.today), p.days));
};
