import { ItemView, type WorkspaceLeaf } from 'obsidian';
import { en } from '../core/i18n/en';
import type TanePlugin from '../main';
import { todayLocal } from './time';
import { renderPeriod } from './widgets/period';

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
		return en.tane;
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
		renderPeriod(el, todayLocal(), this.plugin.settings.periodStartDay);
	}
}
