import { ItemView, type WorkspaceLeaf } from 'obsidian';
import type TanePlugin from '../main';
import { t } from './i18n';
import { todayLocal } from './time';
import { PANEL } from './widgets';
import type { WidgetCtx } from './widgets/kit';

export const VIEW_TYPE_OVERVIEW = 'tane-overview';

/** Overview panel in the right sidebar (docs/ui.md § Surfaces). Re-rendered on every index snapshot. */
export class OverviewView extends ItemView {
	constructor(
		leaf: WorkspaceLeaf,
		private readonly plugin: TanePlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_OVERVIEW;
	}

	getDisplayText(): string {
		return t.tane;
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
		const ctx: WidgetCtx = { plugin: this.plugin, snap: this.plugin.index.snapshot, today: todayLocal() };
		for (const widget of PANEL) {
			try {
				widget(el, ctx);
			} catch (e) {
				void this.plugin.log(`panel widget ${widget.name}`, e);
			}
		}
	}
}
