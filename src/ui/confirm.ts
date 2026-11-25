import { type App, Modal, Setting } from 'obsidian';

/** Yes/no question before a change to many notes. */
export class ConfirmModal extends Modal {
	constructor(
		app: App,
		private readonly title: string,
		private readonly message: string,
		private readonly yes: string,
		private readonly onYes: () => unknown,
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.title);
		this.contentEl.createEl('p', { text: this.message });
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((b) =>
				b
					.setButtonText(this.yes)
					.setWarning()
					.onClick(() => {
						this.close();
						void this.onYes();
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
