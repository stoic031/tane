# User interface

Tane is a plugin, not an app inside Obsidian (D-018). It adds a few surfaces built from Obsidian's own components and leaves everything else to Obsidian: notes, the properties editor, Bases, sidebars, the command palette, mobile navigation and gestures. No Svelte, no custom tab bar, no custom sheets or animation.

## Surfaces (D-019)

| Surface | Obsidian API | Content |
| --- | --- | --- |
| Add transaction | `Modal` | One form for logging; see below |
| Pickers | `SuggestModal` / `FuzzySuggestModal` | Wallet, category, person: type to filter, like the quick switcher |
| Overview panel | `ItemView` in the right sidebar | Left to spend today, period income / spending / balance, budgets with pace, to-review box, needs-review list, recurring items due soon |
| Code blocks | `registerMarkdownCodeBlockProcessor('tane')` | The same widgets embedded in any note, e.g. a daily note or a dashboard |
| Ledger | Bases view `tane-ledger` (`registerBasesView`) | Transactions grouped by day, amounts in their currency, day totals |
| Generated bases | `.base` files in the root folder | Ready-made filters the user can edit (§ Generated bases) |
| Status bar (desktop) | `addStatusBarItem` | Left to spend today; click opens the panel |
| Settings | `PluginSettingTab` | All settings, sections with `setHeading()` |

A transaction, wallet, category or person is opened and edited as its note, with Obsidian's properties editor. Tane does not have its own edit screens. Wallet, category and person notes can embed a ` ```tane wallet ` (or `category`, `person`) block to show balance and history.

## Opening the add-transaction modal

- Command "Add transaction" (command palette; the user can pin it to the mobile toolbar).
- Ribbon icon.
- `obsidian://tane?amount=1280&merchant=Lawson&wallet=PayPay` (iOS Shortcuts, widgets, Back Tap). Every parameter is optional and pre-fills the form.
- A button inside the overview panel and the `today` code block.

## Add-transaction modal

```
┌ Add transaction ─────────┐
│ [Expense|Income|Transfer]│  type (more types under "More")
│ Amount  [ 1280      ] ¥  │  focused on open, inputmode="decimal"
│ Wallet  PayPay         › │  default: wallet of the last entry
│ Category Eating out    › │  default: last category used with that wallet
│ Date    2026-11-26     › │  <input type="date">, default today
│ Merchant [Lawson     ]   │
│ Note     [           ]   │
│              [ Save ]    │
└──────────────────────────┘
```

- Enter in the amount field saves when every required field has a value. The modal closes and shows a short `Notice` ("Saved 1,280 JPY · Eating out").
- The fields change with the type: transfer shows "To wallet" and "To amount" (with a fee row); loan types show "Person" instead of "Category".
- Wallet, category and person open a picker; only categories the wallet uses are offered (`docs/data-model.md`).
- Validation is `src/core/validate.ts`; the modal shows the first problem under the field and does not close.
- Amount accepts simple sums (`1280+300`) later (M6), not in version 1.0 if time is short.
- On iPhone Obsidian shows a modal full screen; the focused field must stay visible above the keyboard.

## Code blocks

````
```tane
today
```
````

One widget per block, named on the first line: `today` (left to spend today), `period` (income, spending, balance, saved, savings rate), `budgets` (with pace marker), `review` (to-review with Confirm, needs-review list), `upcoming` (due-soon reminders with Pay / Skip, next 30 days), `spending` (by category), `cashflow` (6 periods), `wallets`, `loans`, `networth`, and on entity notes `wallet`, `category`, `person` (the note the block is in, or a name after the widget: ```` ```tane wallet PayPay ````). Unknown names render a short message, never an error. Blocks re-render when the vault index publishes a new snapshot.

The overview panel shows, top to bottom: today, review, upcoming, period, budgets, spending, wallets, loans, net worth.

## Commands

Add transaction · Open Tane overview · Edit transaction (when a transaction note is open; saving it also clears `review`) · Export transactions to CSV (`<root>/exports/`) · Fetch exchange rates now · Recompute base amounts from the rate table (asks first) · Create missing bases.

Known gap: the settings tab is in English only; everything else follows the language setting.

## Generated bases

On first run Tane creates, only if missing, in the root folder: `This period.base`, `By wallet.base`, `To review.base`. They use the `tane-ledger` view and standard filters on Tane's properties. Tane never overwrites them; the user owns them after creation. Sums use `amount_base` so mixed currencies add up.

## Rules

- Build DOM with Obsidian's helpers (`createEl`, `createDiv`, `setIcon`, `Setting`). No `innerHTML` or HTML strings: merchants, notes and names are user text.
- Surfaces never write to the vault themselves; they call `src/data` (writer).
- Every surface is a `Component` (or owned by one) so listeners are cleaned up; re-render on index snapshots, not on every vault event.
- Colors, fonts, radii and spacing come from Obsidian CSS variables; global classes start with `.tane-`. No fixed inline styles; computed values (a progress width) may set a CSS variable.
- UI text from `src/core/i18n` (English source, Vietnamese, Japanese), in sentence case.
- Amounts use `font-variant-numeric: tabular-nums` and the currency's decimals.
- Icon-only buttons have an `aria-label`. Tap targets at least 44 px on mobile.
- No custom animation. `prefers-contrast: more`: secondary text becomes primary, containers get borders.
- Use `activeDocument` / `activeWindow` instead of `document` / `window`.

## Identity

- "Left to spend today" is the headline number of the panel and the status bar.
- Indigo accent and a stitched progress bar for budgets, via `--tane-accent`; the user's theme drives everything else.

## Debugging on iPhone

See the `iphone-debug` skill. On a Mac: developer tools, `app.emulateMobile(true)` to preview the phone layout.
