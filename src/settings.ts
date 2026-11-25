import { type App, normalizePath, Notice, PluginSettingTab, Setting } from 'obsidian';
import { FX_HEADER, fxCsvLine } from './core/fx';
import { parseAmount } from './core/draft';
import { DEFAULT_SETTINGS, type Language, type TaneSettings } from './core/settings';
import type TanePlugin from './main';
import { todayLocal } from './ui/time';

export { DEFAULT_SETTINGS, type TaneSettings };

/** All settings (docs/data-model.md § Settings), in sections. */
export class TaneSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private readonly plugin: TanePlugin,
	) {
		super(app, plugin);
	}

	private async save(refresh = true): Promise<void> {
		await this.plugin.saveSettings();
		if (refresh) await this.plugin.index.rebuild();
	}

	display(): void {
		const { containerEl } = this;
		const s = this.plugin.settings;
		const snap = this.plugin.index.snapshot;
		containerEl.empty();

		new Setting(containerEl)
			.setName('Root folder')
			.setDesc('Folder in this vault that holds wallets, categories, people, recurring items and transactions.')
			.addText((text) =>
				text
					.setPlaceholder('Tane')
					.setValue(s.rootFolder)
					.onChange(async (value) => {
						s.rootFolder = normalizePath(value.trim() || DEFAULT_SETTINGS.rootFolder);
						await this.save();
					}),
			);

		new Setting(containerEl)
			.setName('Period starts on day')
			.setDesc('Day 1 to 28. Use your payday to track pay cycles instead of calendar months.')
			.addText((text) =>
				text
					.setPlaceholder('1')
					.setValue(String(s.periodStartDay))
					.onChange(async (value) => {
						const n = Number(value);
						if (!Number.isInteger(n) || n < 1 || n > 28) return;
						s.periodStartDay = n;
						await this.save(false);
						this.plugin.refreshViews();
					}),
			);

		new Setting(containerEl)
			.setName('Language')
			.setDesc('Auto follows Obsidian’s language.')
			.addDropdown((dd) =>
				dd
					.addOptions({ auto: 'Auto', en: 'English', vi: 'Tiếng Việt', ja: '日本語' })
					.setValue(s.language)
					.onChange(async (v) => {
						s.language = v as Language;
						await this.save(false);
						this.plugin.applyLanguage();
						this.plugin.refreshViews();
						this.display();
					}),
			);

		new Setting(containerEl)
			.setName('Open Tane on startup')
			.setDesc('Show the overview panel when Obsidian starts.')
			.addToggle((tg) =>
				tg.setValue(s.openOnStartup).onChange(async (v) => {
					s.openOnStartup = v;
					await this.save(false);
				}),
			);

		new Setting(containerEl).setName('Logging').setHeading();

		new Setting(containerEl)
			.setName('Default wallet')
			.setDesc('Preselected when you have no transactions yet.')
			.addDropdown((dd) => {
				dd.addOption('', '—');
				for (const name of Object.keys(snap.wallets).sort()) dd.addOption(name, name);
				dd.setValue(s.defaultWallet ?? '').onChange(async (v) => {
					s.defaultWallet = v || undefined;
					await this.save(false);
				});
			});

		new Setting(containerEl)
			.setName('Fee category')
			.setDesc('Expense category used for transfer fees.')
			.addDropdown((dd) => {
				dd.addOption('', '—');
				for (const c of Object.values(snap.categories).filter((c) => c.kind === 'expense')) dd.addOption(c.name, c.name);
				dd.setValue(s.feeCategory ?? '').onChange(async (v) => {
					s.feeCategory = v || undefined;
					await this.save(false);
				});
			});

		new Setting(containerEl)
			.setName('Remind days')
			.setDesc('Days before a reminder is due to show it, for recurring items without remind_days.')
			.addText((text) =>
				text.setValue(String(s.defaultRemindDays)).onChange(async (v) => {
					const n = Number(v);
					if (!Number.isInteger(n) || n < 0) return;
					s.defaultRemindDays = n;
					await this.save(false);
				}),
			);

		new Setting(containerEl).setName('Budgets').setHeading();

		new Setting(containerEl)
			.setName('Overall budget per period')
			.setDesc(`In ${s.baseCurrency}. Empty: the sum of your category budgets.`)
			.addText((text) =>
				text.setValue(s.totalBudget === undefined ? '' : String(s.totalBudget)).onChange(async (v) => {
					s.totalBudget = v.trim() === '' ? undefined : parseAmount(v);
					await this.save(false);
					this.plugin.refreshViews();
				}),
			);

		new Setting(containerEl)
			.setName('Warning threshold')
			.setDesc('Percent of a budget at which it turns to a warning.')
			.addSlider((sl) =>
				sl
					.setLimits(50, 100, 5)
					.setValue(s.budgetWarnPct)
					.onChange(async (v) => {
						s.budgetWarnPct = v;
						await this.save(false);
						this.plugin.refreshViews();
					}),
			);

		new Setting(containerEl).setName('Currencies and rates').setHeading();

		const codes = s.currencies.map((c) => c.code);
		const pick = (label: string, desc: string, key: 'baseCurrency' | 'secondCurrency') =>
			new Setting(containerEl)
				.setName(label)
				.setDesc(desc)
				.addDropdown((dd) => {
					for (const c of codes) dd.addOption(c, c);
					dd.setValue(s[key]).onChange(async (v) => {
						s[key] = v;
						await this.save(false);
						this.plugin.refreshViews();
					});
				});
		pick('Base currency', 'Budgets and reports use it. Changing it does not recompute stored amounts.', 'baseCurrency');
		pick('Second currency', 'Shown next to net worth.', 'secondCurrency');

		for (const cur of s.currencies) {
			new Setting(containerEl)
				.setName(cur.code)
				.setDesc('Symbol and decimals')
				.addText((text) =>
					text.setValue(cur.symbol).onChange(async (v) => {
						cur.symbol = v.trim() || cur.code;
						await this.save(false);
					}),
				)
				.addDropdown((dd) =>
					dd
						.addOptions({ '0': '0', '1': '1', '2': '2', '3': '3' })
						.setValue(String(cur.decimals))
						.onChange(async (v) => {
							cur.decimals = Number(v);
							await this.save(false);
						}),
				)
				.addExtraButton((b) =>
					b
						.setIcon('trash')
						.setTooltip('Remove')
						.setDisabled(cur.code === s.baseCurrency)
						.onClick(async () => {
							s.currencies = s.currencies.filter((c) => c !== cur);
							await this.save(false);
							this.display();
						}),
				);
		}

		let newCode = '';
		new Setting(containerEl)
			.setName('Add currency')
			.setDesc('Three-letter code, for example USD.')
			.addText((text) => text.setPlaceholder('USD').onChange((v) => (newCode = v.trim().toUpperCase())))
			.addButton((b) =>
				b.setButtonText('Add').onClick(async () => {
					if (!/^[A-Z]{3}$/.test(newCode) || codes.includes(newCode)) return;
					s.currencies.push({ code: newCode, symbol: newCode, decimals: 2 });
					await this.save(false);
					this.display();
				}),
			);

		new Setting(containerEl)
			.setName('Exchange rates online')
			.setDesc('Fetch daily rates from the free currency-api (jsDelivr). Off: enter rates by hand below. Listed in the README.')
			.addDropdown((dd) =>
				dd
					.addOptions({ none: 'Off (manual only)', 'currency-api': 'currency-api' })
					.setValue(s.fxProvider)
					.onChange(async (v) => {
						s.fxProvider = v as TaneSettings['fxProvider'];
						await this.save(false);
						if (s.fxProvider !== 'none') await this.plugin.runFxJob(true);
					}),
			);

		let rateFrom = s.baseCurrency;
		let rateTo = codes.find((c) => c !== s.baseCurrency) ?? s.baseCurrency;
		let rate = '';
		let rateDate = todayLocal();
		new Setting(containerEl)
			.setName('Add a rate by hand')
			.setDesc('Units of the second currency per 1 of the first, from that date. Manual rates win over fetched ones.')
			.addDropdown((dd) => {
				for (const c of codes) dd.addOption(c, c);
				dd.setValue(rateFrom).onChange((v) => (rateFrom = v));
			})
			.addDropdown((dd) => {
				for (const c of codes) dd.addOption(c, c);
				dd.setValue(rateTo).onChange((v) => (rateTo = v));
			})
			.addText((text) => text.setPlaceholder('175').onChange((v) => (rate = v)))
			.addText((text) => {
				text.inputEl.type = 'date';
				text.setValue(rateDate).onChange((v) => (rateDate = v));
			})
			.addButton((b) =>
				b.setButtonText('Add').onClick(async () => {
					const r = parseAmount(rate);
					if (r === undefined || rateFrom === rateTo || !rateDate) return;
					await this.plugin.writer.appendFile(this.plugin.index.paths.fxRates, FX_HEADER, fxCsvLine({ date: rateDate, pair: rateFrom + rateTo, rate: r, source: 'manual' }));
					new Notice(`${rateFrom}→${rateTo} ${r} (${rateDate})`);
				}),
			);

		new Setting(containerEl).setName('Tools').setHeading();

		new Setting(containerEl)
			.setName('Recreate missing bases')
			.setDesc('Create This period, By wallet and To review in the root folder if they are missing. Existing ones are never overwritten.')
			.addButton((b) => b.setButtonText('Create').onClick(() => void this.plugin.createBases(true)));

		new Setting(containerEl)
			.setName('Export to CSV')
			.setDesc('Write every valid transaction to a CSV file in the exports folder.')
			.addButton((b) => b.setButtonText('Export').onClick(() => void this.plugin.exportCsv()));

	}
}
