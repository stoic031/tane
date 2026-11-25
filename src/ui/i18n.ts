import { en, type Strings } from '../core/i18n/en';

/** Current UI strings. A live binding: modules always read the language set last. */
export let t: Strings = en;

export function setStrings(strings: Strings): void {
	t = strings;
}
