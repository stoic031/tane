---
name: tane-data-model
description: Read, write and validate Tane's notes (transactions, wallets, categories, people, recurring items, inbox, exchange rates) in src/core and src/data. Use for any code that touches properties, folders, ids, links, rules or the needs-review list.
when_to_use: creating or editing transactions, parsing frontmatter, the vault index, renames, wallet–category links, inbox processing, catch-up of recurring items, fake data for the test vault
---

# Tane's data

Source of truth: `docs/data-model.md`; layers and data flow: `docs/architecture.md`. Read the relevant section before coding. If the code needs a property the docs do not define, stop and ask the owner, then update the docs in the same commit.

## Reading

1. List files under `settings.rootFolder` by folder (`transactions/`, `wallets/`, `categories/`, `people/`, `recurring/`).
2. Read properties with `app.metadataCache.getFileCache(file)?.frontmatter`. Never `vault.read` a file to get numbers.
3. Convert raw properties with **one** parser per note type in `src/core/parse.ts`. It takes a plain object plus the file's basename and path, and returns `{ ok: true, value }` or `{ ok: false, problems }`.
4. Resolve every link with `metadataCache.getFirstLinkpathDest(linktext, sourcePath)`; the target must be in the expected folder (a `wallet` link must land in `wallets/`). Otherwise: needs-review.
5. Records with problems go to needs-review and into no totals.
6. Duplicate `id` (usually an iCloud conflict copy `... 2.md`): count the one with the newer `updated`, list the other in needs-review.

## Writing (always through `src/data/writer.ts`)

1. Build the full record and check every rule in `docs/data-model.md` § Rules checked before writing. If one fails, return a clear error and write nothing.
2. New transaction: `id = newId('TX')`; compute and freeze `amount_base` and `fx_rate`; `created` = `updated` = now (the data layer reads the clock and passes it in).
3. Create: `vault.create(path, text)` with `path = transactionPath(paths, date, id)` (`transactions/YYYY/MM/<date> <id>.md`); create missing folders first.
4. Edit: `app.fileManager.processFrontMatter(file, (fm) => { … })`, set `updated`. If `date` moves to another month, move the file with `app.fileManager.renameFile`.
5. Delete: `app.fileManager.trashFile(file)`. Wallets, categories and people that have transactions are archived (`archived: true`), never deleted.
6. Links: `"[[" + metadataCache.fileToLinktext(target, sourcePath, true) + "]]"`.

## Wallets and categories (D-002)

- One shared category set. A wallet lists the categories it uses in `categories` (links).
- The category picker for a new entry shows the wallet's categories whose `kind` matches the type.
- Wallet kinds limit transaction types: see the wallet-kind × type table in `docs/data-model.md`. Loan types only on basic wallets.
- Removing a category from a wallet never changes existing transactions.

## People and loans (D-006)

`lend`, `collect`, `borrow`, `repay` need `person` (a link to `people/`); other types must not have it. Balances per person: `docs/calculations.md` § Loans by person.

## Recurring items (D-003, D-007)

- `mode: auto`: on catch-up, log every occurrence from `next` up to today with id `recurringOccurrenceId(rc.id, date)`; skip any id that already exists; then advance `next`.
- `mode: remind`: show in "due soon" `remind_days` before `next`; "pay" logs the occurrence with the same deterministic id, "skip" only advances `next`.

## Renames

Listen to `vault.on('rename')` for files in Tane folders. Obsidian usually updates links; afterwards, re-resolve and fix any Tane note whose link still points to the old name with `processFrontMatter`, and log one line.

## Inbox

iOS Shortcuts write `inbox/*.md` with `amount`, `currency?`, `merchant`, `card`, `captured_at`, `source`. Match the wallet from `card` against wallet names and `aliases`; guess the category from the latest transaction with the same `merchant`; create an `expense` with `review: true`; trash the inbox note. If it cannot be processed, leave it and list it in needs-review.

## Fake data

A generator in `scripts/` builds a fake vault (for "Tane Dev" and for measuring startup), taking a transaction count (default about 4,000, roughly one year) and a fixed seed.
