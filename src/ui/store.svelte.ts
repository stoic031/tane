// Reactive UI state shared by all screens (Svelte 5 runes in a .svelte.ts module).
// The data layer pushes new snapshots in; components read fields and re-render on change.
export class UiStore {
	today = $state('');
	periodStartDay = $state(1);
}
