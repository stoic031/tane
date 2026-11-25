import { ItemView, type WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import type TanePlugin from '../main';
import App from './App.svelte';
import { UiStore } from './store.svelte';
import { todayLocal } from './time';

export const VIEW_TYPE_TANE = 'tane-view';

/**
 * Hosts the Svelte app inside an Obsidian tab
 * (Obsidian guide "Use Svelte in your plugin": mount in onOpen, unmount in onClose).
 * The view owns one UiStore; updating it re-renders only what depends on it.
 */
export class TaneView extends ItemView {
	plugin: TanePlugin;
	readonly store = new UiStore();
	private component: ReturnType<typeof mount> | undefined;

	constructor(leaf: WorkspaceLeaf, plugin: TanePlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return VIEW_TYPE_TANE;
	}

	getDisplayText(): string {
		return 'Tane';
	}

	getIcon(): string {
		return 'wallet';
	}

	async onOpen(): Promise<void> {
		this.refresh();
		this.contentEl.addClass('tane-root');
		this.component = mount(App, {
			target: this.contentEl,
			props: { store: this.store },
		});
	}

	async onClose(): Promise<void> {
		if (this.component) {
			await unmount(this.component);
			this.component = undefined;
		}
	}

	/** Push current settings and date into the store. */
	refresh(): void {
		this.store.today = todayLocal();
		this.store.periodStartDay = this.plugin.settings.periodStartDay;
	}
}
