---
paths:
  - "src/ui/**"
  - "styles.css"
---

# Rules for src/ui/ and styles.css

- Svelte 5 with runes (`$props`, `$state`, `$derived`, `$effect`). Shared state lives in `.svelte.ts` classes (`store.svelte.ts`); components get the store as a prop.
- Components never call `app.vault` or `app.fileManager`; they call functions in `src/data`. They may call pure helpers from `src/core`.
- The UI reads the clock only through `src/ui/time.ts`.
- No `{@html}`, `innerHTML` or HTML strings: merchants, notes and names are user text.
- No fixed `style="..."`. Fixed styles go in the component's `<style>` block (scoped) or `styles.css` (global, selectors start with `.tane-`). Computed values may use `style:transform={...}`, `style:--tane-progress={...}` or `el.style.transform = ...`.
- Use Obsidian CSS variables for colors, fonts, radii and spacing so themes and dark mode work.
- Animate only `transform` and `opacity`, with the values in `docs/ui.md`; provide a `prefers-reduced-motion` branch.
- All user-facing text comes from `src/core/i18n` (en, vi, ja), in sentence case.
- Tap targets at least 44 px; icon-only buttons have `aria-label`.
- Keep Tane's tab bar and buttons clear of Obsidian's floating navigation on mobile (Q-01).
- Use `activeDocument` / `activeWindow` instead of `document` / `window`.
