import { ItemView, type WorkspaceLeaf } from 'obsidian';
import { daysLeftIncludingToday, periodOf } from '../core/period';
import type TanePlugin from '../main';
import { todayLocal } from './time';

export const VIEW_TYPE_OVERVIEW = 'tane-overview';

/** Overview panel in the right sidebar (docs/ui.md § Surfaces). M1: period card only. */
export class OverviewView extends ItemView {
	plugin: TanePlugin;

	constructor(leaf: WorkspaceLeaf, plugin: TanePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_OVERVIEW;
	}

	getDisplayText(): string {
		return 'Tane';
	}

	getIcon(): string {
		return 'wallet';
	}

	async onOpen(): Promise<void> {
		this.render();
	}

	render(): void {
		const el = this.contentEl;
		el.empty();
		el.addClass('tane-panel');
		const today = todayLocal();
		const period = periodOf(today, this.plugin.settings.periodStartDay);
		const card = el.createDiv({ cls: 'tane-card' });
		card.createDiv({ cls: 'tane-card-label', text: `Period ${period.key}` });
		card.createDiv({ cls: 'tane-card-value', text: `${period.start} → ${period.end}` });
		card.createDiv({
			cls: 'tane-card-note',
			text: `${daysLeftIncludingToday(period, today)} of ${period.days} days left`,
		});
	}
}
