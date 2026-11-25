import { type App, FuzzySuggestModal } from 'obsidian';
import { en } from '../core/i18n/en';

/** Pick a wallet, category or person by note name, filtered as you type (like the quick switcher). */
export class NamePicker extends FuzzySuggestModal<string> {
	constructor(
		app: App,
		private readonly names: string[],
		placeholder: string,
		folder: string,
		private readonly onPick: (name: string) => void,
	) {
		super(app);
		this.setPlaceholder(placeholder);
		this.emptyStateText = en.noNotes(folder);
	}

	getItems(): string[] {
		return this.names;
	}

	getItemText(name: string): string {
		return name;
	}

	onChooseItem(name: string): void {
		this.onPick(name);
	}
}
