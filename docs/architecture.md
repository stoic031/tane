# Architecture

Three layers, each allowed to call only the layers below it:

```
src/main.ts      plugin lifecycle: settings, view, commands, obsidian:// handler, startup jobs
   │
src/ui/          Obsidian surfaces: modal, pickers, panel, code blocks, Bases view, status bar
   │             render index snapshots; call src/data for every write
src/data/        Obsidian I/O: vault index, writer, background jobs, logger
   │             uses Obsidian APIs; parses and validates with src/core
src/core/        pure TypeScript: types, parse, validate, calculations, formatting
                 no obsidian, no DOM, no clock, no randomness except ids.ts
```

`src/ui` may also call pure functions from `src/core` (formatting, calculations on data it already holds). `src/core` never imports from the layers above. `scripts/check-forbidden.mjs` enforces the main rules.

## Folder layout

```
src/
├─ main.ts               TanePlugin: onload, settings, registerView, commands, protocol handler
├─ settings.ts           TaneSettings, defaults, PluginSettingTab
├─ core/
│  ├─ types.ts           Transaction, Wallet, Category, Person, Recurring, InboxItem, Settings
│  ├─ ids.ts             newId, recurringOccurrenceId
│  ├─ period.ts          pay-cycle periods, day arithmetic
│  ├─ money.ts           minor-unit arithmetic, rounding, conversion
│  ├─ fx.ts              rate lookup from rate rows
│  ├─ parse.ts           raw frontmatter → typed record or problems
│  ├─ validate.ts        rules checked before writing
│  ├─ recurring.ts       occurrence dates, due-soon, catch-up plan
│  ├─ calc/              balance.ts, flow.ts, budget.ts, goal.ts, loans.ts, credit.ts, networth.ts
│  ├─ guess.ts           wallet from card name, category from merchant history
│  ├─ csv.ts             CSV export rows
│  └─ i18n/              strings: en.ts (source), vi.ts, ja.ts
├─ data/
│  ├─ paths.ts           folder layout, transaction file paths
│  ├─ index.ts           VaultIndex: load from metadataCache, keep in sync with vault events
│  ├─ links.ts           resolve and build wikilinks
│  ├─ writer.ts          create, update (processFrontMatter), move, trash; validates first
│  ├─ jobs/              inbox.ts, catchup.ts, fx.ts, integrity.ts
│  └─ log.ts             append errors to system/log.md
└─ ui/
   ├─ add-modal.ts       AddTransactionModal (Modal): the logging form
   ├─ pickers.ts         WalletPicker, CategoryPicker, PersonPicker (SuggestModal)
   ├─ panel.ts           OverviewView (ItemView, right sidebar)
   ├─ codeblock.ts       `tane` code block processor (MarkdownRenderChild per block)
   ├─ widgets/           today, period, budgets, review, upcoming, cashflow, networth, wallet…: render into an element, shared by panel and code blocks
   ├─ ledger-view.ts     Tane ledger Bases view (registerBasesView)
   ├─ statusbar.ts       left to spend today (desktop)
   └─ time.ts            todayLocal(): the only place the UI reads the clock
test/
├─ core/                 one test file per core module
├─ data/                 data-layer tests against test/mocks/obsidian.ts and a fake vault
└─ mocks/obsidian.ts     minimal runtime stand-in for the obsidian package
```

Files not yet written are planned; create them where this layout says.

## Data flow

Reading:

1. On layout ready, `VaultIndex.load()` walks the Tane folders and reads each note's frontmatter from `metadataCache.getFileCache(file)?.frontmatter`.
2. Each note goes through `core/parse.ts`; failures go to the needs-review list, successes into in-memory maps (transactions by id and by period, wallets, categories, people, recurring items).
3. The index publishes an immutable snapshot and fires an event.
4. Open surfaces (panel, code blocks, status bar) listen through their `Component` and re-render their widgets from the snapshot with `core/calc`.

Keeping in sync:

- `metadataCache.on('changed')`, `vault.on('delete')`, `vault.on('rename')`, `vault.on('create')` (for inbox) update one note at a time, then publish a new snapshot, debounced (about 150 ms) so a sync burst causes one re-render.
- All listeners are registered with `this.registerEvent` so they are removed on unload.

Writing:

1. The modal (or a panel action) calls a function in `data/writer.ts` with plain values.
2. The writer builds the full record, runs `core/validate.ts`, and refuses the change with a message if any rule fails.
3. It writes with `vault.create` (new note) or `fileManager.processFrontMatter` (edit), moves the file if its month changed, or `fileManager.trashFile` (delete).
4. It does not update the index itself: the vault event in step "Keeping in sync" does, so hand edits and plugin edits follow the same path.

## Background jobs (`data/jobs/`)

Run on layout ready, then when relevant events fire. None run while Obsidian is closed.

| Job | When | Does |
| --- | --- | --- |
| `inbox` | load; file created in `inbox/` | Turn inbox notes into `review: true` transactions, trash the inbox note |
| `catchup` | load, once per day (`lastCatchUp`) | Log due `auto` recurring occurrences with deterministic ids; advance `next` |
| `fx` | load, at most once per day, only if a provider is set | Fetch rates with `requestUrl`, append to `system/fx-rates.csv` |
| `integrity` | after every load | Duplicate ids, broken links, rule violations → needs-review |

Jobs must be idempotent: running twice, or on two devices before sync settles, must not create duplicates (deterministic ids, check before create). Tane runs on the Mac and the iPhone at the same time (D-012), so this is the normal case, not an edge case: occurrence ids come from the recurring id and date, inbox ids from the inbox note's content, and an iCloud conflict copy of a recurring note is caught as a duplicate id.

## UI usage

- Obsidian's API only (D-018): `Modal`, `SuggestModal`, `ItemView`, `MarkdownRenderChild`, `BasesView`, `Setting`, `createEl`, `setIcon`. No UI framework.
- Each surface is a `Component`; listeners registered on it are removed when it unloads.
- Widgets are plain functions `(el, snapshot, settings, today) => void` so the panel and code blocks share them.

## Errors and logging

- Catch errors at boundaries: commands, event handlers, jobs, writer entry points.
- Log with `data/log.ts` (timestamp, plugin version, step, message, stack) into `system/log.md`. Never log amounts, merchants or notes.
- Show the user a short `Notice`; never fail silently.

## Testing

- `vitest`. Core: every exported function, with the worked examples from `docs/calculations.md`. Data: index, writer and jobs against the mock and an in-memory fake vault.
- Dates in tests are fixed strings; no test depends on the real clock.
- Before a release, the owner tries the build on an iPhone (`docs/release.md`).

## Performance budget

- Startup work proportional to the number of notes, using only `metadataCache` (no file reads) for transactions.
- Target: index 5,000 transactions in under 300 ms on a recent iPhone; measure with the fake vault generator.
- Render lists virtually or paged; never build thousands of rows at once.
