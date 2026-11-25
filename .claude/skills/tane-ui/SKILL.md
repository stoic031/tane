---
name: tane-ui
description: Build or change Tane's interface with Obsidian's own components (add-transaction modal, pickers, overview panel, tane code blocks, ledger Bases view, status bar, settings) following Obsidian's rules and working well on iPhone.
when_to_use: a new widget or surface, the add modal, pickers, code block widgets, the Bases view, translated strings, display bugs
---

# Tane's interface

Source of truth: `docs/ui.md`. Folder rules: `.claude/rules/ui.md`. Data flow: `docs/architecture.md` § Data flow and § UI usage.

## Building

1. Pick the surface from `docs/ui.md` § Surfaces. A new figure is a widget in `src/ui/widgets/` so the panel and code blocks both get it.
2. Writes: call functions from `src/data`, never `app.vault` or `app.fileManager`.
3. DOM with `createEl`, `createDiv`, `setIcon`, `Setting`; text with `setText`. Never HTML strings.
4. Styles in `styles.css` under `.tane-`, Obsidian CSS variables only. No custom animation.
5. Strings from `src/core/i18n`, sentence case. Amounts formatted by currency `decimals` and locale, with `tabular-nums`.
6. Register listeners on the surface's `Component`; re-render on index snapshots.
7. Tap targets at least 44 px on mobile; icon-only buttons have `aria-label`.

## After building

1. `npm run check`.
2. On the Mac in `plugin-test`: developer tools, `app.emulateMobile(true)` to see the phone layout; `app.emulateMobile(false)` to undo.
3. Write the owner a numbered list of things to try on the iPhone, for example:
   1. Run "Tane: Add transaction" from the mobile toolbar: the amount field is focused and stays above the keyboard.
   2. Tap Category: the picker filters as you type.
   3. Open the right sidebar: the overview panel shows left to spend today.
