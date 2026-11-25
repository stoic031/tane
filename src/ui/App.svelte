<script lang="ts">
	// Placeholder home screen. Milestone M1 replaces it with the real tab shell
	// (docs/ui.md). Rules: no {@html}, no static inline styles, Obsidian CSS variables only.
	import { daysLeftIncludingToday, periodOf } from '../core/period';
	import type { UiStore } from './store.svelte';

	interface Props {
		store: UiStore;
	}

	let { store }: Props = $props();

	const period = $derived(periodOf(store.today, store.periodStartDay));
	const daysLeft = $derived(daysLeftIncludingToday(period, store.today));
</script>

<div class="tane-card">
	<div class="label">Period {period.key}</div>
	<div class="value">{period.start} → {period.end}</div>
	<div class="note">{daysLeft} of {period.days} days left</div>
</div>

<style>
	.tane-card {
		background: var(--background-secondary);
		border-radius: var(--radius-l);
		padding: var(--size-4-4);
		margin: var(--size-4-4);
	}

	.label {
		color: var(--text-muted);
		font-size: var(--font-ui-small);
	}

	.value {
		color: var(--text-normal);
		font-size: var(--font-ui-large);
		font-weight: var(--font-semibold);
		font-variant-numeric: tabular-nums;
	}

	.note {
		color: var(--text-faint);
		font-size: var(--font-ui-smaller);
	}
</style>
