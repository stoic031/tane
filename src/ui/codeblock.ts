import { MarkdownRenderChild, type MarkdownPostProcessorContext } from 'obsidian';
import { t } from './i18n';
import type TanePlugin from '../main';
import { todayLocal } from './time';
import { renderPeriod } from './widgets/period';

/** ```tane <widget>``` blocks (docs/ui.md § Code blocks). M1: period only; the rest arrive in M4. */
export function registerCodeBlocks(plugin: TanePlugin): void {
	plugin.registerMarkdownCodeBlockProcessor('tane', (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		const name = source.trim().split(/\s+/)[0] || 'today';
		const child = new MarkdownRenderChild(el);
		ctx.addChild(child);
		if (name === 'today' || name === 'period') {
			renderPeriod(el, todayLocal(), plugin.settings.periodStartDay);
		} else {
			el.createDiv({ cls: 'tane-muted', text: t.unknownWidget(name) });
		}
	});
}
