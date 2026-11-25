---
name: tane-ui
description: Build or change Tane's Svelte 5 interface inside its Obsidian view (screens, draggable sheets, tab bar, entry form, motion, light and dark, three languages) following Obsidian's rules and working well on iPhone.
when_to_use: a new screen or component, layout changes, animation, drag gestures, the entry form, translated strings, display bugs
---

# Tane's interface

Source of truth: `docs/ui.md`. Folder rules: `.claude/rules/ui.md`. Mounting and state: `docs/architecture.md` § Svelte usage.

## Before starting

- Check `docs/decisions.md`: Q-01 (tab bar position) and Q-02 (gestures). If the work depends on an open question, ask first.
- Decide where the state lives: screen-local `$state` in the component, shared data in `UiStore` (`src/ui/store.svelte.ts`), derived numbers with `$derived` calling `src/core/calc`.

## Building

1. One component per file in `src/ui/screens`, `src/ui/sheets` or `src/ui/components`. Props with `$props()`, typed.
2. Writes: call functions from `src/data` (passed down from the view or the store), never `app.vault` or `app.fileManager`.
3. No `{@html}`. Text, including user text, is rendered as text.
4. Fixed styles in the component's `<style>` block using Obsidian CSS variables; globals in `styles.css` under `.tane-`. No fixed `style="..."`. Computed values with `style:transform={…}` or `style:--tane-progress={…}`.
5. Strings from `src/core/i18n` (en, vi, ja), sentence case. Amounts formatted by currency `decimals` and locale, with `tabular-nums`.
6. Motion: only `transform` and `opacity`, values from `docs/ui.md` (`--tane-ease`, 0.42 s open, 0.30 s close…), plus a `prefers-reduced-motion` branch.
7. Drags: pointer events with `setPointerCapture`; handle `pointercancel`; write the moving element's `transform` directly during the drag, update state only on release.
8. Tap targets at least 44 px; icon-only buttons have `aria-label`.
9. Nothing under Obsidian's floating navigation buttons at the bottom of the phone screen.

## After building

1. `npm run check` (includes `svelte-check`).
2. On the Mac, if available: open the test vault, developer tools, `app.emulateMobile(true)` to see the phone layout; `app.emulateMobile(false)` to undo.
3. Write the owner a numbered list of things to try on the iPhone, for example:
   1. Open Tane, drag the "Add transaction" sheet halfway down and let go: it should close.
   2. Swipe sideways on the category chips: Obsidian's sidebar must not open.
   3. Turn on Reduce Motion in iPhone settings: the sheet fades instead of sliding.
