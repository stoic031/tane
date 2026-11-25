# Tane: personal finance plugin for Obsidian

Tane is the owner's personal finance app, rebuilt from scratch as an Obsidian plugin. Every transaction is one Markdown note whose data lives in properties; wallets, categories, people and recurring items are notes too. The owner is Vietnamese, lives in Japan, uses an iPhone, and holds money in JPY and VND. The plugin must run on iPhone (`isDesktopOnly: false`). UI is Svelte 5.

Version 1 is a complete product the owner uses every day, not an MVP. Scope and milestones: `docs/product.md`.

## Working with the owner

- Talk to the owner in Vietnamese, briefly. Code, identifiers, comments, docs and commit messages are in English.
- When the owner must do something on the Mac or iPhone (enable the plugin, try a gesture, send a screenshot), write numbered steps.
- Before work that touches an open question in `docs/decisions.md`, ask. When the owner decides, record it there.
- Large changes (many files, data format changes): propose a short plan first and wait for approval.
- Never read or copy the owner's real financial data. Tests and `fixtures/` contain fake data only. `TANE_VAULT` must point to a test vault.

## Commands

```bash
npm install          # first time, or after package.json changes
npm run dev          # watch build; copies the plugin into $TANE_VAULT if set
npm run build        # tsc + svelte-check + esbuild production → main.js
npm test             # vitest
npm run lint         # eslint with eslint-plugin-obsidianmd and eslint-plugin-svelte
npm run check        # build + lint + test + scripts/check-forbidden.mjs; must pass before every commit
```

## Layout

```
src/main.ts          plugin lifecycle: settings, view, commands, protocol handler, startup jobs. Keep it thin
src/settings.ts      settings type, defaults, settings tab
src/core/            pure TypeScript: types, parsing, validation, calculations. No obsidian, no svelte, no clock
src/data/            Obsidian I/O: vault index, writer, background jobs, log
src/ui/              Svelte 5 components, the view that mounts them, the UI store
test/                vitest; test/mocks/obsidian.ts stands in for the obsidian package
docs/                the source of truth (table below)
scripts/             check-forbidden.mjs; fake-vault generator (later)
fixtures/            fake data only
.claude/             rules per folder, skills per kind of task, settings and hooks
```

Dependencies flow one way: `ui → data → core`. Details: `docs/architecture.md`.

## Hard rules

1. **Data** follows `docs/data-model.md`. English `snake_case` properties. References are wikilinks only; transactions and recurring items have ids, other notes are identified by name. Read from `app.metadataCache`, never by reading files one by one. Edit frontmatter with `app.fileManager.processFrontMatter`, delete with `app.fileManager.trashFile`.
2. **Nothing is dropped silently**: a note that fails parsing or a rule goes to needs-review and counts in no totals.
3. **Calculations** follow `docs/calculations.md`, as pure functions in `src/core/` that take `today` (`YYYY-MM-DD`) as an argument. Money is added as integers in minor units. Every formula has tests with the worked examples.
4. **UI** follows `docs/ui.md`. Svelte components never write to the vault; they call `src/data`. No `{@html}`, no `innerHTML`, no fixed inline styles. Fixed styles live in the component's `<style>` or in `styles.css` (`.tane-*`), using Obsidian CSS variables. Animate only `transform` and `opacity`.
5. **Obsidian** rules in `docs/obsidian-rules.md`: no Node or Electron modules, no `fetch` (use `requestUrl`), no regex lookbehind, no `console.log`, heavy work after `onLayoutReady`, every listener registered with `register*`.
6. **Never edit by hand**: `main.js` (build output), `package-lock.json`, `flake.lock`, `.envrc.local`.

## How to do a task

1. Read the relevant docs and the matching skill (table below).
2. New logic: write the test first, run it and see it fail, then write the code.
3. `npm run check` passes. Fix lint errors instead of disabling rules.
4. If the change affects the UI or behaviour on the phone, tell the owner exactly what to try on the iPhone.
5. Small commits, one idea each, English messages like `feat: add wallet balance`. No push, tag or release unless asked (releases: `release-brat`).

Done means: tests added and passing, `npm run check` passes, docs updated when behaviour or data changed.

## Environment (Nix + direnv)

- `flake.nix` provides Node 26, git and gh. direnv loads it on `cd` (`.envrc`: `use flake`).
- To add a tool, edit `packages` in `flake.nix`. Never suggest `brew install` or `npm install -g`.
- A flake only sees files tracked by git: `git add` new files that Nix needs.
- Machine-specific values (`TANE_VAULT`) live in `.envrc.local`, which is not committed and not edited by Claude.
- Hooks in `.claude/settings.json` reload the environment for Bash commands when `flake.nix` or `.envrc` changes.

## Trying it on the iPhone

- Mac: the source sits inside the `plugin-test` vault (`.obsidian/plugins/tane`), so each build loads there directly with `hot-reload` (D-011).
- iPhone: the iCloud test vault "Tane Dev"; each build is copied into it via `TANE_VAULT` and iCloud syncs it to the phone.
- Versions: GitHub release, installed on the iPhone with BRAT. Details: `docs/release.md`.
- iOS has no developer tools: use the `iphone-debug` skill.

## Docs and skills

| When working on | Read |
| --- | --- |
| What Tane does, scope, milestones | `docs/product.md` |
| Layers, folders, data flow, jobs | `docs/architecture.md` |
| Notes, properties, links, ids, needs-review | `docs/data-model.md`, skill `tane-data-model` |
| Formulas and numbers | `docs/calculations.md`, skill `tane-calc` |
| Screens, Svelte components, motion | `docs/ui.md`, skill `tane-ui` |
| Review before a large commit or a release | `docs/obsidian-rules.md`, skill `obsidian-review` |
| Bugs that only happen on the iPhone | skill `iphone-debug` |
| Releasing | `docs/release.md`, skill `release-brat` (the owner types `/release-brat`) |
| Decisions made, questions still open | `docs/decisions.md` |
