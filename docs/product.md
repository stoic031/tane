# Tane: product

Tane is a personal finance plugin for Obsidian. Every transaction is a Markdown note in the user's own vault, so the data is plain files the user owns, works offline, syncs with the vault, and can be read by any tool.

## Who it is for

The first user is the owner: a Vietnamese person living in Japan, using an iPhone, with money in JPY and VND, paid on a fixed payday. Version 1 must work fully for this person. Later the plugin is released to the Obsidian community, so nothing may be hard-wired to Japan, Vietnam, JPY or VND: those are defaults in settings.

## Principles

1. **Logging comes first.** Every feature must make logging faster or make the picture clearer. Recording a purchase should take seconds, and paying by card should log it with no typing.
2. **iPhone first.** Design for a phone held in one hand. Desktop must work, but it is second.
3. **The files are the database.** Properties are readable and editable by hand. The plugin never hides data in its own store and never silently ignores a bad file.
4. **Private by default.** No telemetry. Network features (exchange rates, later AI) are optional, off until enabled, and listed in the README.
5. **No gamification.**

## Version 1 scope: a complete, usable product

Not an MVP: version 1 replaces the owner's current finance app for daily use.

### Logging
- Record expense, income, transfer between wallets (including between currencies, with a fee), balance adjustment.
- Loans per person: lend, collect, borrow, repay.
- Quick-entry sheet: amount, wallet, category or person, date, merchant, note.
- Refunds (negative expense). Split one receipt across several categories.
- Receipt photos and long notes go in the note body.

### Automatic capture
- iOS Shortcuts drop a file into `inbox/` when a card is tapped in Wallet or a payment notification arrives (PayPay, card apps). Tane turns it into a transaction marked for review.
- "To review" box: confirm or fix captured transactions in one pass.
- `obsidian://tane?...` link opens the entry sheet pre-filled (amount, merchant, wallet).

### Wallets and categories
- Wallet kinds: basic (cash, bank, e-money), credit card (statement day, due day, paying wallet, limit), goal (target amount and date).
- One shared set of categories (expense and income, two levels). Each wallet chooses the categories it uses.
- Archive instead of delete once a wallet or category has history.

### Planning
- Budgets per category and an overall budget, per pay-cycle period, with a warning threshold and a spending pace line.
- "Left to spend today": the headline number.
- Recurring items (rent, salary, subscriptions, bills): either logged automatically or reminded and confirmed by the user. Pay or skip a reminded item.
- Loans by person: who owes whom, how much, due dates.

### Insight
- Home: left to spend today; period income, spending and balance; pace; to-review box; needs-review list; upcoming recurring items; spending by category; 6-month cash flow; net worth in the base and second currency.
- Transactions: list by day, filter by wallet, category, person, type, tag; search; edit; delete to trash.
- Wallets: balances, credit card statement and due amount, goal progress and the monthly amount needed.
- Export to CSV.

### Currencies
- Any number of currencies; JPY base and VND second by default.
- Exchange rates fetched from a public API when online, or entered by hand. Each transaction stores its base-currency value at the time it was recorded.

### Data safety
- "Needs review" list for files that fail to parse or break a rule; such files never count in totals.
- Deletion goes to the Obsidian trash.
- Duplicate files created by sync are detected and counted once.

### Settings
Root folder, period start day (payday), base and second currency, currencies and rates, overall budget, warning threshold, language (Vietnamese, English, Japanese), default wallet, fee category, open Tane on startup.

## Later (not version 1)

- AI: type one sentence to log, read a receipt photo, ask questions about spending, month review. User's own API key, or on-device models through iOS Shortcuts.
- Year in review, including total medical spending for the Japanese tax return (確定申告).
- Budget rollover to the next period, and rebalancing budgets by actual spending.
- Trips and events: group spending across categories.
- Detect recurring charges and price increases from history.
- Community release: English README, license, submission to the Obsidian directory.

## Not planned

Bank connections, reading email, investments, gamification.

## Milestones

| Milestone | Content | Done when |
| --- | --- | --- |
| M0 | Starter: Nix, Svelte build, lint, tests, context files, skills | `npm run check` passes (done) |
| M1 | UI spike on iPhone: tab shell, draggable sheet, + button, inside Obsidian's mobile chrome. Settles Q-01 and Q-02 | Owner tries it on an iPhone and signs off |
| M2 | Data layer: types, parse, validate, vault index from `metadataCache`, writer, needs-review list, logger, fake vault generator | A generated vault loads, edits round-trip, broken files show in needs-review |
| M3 | Core calculations: every formula in `docs/calculations.md` with tests | All formulas implemented and tested |
| M4 | Screens: home, transactions, wallets, plans, settings, entry sheet | Owner can log and review a normal week on the phone |
| M5 | Capture: inbox processing, Shortcuts recipes, `obsidian://tane`, to-review box | Tapping a card in Wallet produces a transaction to review |
| M6 | Recurring catch-up and reminders, exchange-rate fetch, CSV export, i18n, polish | Version 1.0 released through BRAT |
