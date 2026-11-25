import { type ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import { categoryChoices, lastUsed, personChoices, walletChoices, type Choice } from '../core/choices';
import { allowsNegative, type Draft, missingFields, parseAmount } from '../core/draft';
import { t } from './i18n';
import { formatMoney } from '../core/money';
import { currencyOf } from '../core/settings';
import { LOAN_TYPES, TX_TYPES, type TxType } from '../core/types';
import type TanePlugin from '../main';
import { ChoicePicker } from './pickers';

const MAIN_TYPES: TxType[] = ['expense', 'income', 'transfer'];

/**
 * The logging form (docs/ui.md § Add-transaction modal). Obsidian shows it full screen on iPhone.
 * Saves through src/data/writer.ts; a refused write keeps the modal open with the reason.
 */
export class AddTransactionModal extends Modal {
	private texts: Record<'amount' | 'toAmount' | 'fee', string>;
	private saveButton: ButtonComponent | undefined;
	private errorEl: HTMLElement | undefined;
	private saving = false;

	constructor(
		private readonly plugin: TanePlugin,
		private readonly draft: Draft,
		/** Runs after a successful save, e.g. to move a paid reminder to its next date. */
		private readonly onSaved?: () => unknown,
	) {
		super(plugin.app);
		const s = (n: number | undefined) => (n === undefined ? '' : String(n));
		this.texts = { amount: s(draft.amount), toAmount: s(draft.toAmount), fee: s(draft.fee) };
		this.fillDefaults();
	}

	private get snap() {
		return this.plugin.index.snapshot;
	}

	/** Preselect the last wallet and the category last used with it (docs/ui.md). */
	private fillDefaults(): void {
		const d = this.draft;
		if (d.editPath) return;
		const wallets = walletChoices(this.snap, d.type).map((c) => c.name);
		if (!d.wallet || !wallets.includes(d.wallet)) {
			const last = lastUsed(this.snap).wallet;
			const def = this.plugin.settings.defaultWallet;
			d.wallet = [last, def, wallets[0]].find((w) => w !== undefined && wallets.includes(w));
		}
		if ((d.type === 'expense' || d.type === 'income') && !d.category) {
			const allowed = categoryChoices(this.snap, d.wallet, d.type).map((c) => c.name);
			const last = lastUsed(this.snap, d.wallet, d.type).category;
			if (last && allowed.includes(last)) d.category = last;
		}
	}

	onOpen(): void {
		this.setTitle(this.draft.editPath ? t.editTransaction : t.addTransaction);
		this.modalEl.addClass('tane-add');
		this.scope.register([], 'Enter', () => {
			void this.save();
			return false;
		});
		this.render(true);
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private setType(ty: TxType): void {
		this.draft.type = ty;
		this.draft.amount = parseAmount(this.texts.amount, allowsNegative(ty));
		this.fillDefaults();
		this.render();
	}

	private render(focusAmount = false): void {
		const d = this.draft;
		const el = this.contentEl;
		const s = this.snap;
		el.empty();

		const types = new Setting(el).setClass('tane-add-types');
		for (const ty of MAIN_TYPES) {
			types.addButton((b) => {
				b.setButtonText(t.types[ty]).onClick(() => this.setType(ty));
				if (ty === d.type) b.setCta();
			});
		}
		types.addDropdown((dd) => {
			dd.addOption('', t.moreTypes);
			for (const ty of TX_TYPES.filter((x) => !MAIN_TYPES.includes(x))) dd.addOption(ty, t.types[ty]);
			dd.setValue(MAIN_TYPES.includes(d.type) ? '' : d.type).onChange((v) => v && this.setType(v as TxType));
		});

		const wallet = d.wallet ? s.wallets[d.wallet] : undefined;
		let amountInput: HTMLInputElement | undefined;
		new Setting(el)
			.setName(t.amount)
			.setDesc(wallet?.currency ?? '')
			.addText((text) => {
				amountInput = text.inputEl;
				text.inputEl.inputMode = 'decimal';
				text.inputEl.addClass('tane-amount');
				text.setPlaceholder('0')
					.setValue(this.texts.amount)
					.onChange((v) => {
						this.texts.amount = v;
						d.amount = parseAmount(v, allowsNegative(d.type));
						this.update();
					});
			});

		this.picker(el, t.wallet, d.wallet, walletChoices(s, d.type), t.pickWallet, t.noWallets, (v) => {
			d.wallet = v;
			if (d.type === 'expense' || d.type === 'income') {
				const allowed = categoryChoices(s, v, d.type).map((c) => c.name);
				if (d.category && !allowed.includes(d.category)) d.category = undefined;
				d.category ??= lastUsed(s, v, d.type).category;
			}
		});

		if (d.type === 'expense' || d.type === 'income') {
			this.picker(el, t.category, d.category, categoryChoices(s, d.wallet, d.type), t.pickCategory, t.noCategories, (v) => (d.category = v));
		}

		if (d.type === 'transfer') {
			const others = walletChoices(s, 'transfer').filter((c) => c.name !== d.wallet);
			this.picker(el, t.toWallet, d.toWallet, others, t.pickWallet, t.noWallets, (v) => (d.toWallet = v));
			const to = d.toWallet ? s.wallets[d.toWallet] : undefined;
			if (to && wallet && to.currency !== wallet.currency) {
				this.amountField(el, t.toAmount, to.currency, 'toAmount', (n) => (d.toAmount = n));
			}
			this.amountField(el, t.fee, wallet?.currency ?? '', 'fee', (n) => (d.fee = n));
		}

		if (LOAN_TYPES.includes(d.type)) {
			this.picker(el, t.person, d.person, personChoices(s), t.pickPerson, t.noPeople, (v) => (d.person = v));
			if (d.type === 'lend' || d.type === 'borrow') {
				new Setting(el).setName(t.dueDate).addText((text) => {
					text.inputEl.type = 'date';
					text.setValue(d.dueDate ?? '').onChange((v) => (d.dueDate = v || undefined));
				});
			}
		}

		new Setting(el).setName(t.date).addText((text) => {
			text.inputEl.type = 'date';
			text.setValue(d.date).onChange((v) => {
				if (v) d.date = v;
			});
		});
		new Setting(el).setName(t.merchant).addText((text) => text.setValue(d.merchant ?? '').onChange((v) => (d.merchant = v.trim() || undefined)));
		new Setting(el).setName(t.note).addText((text) => text.setValue(d.note ?? '').onChange((v) => (d.note = v.trim() || undefined)));

		this.errorEl = el.createDiv({ cls: 'tane-error' });

		new Setting(el).addButton((b) => {
			this.saveButton = b;
			b.setButtonText(t.save)
				.setCta()
				.onClick(() => void this.save());
		});
		this.update();
		if (focusAmount && amountInput) amountInput.focus();
	}

	private amountField(el: HTMLElement, name: string, currency: string, key: 'toAmount' | 'fee', set: (n: number | undefined) => void): void {
		new Setting(el)
			.setName(name)
			.setDesc(currency)
			.addText((text) => {
				text.inputEl.inputMode = 'decimal';
				text.setPlaceholder('0')
					.setValue(this.texts[key])
					.onChange((v) => {
						this.texts[key] = v;
						set(parseAmount(v));
					});
			});
	}

	private picker(el: HTMLElement, name: string, value: string | undefined, choices: Choice[], placeholder: string, empty: string, set: (v: string) => void): void {
		const shown = choices.find((c) => c.name === value)?.label ?? value;
		new Setting(el).setName(name).addButton((b) =>
			b.setButtonText(shown ?? t.choose).onClick(() => {
				new ChoicePicker(this.app, choices, placeholder, empty, (v) => {
					set(v);
					this.render();
				}).open();
			}),
		);
	}

	private update(): void {
		this.saveButton?.setDisabled(missingFields(this.draft).length > 0);
	}

	private async save(): Promise<void> {
		const d = this.draft;
		if (this.saving || missingFields(d).length > 0 || d.amount === undefined || !d.wallet) return;
		this.saving = true;
		const input = { ...d, amount: d.amount, wallet: d.wallet };
		const w = this.plugin.writer;
		try {
			const result = d.editPath
				? await w.updateTransaction(d.editPath, input)
				: d.type === 'transfer'
					? await w.createTransfer(input, d.fee)
					: await w.createTransaction(input);
			if (!result.ok) {
				this.errorEl?.setText(result.problems.join(' · '));
				return;
			}
			const cur = currencyOf(this.plugin.settings, this.snap.wallets[d.wallet]?.currency ?? '');
			await this.onSaved?.();
			new Notice(t.saved(formatMoney(d.amount, cur), d.category ?? d.toWallet ?? d.person ?? t.types[d.type]));
			this.close();
		} catch (e) {
			await this.plugin.log('save transaction', e);
		} finally {
			this.saving = false;
		}
	}
}
