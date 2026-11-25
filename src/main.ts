import { Plugin, type WorkspaceLeaf } from 'obsidian';
import { type Draft, draftFromParams, draftFromTransaction } from './core/draft';
import { DEFAULT_SETTINGS, type TaneSettings } from './core/settings';
import { VaultIndex } from './data/index';
import { logError } from './data/log';
import { Writer } from './data/writer';
import { TaneSettingTab } from './settings';
import { AddTransactionModal } from './ui/add-modal';
import { registerCodeBlocks } from './ui/codeblock';
import { t } from './ui/i18n';
import { OverviewView, VIEW_TYPE_OVERVIEW } from './ui/panel';
import { addStatusBar } from './ui/statusbar';
import { todayLocal } from './ui/time';

// Plugin lifecycle only. Layers: src/ui (Obsidian surfaces) -> src/data (Obsidian I/O) -> src/core (pure logic).
export default class TanePlugin extends Plugin {
	settings!: TaneSettings;
	index!: VaultIndex;
	writer!: Writer;
	private updateStatusBar: (() => void) | undefined;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.index = new VaultIndex(this.app, () => this.settings);
		this.writer = new Writer(this.app, () => this.settings, () => this.index.snapshot);

		this.registerView(VIEW_TYPE_OVERVIEW, (leaf) => new OverviewView(leaf, this));
		registerCodeBlocks(this);

		this.addRibbonIcon('wallet', t.openOverview, () => void this.activateView());
		this.addRibbonIcon('plus-circle', t.addTransaction, () => this.openAddModal({ type: 'expense', date: todayLocal() }));

		this.addCommand({ id: 'open', name: 'Open overview', callback: () => void this.activateView() });
		this.addCommand({ id: 'add-transaction', name: t.addTransaction, callback: () => this.openAddModal({ type: 'expense', date: todayLocal() }) });
		this.addCommand({
			id: 'edit-transaction',
			name: t.editTransaction,
			checkCallback: (checking) => {
				const path = this.app.workspace.getActiveFile()?.path;
				const tx = this.index.snapshot.transactions.find((x) => x.path === path);
				if (!tx) return false;
				if (!checking) this.openAddModal(draftFromTransaction(tx));
				return true;
			},
		});

		// obsidian://tane?amount=1280&merchant=Lawson (iOS Shortcuts, widgets, Back Tap).
		this.registerObsidianProtocolHandler('tane', (params) => this.openAddModal(draftFromParams(params, todayLocal())));

		this.addSettingTab(new TaneSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => void this.start());
	}

	/** Heavy work waits for layout ready (docs/obsidian-rules.md). */
	private async start(): Promise<void> {
		try {
			this.index.attach(this);
			this.registerEvent(this.index.on('snapshot', () => this.refreshViews()));
			this.updateStatusBar = addStatusBar(this);
			await this.index.rebuild();
		} catch (e) {
			await this.log('load', e);
		}
	}

	openAddModal(draft: Draft): void {
		new AddTransactionModal(this, draft).open();
	}

	log(step: string, err: unknown): Promise<void> {
		return logError(this.app, this.index.paths.log, this.manifest.version, step, err);
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, (await this.loadData()) as Partial<TaneSettings>);
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
