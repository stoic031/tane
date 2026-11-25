// Small DOM helpers shared by widgets. Text only, never HTML (docs/ui.md § Rules).
import { TFile } from 'obsidian';
import { formatMoney } from '../../core/money';
import type { Ymd } from '../../core/period';
import { currencyOf } from '../../core/settings';
import type { Snapshot, Transaction } from '../../core/types';
import type TanePlugin from '../../main';
import { t } from '../i18n';

export interface WidgetCtx {
	plugin: TanePlugin;
	snap: Snapshot;
	today: Ymd;
	/** Note the code block is in, for wallet / category / person widgets. */
	sourcePath?: string;
	/** Words after the widget name: ```tane wallet PayPay```. */
	arg?: string;
}

export type Widget = (el: HTMLElement, ctx: WidgetCtx) => void;

export function money(ctx: WidgetCtx, amount: number, code?: string): string {
	const s = ctx.plugin.settings;
	return formatMoney(amount, currencyOf(s, code ?? s.baseCurrency));
}

export function card(el: HTMLElement, title?: string): HTMLElement {
	const c = el.createDiv({ cls: 'tane-card' });
	if (title) c.createDiv({ cls: 'tane-card-title', text: title });
	return c;
}

export function muted(el: HTMLElement, text: string): void {
	el.createDiv({ cls: 'tane-muted', text });
}

/** Label on the left, value on the right. */
export function row(el: HTMLElement, label: string, value: string, cls = ''): HTMLElement {
	const r = el.createDiv({ cls: `tane-row ${cls}`.trim() });
	r.createSpan({ cls: 'tane-row-label', text: label });
	r.createSpan({ cls: 'tane-row-value', text: value });
	return r;
}

/** Stitched progress bar; ratio may exceed 1 (over budget). */
export function bar(el: HTMLElement, ratio: number, state: 'normal' | 'warning' | 'over' = 'normal', marker?: number): void {
	const b = el.createDiv({ cls: `tane-bar is-${state}` });
	b.style.setProperty('--tane-progress', `${Math.min(100, Math.max(0, ratio * 100))}%`);
	b.createDiv({ cls: 'tane-bar-fill' });
	if (marker !== undefined) {
		const m = b.createDiv({ cls: 'tane-bar-marker' });
		m.style.setProperty('--tane-marker', `${Math.min(100, Math.max(0, marker * 100))}%`);
	}
}

export function button(el: HTMLElement, text: string, onClick: () => unknown, cta = false): HTMLButtonElement {
	const b = el.createEl('button', { text, cls: cta ? 'mod-cta' : '' });
	b.addEventListener('click', (e) => {
		e.preventDefault();
		e.stopPropagation();
		void onClick();
	});
	return b;
}

export function openPath(ctx: WidgetCtx, path: string): void {
	const file = ctx.plugin.app.vault.getAbstractFileByPath(path);
	if (file instanceof TFile) void ctx.plugin.app.workspace.getLeaf(false).openFile(file);
}

const OUT = new Set(['expense', 'lend', 'repay', 'transfer']);

/** One transaction line: what, where, amount; tap opens the note. */
export function txRow(el: HTMLElement, ctx: WidgetCtx, tx: Transaction, showDate = true): HTMLElement {
	const r = el.createDiv({ cls: 'tane-tx' });
	r.setAttr('role', 'button');
	r.setAttr('tabindex', '0');
	const main = r.createDiv({ cls: 'tane-tx-main' });
	const what = tx.category ?? (tx.type === 'transfer' ? `${tx.wallet} → ${tx.toWallet ?? ''}` : tx.person ? `${t.types[tx.type]} · ${tx.person}` : t.types[tx.type]);
	main.createDiv({ cls: 'tane-tx-what', text: what });
	const sub = [showDate ? tx.date : undefined, tx.type === 'transfer' ? undefined : tx.wallet, tx.merchant ?? tx.note].filter(Boolean).join(' · ');
	if (sub) main.createDiv({ cls: 'tane-tx-sub', text: sub });
	const signed = (OUT.has(tx.type) ? -1 : 1) * tx.amount;
	r.createDiv({ cls: `tane-tx-amount ${signed < 0 ? 'is-out' : 'is-in'}`, text: money(ctx, signed, tx.currency) });
	r.addEventListener('click', () => openPath(ctx, tx.path));
	r.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') openPath(ctx, tx.path);
	});
	return r;
}
