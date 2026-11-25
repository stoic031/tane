import { t } from '../i18n';
import { daysLeftIncludingToday, periodOf, type Ymd } from '../../core/period';

/** Period card: key, dates, days left. Shared by the overview panel and the `tane period` code block. */
export function renderPeriod(el: HTMLElement, today: Ymd, startDay: number): void {
	const period = periodOf(today, startDay);
	const card = el.createDiv({ cls: 'tane-card' });
	card.createDiv({ cls: 'tane-card-label', text: t.period(period.key) });
	card.createDiv({ cls: 'tane-card-value', text: `${period.start} → ${period.end}` });
	card.createDiv({ cls: 'tane-card-note', text: t.daysLeft(daysLeftIncludingToday(period, today), period.days) });
}
