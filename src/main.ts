import { getLanguage, Notice, Plugin, requestUrl, type WorkspaceLeaf } from 'obsidian';
import { generatedBases } from './core/bases';
import { transactionsCsv } from './core/csv';
import { type Draft, draftFromParams, draftFromTransaction } from './core/draft';
import { en } from './core/i18n/en';
import { ja } from './core/i18n/ja';
import { vi } from './core/i18n/vi';
import { DEFAULT_SETTINGS, type TaneSettings } from './core/settings';
import { VaultIndex } from './data/index';
import { catchUp, fetchRates, type JobDeps, processInbox, staleBaseAmounts } from './data/jobs';
import { logError } from './data/log';
import { Writer } from './data/writer';
import { TaneSettingTab } from './settings';
import { AddTransactionModal } from './ui/add-modal';
import { registerCodeBlocks } from './ui/codeblock';
import { ConfirmModal } from './ui/confirm';
import { setStrings, t } from './ui/i18n';
import { registerLedger } from './ui/ledger-view';
import { OverviewView, VIEW_TYPE_OVERVIEW } from './ui/panel';
import { addStatusBar } from './ui/statusbar';
import { todayLocal } from './ui/time';

// Plugin lifecycle only. Layers: src/ui (Obsidian surfaces) -> src/data (Obsidian I/O) -> src/core (pure logic).
export default class TanePlugin extends Plugin {
	settings!: TaneSettings;
	index!: VaultIndex;
	writer!: Writer;
	private updateStatusBar: (() => void) | undefined;
	private inboxRunning = false;

	async onload(): Promise<void> {
		await this.loadSettings();
		this.applyLanguage();
		this.index = new VaultIndex(this.app, () => this.settings);
		this.writer = new Writer(this.app, () => this.settings, () => this.index.snapshot);

		this.registerView(VIEW_TYPE_OVERVIEW, (leaf) => new OverviewView(leaf, this));
		registerCodeBlocks(this);
		registerLedger(this);

		this.addRibbonIcon('wallet', t.openOverview, () => void this.activateView());
		this.addRibbonIcon('plus-circle', t.addTransaction, () => this.openAddModal({ type: 'expense', date: todayLocal() }));

		this.addCommand({ id: 'add-transaction', name: t.addTransaction, callback: () => this.openAddModal({ type: 'expense', date: todayLocal() }) });
		this.addCommand({ id: 'open', name: t.openOverview, callback: () => void this.activateView() });
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
		this.addCommand({ id: 'export-csv', name: t.exportCsv, callback: () => void this.exportCsv() });
		this.addCommand({ id: 'fetch-rates', name: t.fetchRates, callback: () => void this.runFxJob(true) });
		this.addCommand({ id: 'recompute-base', name: t.recomputeBase, callback: () => this.recomputeBase() });
		this.addCommand({ id: 'create-bases', name: t.createBases, callback: () => void this.createBases(true) });

		// obsidian://tane?amount=1280&merchant=Lawson (iOS Shortcuts, widgets, Back Tap).
		this.registerObsidianProtocolHandler('tane', (params) => this.openAddModal(draftFromParams(params, todayLocal())));

		this.addSettingTab(new TaneSettingTab(this.app, this));

		this.app.workspace.onLayoutReady(() => void this.start());
	}

	/** Heavy work waits for layout ready (docs/obsidian-rules.md). */
	private async start(): Promise<void> {
		try {
			this.index.attach(this);
			this.registerEvent(
				this.index.on('snapshot', () => {
					this.refreshViews();
					if (this.index.snapshot.inbox.length) void this.runInbox();
				}),
			);
			this.updateStatusBar = addStatusBar(this);
			await this.index.rebuild();
			await this.createBases(false);
			await this.runCatchUp();
			await this.runFxJob(false);
			if (this.settings.openOnStartup) await this.activateView();
		} catch (e) {
			await this.log('startup', e);
		}
	}

	private deps(): JobDeps {
		return { writer: this.writer, snapshot: () => this.index.snapshot, settings: () => this.settings, today: todayLocal() };
	}

	private async runInbox(): Promise<void> {
		if (this.inboxRunning) return;
		this.inboxRunning = true;
		try {
			const n = await processInbox(this.deps());
			if (n) new Notice(t.captured(n));
		} catch (e) {
			await this.log('inbox', e);
		} finally {
			this.inboxRunning = false;
		}
	}

	/** Once a day: log due automatic recurring items (D-003). */
	private async runCatchUp(): Promise<void> {
		const today = todayLocal();
		if (this.settings.lastCatchUp === today) return;
		try {
			const r = await catchUp(this.deps());
			if (r.problems.length) new Notice(`Tane: ${r.problems.join('; ')}`);
			this.settings.lastCatchUp = today;
			await this.saveSettings();
		} catch (e) {
			await this.log('recurring catch-up', e);
		}
	}

	/** Once a day (or when asked): fetch rates if online rates are on (D-013). */
	async runFxJob(force: boolean): Promise<void> {
		const today = todayLocal();
		if (this.settings.fxProvider === 'none' || (!force && this.settings.lastFxFetch === today)) return;
		try {
			const n = await fetchRates(this.deps(), async (url) => (await requestUrl({ url })).json as unknown, this.index.paths.fxRates);
			this.settings.lastFxFetch = today;
			await this.saveSettings();
			if (force) new Notice(t.ratesFetched(n));
		} catch (e) {
			await this.log('fetch exchange rates', e);
		}
	}

	/** Create the generated .base files once, only when the root folder exists (docs/ui.md § Generated bases). */
	async createBases(force: boolean): Promise<void> {
		const paths = this.index.paths;
		if (!force && !this.app.vault.getFolderByPath(paths.root)) return;
		let created = 0;
		for (const [name, content] of Object.entries(generatedBases(paths.transactions))) {
			if (await this.writer.createIfMissing(`${paths.root}/${name}`, content)) created++;
		}
		if (force) new Notice(t.basesCreated(created));
	}

	async exportCsv(): Promise<void> {
		try {
			const root = this.index.paths.root;
			const base = `${root}/exports/transactions-${todayLocal()}`;
			let path = `${base}.csv`;
			for (let i = 2; this.app.vault.getAbstractFileByPath(path); i++) path = `${base}-${i}.csv`;
			await this.writer.createIfMissing(path, transactionsCsv(this.index.snapshot.transactions));
			new Notice(t.exported(path));
		} catch (e) {
			await this.log('export CSV', e);
		}
	}

	recomputeBase(): void {
		const stale = staleBaseAmounts(this.index.snapshot, this.settings);
		if (stale.length === 0) {
			new Notice(t.nothingToRecompute);
			return;
		}
		new ConfirmModal(this.app, t.recomputeBase, t.recomputeQuestion(stale.length), t.recompute, async () => {
			try {
				for (const s of stale) await this.writer.setProperties(s.path, { fx_rate: s.fxRate, amount_base: s.amountBase });
				new Notice(t.recomputed(stale.length));
			} catch (e) {
				await this.log('recompute base amounts', e);
			}
		}).open();
	}

	applyLanguage(): void {
		const lang = this.settings.language === 'auto' ? getLanguage() : this.settings.language;
		setStrings(lang.startsWith('vi') ? vi : lang.startsWith('ja') ? ja : en);
	}

	openAddModal(draft: Draft, onSaved?: () => unknown): void {
		new AddTransactionModal(this, draft, onSaved).open();
	}

	log(step: string, err: unknown): Promise<void> {
		return logError(this.app, this.index.paths.log, this.manifest.version, step, err);
	}

	async loadSettings(): Promise<void> {
		const data = ((await this.loadData()) ?? {}) as Partial<TaneSettings>;
		this.settings = { ...DEFAULT_SETTINGS, ...data, currencies: data.currencies ?? DEFAULT_SETTINGS.currencies.map((c) => ({ ...c })) };
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
