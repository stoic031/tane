# User interface

Tane runs as one Obsidian tab (`ItemView`) that hosts a Svelte app. Inside the tab the design is Tane's own. Around it is Obsidian's chrome (header, floating navigation buttons, sidebars, gestures), which Tane must live with and never hide or restyle.

## Screens

Five tabs plus the entry sheet. The tab bar's position is open question Q-01.

| Screen | Content |
| --- | --- |
| Home | Left to spend today (headline); period income, spending, balance; spending pace; to-review box; needs-review list; recurring items due soon; spending by category; 6-month cash flow; net worth in base and second currency |
| Transactions | List grouped by day; filters (wallet, category, person, type, tag, period); search; open a transaction to edit, split or delete; CSV export |
| Wallets | Balance per wallet; credit card: current cycle, statement amount, due date, "pay card" action; goal: progress, monthly amount needed; wallet editor (categories, aliases); adjust balance |
| Plans | Budgets per category and overall, with status and pace; recurring items (pay, skip, edit); loans by person (owed, due, history) |
| Settings | In-app settings for daily use (period start, currencies and rates, budgets overall, language, default wallet); advanced items stay in Obsidian's plugin settings tab |
| Entry sheet | Amount (with calculator), type, wallet, category or person, date, merchant, note; opened by the + button, the "Tane: Add transaction" command, or `obsidian://tane` |

## Identity

- The headline number "left to spend today" anchors the home screen.
- Indigo accent and a stitched progress bar are Tane's signature; keep them to accents via `--tane-accent` and let the user's Obsidian theme drive everything else.
- Three languages: Vietnamese, English, Japanese. All UI strings come from `src/core/i18n`; English is the source language.

## Svelte UI rules

- No `{@html}`. All text is rendered as text (merchants, notes and names come from user-editable files).
- No fixed `style="..."` attributes. Fixed styles go in the component's `<style>` block (scoped) or in `styles.css` for globals. Computed values may use `style:transform={...}` or `el.style.transform = ...` (a drag offset, a progress width).
- Colors, fonts, radii and spacing come from Obsidian CSS variables (`--background-primary`, `--background-secondary`, `--text-normal`, `--text-muted`, `--text-faint`, `--interactive-accent`, `--radius-m`, `--size-4-4`, `--font-ui-small`…) so light and dark modes and user themes work.
- Global selectors in `styles.css` start with `.tane-`.
- UI text in sentence case ("Add transaction").
- Icon-only buttons have an `aria-label`. Tap targets are at least 44 px.
- Amounts use `font-variant-numeric: tabular-nums` and the currency's decimals.
- Long lists render in pages or virtually.

## Living inside Obsidian on iPhone

- **Floating navigation**: since Obsidian 1.11, mobile shows floating navigation buttons over the content and hides navigation while scrolling. Tane's tab bar and + button must not sit under them. Decide the layout in M1 (Q-01).
- **Gestures**: horizontal swipes open Obsidian's sidebars and pulling down opens the command palette. Tane's sheet drag and horizontal chip rows may trigger them. Test on a real iPhone in M1 (Q-02).
- **Keyboard**: the focused field in a sheet must stay visible when the keyboard opens.
- **Startup**: build UI only after `workspace.onLayoutReady()`; optionally open the Tane tab on startup (setting).
- **No haptics**: WebKit on iPhone has no Vibration API.

## Motion

Hard rules:

1. Animate only `transform` and `opacity`. No `transition: all`. No `will-change` unless a measured problem needs it.
2. Do not animate inherited CSS variables (changing one on a parent restyles every child). Write the moving element's own `transform`.
3. No state changes or re-renders during a drag or a slide.
4. Opening and closing are symmetric: sheets rise from the bottom and leave through it; pushed pages enter from the right and leave to the right; switching tabs is instant.

Values:

- Shared curve `--tane-ease: cubic-bezier(.32,.72,0,1)`. Sheet open 0.42 s, close 0.30 s, page push 0.34 s.
- Press: scale .96 over 80 ms, release over 0.32 s on the soft curve. The central + button: .92.
- Sheet drag follows the finger 1:1; dragging up past the top resists (rubber band, factor .55, dimension 160); the backdrop fades with position.
- Release: target = nearest rest point to the projected position `y + (v/1000)·0.998/(1−0.998)`; close if the projection passes half the height. Velocity from the last 100 ms; a finger still for over 80 ms means velocity 0. The finger's speed carries into the start of the settle animation.
- Grabbing mid-animation stops it, reads the on-screen position, and follows the finger from there.
- Stacked sheets: the lower one stays visible behind; the upper one's backdrop is lighter (.28).

Accessibility:

- `prefers-reduced-motion`: slides and scales become 0.18 s fades; no press shrink; spinners still turn, slowly (1.8 s).
- `prefers-contrast: more`: secondary text becomes primary, containers get borders.

Typography: letter spacing by size (small +0.01em, body −0.011em, amounts −0.016em, large titles −0.022em to −0.03em; Japanese always 0). Users can change Obsidian's font and size, so use CSS variables, not fixed pixel sizes.

## Debugging the UI on iPhone

See the `iphone-debug` skill. In short: errors go to `system/log.md`; on a Mac, open Obsidian's developer tools and run `app.emulateMobile(true)` to preview the phone layout before testing on a device.
