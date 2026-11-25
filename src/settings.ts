import { type App, PluginSettingTab, Setting } from 'obsidian';
import type TanePlugin from './main';

export { DEFAULT_SETTINGS, type TaneSettings } from './core/settings';
import { DEFAULT_SETTINGS } from './core/settings';

export class TaneSettingTab extends PluginSettingTab {
	plugin: TanePlugin;

	constructor(app: App, plugin: TanePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Root folder')
			.setDesc('Folder in this vault that holds wallets, categories and transactions.')
			.addText((text) =>
				text
					.setPlaceholder('Tane')
					.setValue(this.plugin.settings.rootFolder)
					.onChange(async (value) => {
						this.plugin.settings.rootFolder = value.trim() || DEFAULT_SETTINGS.rootFolder;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName('Period starts on day')
			.setDesc('Day 1 to 28. Use your payday to track pay cycles instead of calendar months.')
			.addText((text) =>
				text
					.setPlaceholder('1')
					.setValue(String(this.plugin.settings.periodStartDay))
					.onChange(async (value) => {
						const n = Number(value);
						if (!Number.isInteger(n) || n < 1 || n > 28) return;
						this.plugin.settings.periodStartDay = n;
						await this.plugin.saveSettings();
						this.plugin.refreshViews();
					}),
			);
	}
}
