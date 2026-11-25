# Decisions and open questions

One line per decision, newest first. Claude Code: before work that touches an open question, ask the owner. When the owner settles one, move it to "Decided" with the date.

## Decided

| Id | Date | Decision | Why |
| --- | --- | --- | --- |
| D-016 | 2026-11-26 | Loans settle in the loan's currency: a `collect` or `repay` in another currency is converted at the rate of its date; with several open loans, the oldest is reduced first | A loan given in JPY and paid back in VND must reach 0 |
| D-015 | 2026-11-26 | "Left to spend today" is fixed at the start of the day and drops only by what is spent today | A number that re-divides after each purchase is confusing |
| D-014 | 2026-11-26 | Transaction file names stay `YYYY-MM-DD TX-….md`, no merchant (closes Q-07) | Editing a merchant never renames a file; fewer iCloud conflict copies |
| D-013 | 2026-11-26 | Exchange rates from fawazahmed0 currency-api via jsDelivr (closes Q-04) | Free, no key, has VND, dated history. Verify VND and the dated URL before M6 |
| D-012 | 2026-11-26 | The real vault syncs with iCloud, and Tane runs on Mac and iPhone at the same time (closes Q-03) | Every job must be safe when two devices run it before sync settles |
| D-011 | 2026-11-26 | The source lives in `plugin-test/.obsidian/plugins/tane`; `plugin-test` is the Mac dev vault (hot-reload). `TANE_VAULT` only copies builds to the iCloud "Tane Dev" vault for the iPhone | Owner's choice: build and try on the Mac in one place |
| D-010 | 2026-11-26 | Version 1 is a complete, usable product (all of `docs/product.md` § Version 1 scope), not an MVP | The owner wants to switch to it for daily use |
| D-009 | 2026-11-26 | UI in Svelte 5 (runes), set up as in Obsidian's guide "Use Svelte in your plugin" | Shorter screens, reactive state; widely used in Obsidian plugins |
| D-008 | 2026-11-26 | A budget is a `budget` property on the category note; the overall budget is a setting | Simple to edit; changing a limit also changes past comparisons, accepted |
| D-007 | 2026-11-26 | One "recurring item" note type with `mode: auto` (logged on the due date) or `remind` (pay or skip) | Rent, salary and bills share one model and one screen |
| D-006 | 2026-11-26 | Loans: each person is a note in `people/`; four transaction types `lend`, `collect`, `borrow`, `repay` with `person` | The person note's backlinks show the whole history; no system categories |
| D-005 | 2026-11-26 | References are wikilinks only. Transactions and recurring items carry ids; wallets, categories and people are identified by note name | Readable notes; Obsidian and the plugin keep links up to date on rename |
| D-004 | 2026-11-25 | Property names, code values and system folders in English ASCII `snake_case` | Stable code, no Unicode-normalisation issues between macOS and iOS, ready for the community |
| D-003 | 2026-11-25 | Recurring occurrences are logged on catch-up when Tane opens, with ids `TX-<RC id>-<YYYYMMDD>` | No background server; two devices catching up never duplicate |
| D-002 | 2026-11-25 | One shared set of categories; each wallet lists the categories it uses (`categories` on the wallet note) | One category set for reports; each wallet's picker stays short |
| D-001 | 2026-11-24 | An Obsidian plugin storing each transaction as a Markdown note with properties | The owner keeps the data as plain files; offline; Shortcuts can create notes directly |

## Open

| Id | Question | Notes |
| --- | --- | --- |
| Q-01 | Where does Tane's tab bar go so it never sits under Obsidian's floating navigation buttons? | Try on an iPhone in M1 |
| Q-02 | Can Tane's sheet drag and horizontal chip rows coexist with Obsidian's swipe gestures? | Try on an iPhone in M1 |
| Q-05 | Public or private repository; which license? | The code holds no financial data. Private needs a BRAT token. License needed before directory submission |
| Q-06 | AI approach (later): user's own API key, on-device models via Shortcuts, or both? | After version 1. Cloud AI off by default |
