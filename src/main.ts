import { Plugin, type WorkspaceLeaf } from 'obsidian';
import { DEFAULT_SETTINGS, type TaneSettings, TaneSettingTab } from './settings';
import { OverviewView, VIEW_TYPE_OVERVIEW } from './ui/panel';

// Plugin lifecycle only. Layers: src/ui (Obsidian surfaces) -> src/data (Obsidian I/O) -> src/core (pure logic).
export default class TanePlugin extends Plugin {
	settings!: TaneSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_OVERVIEW, (leaf) => new OverviewView(leaf, this));

		this.addRibbonIcon('wallet', 'Open Tane overview', () => {
			void this.activateView();
		});

		this.addCommand({
			id: 'open',
			name: 'Open overview',
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
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_OVERVIEW)) {
			if (leaf.view instanceof OverviewView) leaf.view.render();
		}
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
