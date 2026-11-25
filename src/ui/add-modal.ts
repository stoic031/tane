import { type ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import { DRAFT_TYPES, type Draft, missingFields, parseAmount } from '../core/draft';
import { en } from '../core/i18n/en';
import { noteNames } from '../data/names';
import { tanePaths } from '../data/paths';
import type TanePlugin from '../main';
import { NamePicker } from './pickers';

/**
 * The logging form (docs/ui.md § Add-transaction modal). Obsidian shows it full screen on iPhone.
 * M1: Save only shows what would be written; the writer arrives in M2.
 */
export class AddTransactionModal extends Modal {
	private amountText: string;
	private saveButton: ButtonComponent | undefined;

	constructor(
		private readonly plugin: TanePlugin,
		private readonly draft: Draft,
	) {
		super(plugin.app);
		this.amountText = draft.amount === undefined ? '' : String(draft.amount);
	}

	onOpen(): void {
		this.setTitle(en.addTransaction);
		this.modalEl.addClass('tane-add');
		this.scope.register([], 'Enter', () => {
			this.save();
			return false;
		});
		this.render();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private render(): void {
		const d = this.draft;
		const el = this.contentEl;
		el.empty();
		const paths = tanePaths(this.plugin.settings.rootFolder);

		const types = new Setting(el).setClass('tane-add-types');
		for (const t of DRAFT_TYPES) {
			types.addButton((b) => {
				b.setButtonText(en.types[t]).onClick(() => {
					d.type = t;
					this.render();
				});
				if (t === d.type) b.setCta();
			});
		}

		let amountInput: HTMLInputElement | undefined;
		new Setting(el).setName(en.amount).addText((text) => {
			amountInput = text.inputEl;
			text.inputEl.inputMode = 'decimal';
			text.inputEl.addClass('tane-amount');
			text.setPlaceholder('0')
				.setValue(this.amountText)
				.onChange((v) => {
					this.amountText = v;
					d.amount = parseAmount(v);
					this.updateSave();
				});
		});

		const pick = (name: string, value: string | undefined, placeholder: string, folder: string, set: (v: string) => void) =>
			new Setting(el).setName(name).addButton((b) =>
				b.setButtonText(value ?? en.choose).onClick(() => {
					new NamePicker(this.app, noteNames(this.app, folder), placeholder, folder, (v) => {
						set(v);
						this.render();
					}).open();
				}),
			);

		pick(en.wallet, d.wallet, en.pickWallet, paths.wallets, (v) => (d.wallet = v));
		if (d.type === 'transfer') {
			pick(en.toWallet, d.toWallet, en.pickWallet, paths.wallets, (v) => (d.toWallet = v));
		} else {
			pick(en.category, d.category, en.pickCategory, paths.categories, (v) => (d.category = v));
		}

		new Setting(el).setName(en.date).addText((text) => {
			text.inputEl.type = 'date';
			text.setValue(d.date).onChange((v) => {
				if (v) d.date = v;
			});
		});
		new Setting(el).setName(en.merchant).addText((text) =>
			text.setValue(d.merchant ?? '').onChange((v) => (d.merchant = v.trim() || undefined)),
		);
		new Setting(el).setName(en.note).addText((text) =>
			text.setValue(d.note ?? '').onChange((v) => (d.note = v.trim() || undefined)),
		);

		new Setting(el).addButton((b) => {
			this.saveButton = b;
			b.setButtonText(en.save)
				.setCta()
				.onClick(() => this.save());
		});
		this.updateSave();

		// Focus the amount only when it is still empty, so returning from a picker does not pop the keyboard.
		if (amountInput && this.amountText === '') amountInput.focus();
	}

	private updateSave(): void {
		this.saveButton?.setDisabled(missingFields(this.draft).length > 0);
	}

	private save(): void {
		const d = this.draft;
		if (missingFields(d).length > 0 || d.amount === undefined) return;
		this.plugin.lastWallet = d.wallet;
		if (d.category) this.plugin.lastCategory = d.category;
		const summary = [d.amount.toLocaleString(), d.category ?? d.toWallet, d.wallet].filter(Boolean).join(' · ');
		new Notice(en.notSavedYet(summary));
		this.close();
	}
}
