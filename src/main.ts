import { Plugin, type WorkspaceLeaf } from 'obsidian';
import { type Draft, draftFromParams } from './core/draft';
import { en } from './core/i18n/en';
import { DEFAULT_SETTINGS, type TaneSettings, TaneSettingTab } from './settings';
import { AddTransactionModal } from './ui/add-modal';
import { registerCodeBlocks } from './ui/codeblock';
import { OverviewView, VIEW_TYPE_OVERVIEW } from './ui/panel';
import { addStatusBar } from './ui/statusbar';
import { todayLocal } from './ui/time';

// Plugin lifecycle only. Layers: src/ui (Obsidian surfaces) -> src/data (Obsidian I/O) -> src/core (pure logic).
export default class TanePlugin extends Plugin {
	settings!: TaneSettings;
	/** Preselected in the next add-transaction modal (docs/ui.md). In memory until the index exists (M2). */
	lastWallet: string | undefined;
	lastCategory: string | undefined;
	private updateStatusBar: (() => void) | undefined;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_OVERVIEW, (leaf) => new OverviewView(leaf, this));
		registerCodeBlocks(this);

		this.addRibbonIcon('wallet', en.openOverview, () => {
			void this.activateView();
		});
		this.addRibbonIcon('plus-circle', en.addTransaction, () => {
			this.openAddModal({ type: 'expense', date: todayLocal() });
		});

		this.addCommand({
			id: 'open',
			name: 'Open overview',
			callback: () => {
				void this.activateView();
			},
		});
		this.addCommand({
			id: 'add-transaction',
			name: en.addTransaction,
			callback: () => {
				this.openAddModal({ type: 'expense', date: todayLocal() });
			},
		});

		// obsidian://tane?amount=1280&merchant=Lawson (iOS Shortcuts, widgets, Back Tap).
		this.registerObsidianProtocolHandler('tane', (params) => {
			this.openAddModal(draftFromParams(params, todayLocal()));
		});

		this.addSettingTab(new TaneSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => {
			this.updateStatusBar = addStatusBar(this);
		});
	}

	openAddModal(draft: Draft): void {
		draft.wallet ??= this.lastWallet;
		if (draft.type !== 'transfer') draft.category ??= this.lastCategory;
		new AddTransactionModal(this, draft).open();
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<TaneSettings>,
		);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	refreshViews(): void {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_OVERVIEW)) {
			if (leaf.view instanceof OverviewView) leaf.view.render();
		}
		this.updateStatusBar?.();
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_OVERVIEW)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getRightLeaf(false);
			if (!leaf) return;
			await leaf.setViewState({ type: VIEW_TYPE_OVERVIEW, active: true });
		}
		await workspace.revealLeaf(leaf);
	}
}
