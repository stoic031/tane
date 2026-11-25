import { Plugin, type WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, type TaneSettings, TaneSettingTab } from './settings';
import { TaneView, VIEW_TYPE_TANE } from './ui/view';

// Plugin lifecycle only. Layers: src/ui (Svelte) -> src/data (Obsidian I/O) -> src/core (pure logic).
export default class TanePlugin extends Plugin {
	settings!: TaneSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_TANE, (leaf) => new TaneView(leaf, this));

		this.addRibbonIcon('wallet', 'Open Tane', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open',
			name: 'Open',
			callback: () => {
				void this.activateView();
			},
		});

		this.addSettingTab(new TaneSettingTab(this.app, this));
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
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_TANE)) {
			if (leaf.view instanceof TaneView) leaf.view.refresh();
		}
	}

	async activateView(): Promise<void> {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(VIEW_TYPE_TANE)[0] ?? null;
		if (!leaf) {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: VIEW_TYPE_TANE, active: true });
		}
		await workspace.revealLeaf(leaf);
	}
}
