import { MarkdownRenderChild, type MarkdownPostProcessorContext } from 'obsidian';
import type TanePlugin from '../main';
import { t } from './i18n';
import { todayLocal } from './time';
import { WIDGETS } from './widgets';

/** One ```tane <widget> [name]``` block; re-renders when the index publishes a new snapshot. */
class TaneBlock extends MarkdownRenderChild {
	constructor(
		el: HTMLElement,
		private readonly plugin: TanePlugin,
		private readonly source: string,
		private readonly sourcePath: string,
	) {
		super(el);
	}

	onload(): void {
		this.render();
		this.registerEvent(this.plugin.index.on('snapshot', () => this.render()));
	}

	render(): void {
		const el = this.containerEl;
		el.empty();
		el.addClass('tane-block');
		const [name = 'today', ...rest] = this.source.trim().split(/\s+/);
		const widget = WIDGETS[name.toLowerCase()];
		if (!widget) {
			el.createDiv({ cls: 'tane-muted', text: t.unknownWidget(name) });
			return;
		}
		try {
			widget(el, { plugin: this.plugin, snap: this.plugin.index.snapshot, today: todayLocal(), sourcePath: this.sourcePath, arg: rest.join(' ') });
		} catch (e) {
			void this.plugin.log(`code block ${name}`, e);
		}
	}
}

/** ```tane <widget>``` blocks (docs/ui.md § Code blocks). */
export function registerCodeBlocks(plugin: TanePlugin): void {
	plugin.registerMarkdownCodeBlockProcessor('tane', (source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
		ctx.addChild(new TaneBlock(el, plugin, source, ctx.sourcePath));
	});
}
