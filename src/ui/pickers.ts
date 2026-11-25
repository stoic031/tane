import { type App, FuzzySuggestModal } from 'obsidian';
import type { Choice } from '../core/choices';

/** Pick a wallet, category or person, filtered as you type (like the quick switcher). */
export class ChoicePicker extends FuzzySuggestModal<Choice> {
	constructor(
		app: App,
		private readonly choices: Choice[],
		placeholder: string,
		empty: string,
		private readonly onPick: (name: string) => void,
	) {
		super(app);
		this.setPlaceholder(placeholder);
		this.emptyStateText = empty;
	}

	getItems(): Choice[] {
		return this.choices;
	}

	getItemText(c: Choice): string {
		return c.label;
	}

	onChooseItem(c: Choice): void {
		this.onPick(c.name);
	}
}
