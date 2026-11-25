# Data model

Every record is a Markdown note; its data lives in properties (YAML frontmatter). Each transaction is its own note. The plugin reads properties through Obsidian's `metadataCache` and writes them with `app.fileManager.processFrontMatter`.

## Conventions

- **Names**: property names are English `snake_case`; code values are lowercase English (`expense`, `basic`). System folder names are English ASCII. Note names the user chooses (wallets, categories, people) can be in any language.
- **Identity**: wallets, categories, people and recurring items are identified by their note name (file basename). Transactions carry an `id` because they need one for de-duplication and for recurring occurrences. Recurring items carry an `id` only to build occurrence ids.
- **Ids**: `PREFIX-xxxxxxxxxx`, 10 characters a–z 0–9, never changed or reused. `TX` transaction, `RC` recurring item, `G` group. See `src/core/ids.ts`.
- **References are links only**: `wallet: "[[PayPay]]"`. No parallel id fields.
  - Reading: resolve with `metadataCache.getFirstLinkpathDest(linktext, sourcePath)`, trying the field's own folder first so a bare `[[Salary]]` in `category` finds `categories/Salary` even when a recurring item has the same name. The target must sit in the expected Tane folder (a wallet link must land in `wallets/`); otherwise the note goes to needs-review.
  - Writing: build the link text with `metadataCache.fileToLinktext(file, sourcePath, true)` so it is the shortest unambiguous path, and always write wikilink form `"[[...]]"` (properties only recognise wikilinks).
  - Renames: Obsidian updates links when "Automatically update internal links" is on; the plugin also listens to `vault.on('rename')` for files in its folders and fixes links in Tane notes itself.
- **Dates** `YYYY-MM-DD` (property type Date). **Date-times** `YYYY-MM-DDTHH:mm:ss` (Date & time), local time.
- **Amounts** are plain numbers (property type Number), in the wallet's currency, no symbols or separators. Positive unless a field says otherwise; the transaction type decides the direction.
- **Derived values are never stored** (balances, totals, progress). The deliberate exceptions are `amount_base` and `fx_rate`, frozen when a transaction is recorded.
- **Archive, don't delete**: a wallet, category or person that has transactions gets `archived: true`.
- **Nothing is ignored silently**: a note that fails to parse or breaks a rule goes to the needs-review list and is left out of all numbers until fixed.

## Folders

```
<rootFolder>/                     default "Tane", set in plugin settings
├─ transactions/YYYY/MM/          2026-11-24 TX-k7x2m9p4qa.md   one note per transaction
├─ wallets/                       PayPay.md
├─ categories/                    Eating out.md
├─ people/                        Minh.md
├─ recurring/                     Rent.md
├─ inbox/                         notes written by iOS Shortcuts, consumed by the plugin
├─ This period.base               generated once, then owned by the user (docs/ui.md § Generated bases)
├─ By wallet.base
├─ To review.base
└─ system/
   ├─ fx-rates.csv                exchange-rate history
   └─ log.md                      plugin error log (for debugging on iPhone)
```

The year and month folders follow the transaction `date`; changing the date to another month moves the file.

## Relationships

- A transaction belongs to exactly one `wallet`, and optionally has a `category` (expense, income), a `to_wallet` (transfer), a `person` (loan types) and a `recurring` origin.
- Wallets and categories are many-to-many: each wallet lists the categories it uses in `categories`; an empty or missing list means the wallet uses every category. The list only filters the category picker and the check on new entries; removing a category from a wallet never touches existing transactions.
- A category may have a `parent` (two levels at most, same `kind`).
- A credit wallet names the wallet that pays it (`pay_from`).
- A recurring item references a wallet and optionally a category, `to_wallet` or `person`.

## Transaction (`transactions/YYYY/MM/<date> <id>.md`)

| Property | Type | Required | Meaning | Example |
| --- | --- | --- | --- | --- |
| `id` | text | yes | `TX-…`. Recurring occurrences use `TX-<RC id>-<YYYYMMDD>` | `TX-k7x2m9p4qa` |
| `date` | date | yes | Day it happened | `2026-11-24` |
| `type` | text | yes | See the type table | `expense` |
| `wallet` | link | yes | Wallet that pays, receives, or sends | `"[[PayPay]]"` |
| `amount` | number | yes | In the wallet's currency. Negative only for refunds and adjustments | `1280` |
| `currency` | text | yes | Copied from the wallet, never edited by hand | `JPY` |
| `category` | link | expense, income | A category of the same kind that the wallet uses | `"[[Eating out]]"` |
| `to_wallet` | link | transfer | Receiving wallet | `"[[VN Bank]]"` |
| `to_amount` | number | transfer | Amount received, in the receiving wallet's currency | `17500000` |
| `person` | link | loan types | Who the loan is with | `"[[Minh]]"` |
| `due_date` | date | | Repayment due date for `lend` and `borrow` | `2027-03-31` |
| `merchant` | text | | Where the money went; filled by Shortcuts and used to guess categories | `Lawson` |
| `note` | text | | Short note. Long notes and receipt images go in the note body | `Lunch` |
| `tags` | list | | Obsidian tags, e.g. a trip | `[okinawa-2027]` |
| `fx_rate` | number | yes | Rate used to convert to the base currency; 1 for base-currency wallets | `1` |
| `amount_base` | number | yes | `amount` in the base currency at `date`, rounded to its decimals. Frozen at write time | `1280` |
| `group` | text | | Links rows of one event: a transfer and its fee, a split receipt | `G-…` |
| `recurring` | link | | Recurring item that produced this transaction | `"[[Rent]]"` |
| `review` | checkbox | | `true` while a captured transaction waits in the to-review box | `true` |
| `created`, `updated` | date-time | yes | Written by the plugin | |

| `type` | Use | Wallet balance | Counts as income/spending | Loan effect |
| --- | --- | --- | --- | --- |
| `expense` | Spending; negative amount = refund | − `amount` | spending | |
| `income` | Earnings, interest, cashback | + `amount` | income | |
| `transfer` | Between own wallets: top-up, saving, card payment | `wallet` − `amount`, `to_wallet` + `to_amount` | no | |
| `adjust` | Correct a balance to match reality (signed) | + `amount` | no | |
| `lend` | I give money to a person | − `amount` | no | they owe me + |
| `collect` | A person pays me back | + `amount` | no | they owe me − |
| `borrow` | I receive money from a person | + `amount` | no | I owe + |
| `repay` | I pay a person back | − `amount` | no | I owe − |

- Same-currency transfer: `to_amount` = `amount`. Cross-currency: the amounts actually sent and received; the real rate is implied.
- `amount_base` of a transfer is the value of the sent side.
- Transfer fee: a separate `expense` in the fee category (setting), same `group` as the transfer.
- Split receipt: several `expense` notes sharing one `group`.
- Interest on a loan: a separate `expense` or `income`.

Example:

```yaml
---
id: TX-k7x2m9p4qa
date: 2026-11-24
type: expense
wallet: "[[PayPay]]"
amount: 1280
currency: JPY
category: "[[Eating out]]"
merchant: Lawson
note: Lunch
fx_rate: 1
amount_base: 1280
created: 2026-11-24T12:32:05
updated: 2026-11-24T12:32:05
---
```

## Wallet (`wallets/<name>.md`)

| Property | Type | Required | Meaning | Example |
| --- | --- | --- | --- | --- |
| `kind` | text | yes | `basic`, `credit`, `goal`. Fixed once the wallet has transactions | `basic` |
| `currency` | text | yes | A currency from settings. Fixed once the wallet has transactions | `JPY` |
| `opening_balance` | number | yes | Balance at the start of `opening_date`. A credit card with a balance owed is negative. Goal: amount already saved | `152000` |
| `opening_date` | date | yes | First day tracked; no transaction may be earlier | `2026-11-01` |
| `categories` | list of links | | Categories this wallet uses | `["[[Eating out]]", "[[Salary]]"]` |
| `aliases` | list | | Obsidian aliases; also the names iOS Shortcuts report for this card or app | `[Rakuten Card, 楽天カード]` |
| `icon` | text | | Emoji | `💳` |
| `order` | number | | Display order | `10` |
| `archived` | checkbox | | Hidden from pickers, history kept | `false` |
| `statement_day` | number | credit | Statement closing day 1–31; 31 means month end | `31` |
| `payment_day` | number | credit | Payment day 1–31 | `27` |
| `payment_month_offset` | number | credit | 1 = paid the month after closing, 0 = same month | `1` |
| `pay_from` | link | credit | Basic wallet the card is paid from | `"[[Yucho]]"` |
| `credit_limit` | number | | Card limit | `300000` |
| `goal_amount` | number | goal | Target, in the wallet's currency | `600000` |
| `goal_date` | date | goal | Target date | `2027-12-31` |
| `interest_rate` | number | | Percent per year, informational | `0.2` |

Which transaction types each wallet kind accepts:

| Type | basic | credit | goal |
| --- | --- | --- | --- |
| expense | yes | yes | no |
| income | yes | yes (cashback, refund credit) | yes (interest) |
| transfer out / in | yes / yes | yes / yes (payment) | yes / yes |
| adjust | yes | yes | yes |
| lend, collect, borrow, repay | yes | no | no |

Categories a wallet may list, by kind: basic and credit take expense and income categories; goal takes income categories only.

## Category (`categories/<name>.md`)

| Property | Type | Required | Meaning | Example |
| --- | --- | --- | --- | --- |
| `kind` | text | yes | `expense` or `income` | `expense` |
| `parent` | link | | Parent category of the same kind; empty = top level | `"[[Food]]"` |
| `budget` | number | | Limit per period in the base currency, across all wallets. On a parent it covers its children too | `40000` |
| `icon` | text | | Emoji | `🍜` |
| `order` | number | | Display order | `20` |
| `archived` | checkbox | | | `false` |

A child and its parent may both have budgets; they are tracked separately and never added together.

## Person (`people/<name>.md`)

| Property | Type | Meaning |
| --- | --- | --- |
| `archived` | checkbox | Hidden once everything is settled |

The note body is free for the user (contact details, context). Balances are always computed from transactions; the person note's backlinks show the full history.

## Recurring item (`recurring/<name>.md`)

One kind of note covers automatic entries (rent, salary, savings transfers) and reminders (bills whose amount varies).

| Property | Type | Required | Meaning | Example |
| --- | --- | --- | --- | --- |
| `id` | text | yes | `RC-…`, used to build occurrence ids | `RC-a1b2c3d4e5` |
| `mode` | text | yes | `auto`: logged on the due date. `remind`: shown as due; the user pays (enters the real amount) or skips | `remind` |
| `type` | text | yes | `expense`, `income`, `transfer`, `repay`, `collect` | `expense` |
| `wallet` | link | yes | | `"[[Yucho]]"` |
| `amount` | number | yes | Exact for `auto`, estimate for `remind` | `8500` |
| `category` | link | expense, income | | `"[[Electricity]]"` |
| `to_wallet`, `to_amount` | link, number | transfer | | |
| `person` | link | repay, collect | | |
| `every` | text | yes | `day`, `week`, `month`, `year` | `month` |
| `interval` | number | yes | Every N units | `1` |
| `start` | date | yes | First occurrence | `2026-12-27` |
| `end` | date | | Last possible occurrence | |
| `next` | date | yes | Next occurrence not yet logged or skipped | `2026-12-27` |
| `remind_days` | number | | Days before `next` to start showing it (default in settings) | `3` |
| `archived` | checkbox | | | |

- Monthly items on days 29–31 fall on the last day of shorter months.
- Paying or auto-logging an occurrence creates a transaction with `recurring` set and id `TX-<RC id>-<YYYYMMDD>`, then advances `next` by one interval. Skipping only advances `next`.
- Past `end`, the item is archived.

## Inbox note (`inbox/*.md`)

Written by iOS Shortcuts; no id or links needed.

```yaml
---
amount: 1280
currency: JPY          # optional; defaults to the matched wallet's currency
merchant: Lawson
card: Rakuten Card     # matched against wallet names and aliases
captured_at: 2026-11-24T12:32:05
source: wallet-tap     # wallet-tap, notification, manual
---
```

On load and whenever a file appears in `inbox/`, the plugin creates an `expense` with `review: true` (wallet matched from `card`, category guessed from the last transaction with the same `merchant`) and moves the inbox note to the trash. A note it cannot process stays in place and shows in needs-review.

The transaction id is deterministic: `captured_at|amount|card|merchant` hashed to 10 characters a–z 0–9. When the Mac and the iPhone both process the same inbox note, they produce the same id and path, and the second device finds the file already there and only trashes the inbox note (D-012).

## Exchange rates (`system/fx-rates.csv`)

Columns `date,pair,rate,source`. `pair` like `JPYVND` means VND per 1 JPY. `source` is `api` or `manual`; fetched rates never overwrite a manual row for the same date and pair.

- Rate for day d: the row with the latest date not after d; before the first row, the first row.
- Converting X to Y: pair XY multiplies, pair YX divides; between two non-base currencies, go through the base currency.

## Settings (plugin `data.json`)

| Key | Default | Meaning |
| --- | --- | --- |
| `rootFolder` | `Tane` | Root folder |
| `periodStartDay` | 1 | Period start day, 1–28 (payday) |
| `baseCurrency` | `JPY` | Reporting currency |
| `secondCurrency` | `VND` | Shown next to net worth |
| `currencies` | JPY, VND | `{code, symbol, decimals, fxPair}` per currency |
| `totalBudget` | none | Overall budget per period, base currency |
| `budgetWarnPct` | 80 | Warning threshold |
| `defaultRemindDays` | 3 | For recurring items without `remind_days` |
| `defaultWallet` | none | Wallet preselected in the add-transaction modal when there is no last entry |
| `feeCategory` | none | Path of the category used for transfer fees |
| `language` | `auto` | `auto`, `vi`, `en`, `ja` |
| `openOnStartup` | false | Open the Tane tab when Obsidian starts |
| `fxProvider` | none | Exchange-rate source; none = manual only |
| `schemaVersion` | 1 | Note format version; bump with a one-time migration |
| `lastCatchUp` | none | Last date recurring items were caught up |

API keys (later, for AI) are stored with Obsidian's SecretStorage, never in `data.json`.

## Rules checked before writing

The writer refuses the whole change, with a clear message, when any rule fails:

- Required properties present with the right types; `date` a real date.
- The wallet accepts the transaction type (table above); for transfers, both wallets are not archived and differ.
- `category` has the kind matching `type` and is in the wallet's `categories`.
- `person` present for loan types, absent otherwise.
- `date` not before the wallet's `opening_date` (both wallets for transfers).
- A wallet's `categories` only contains categories its kind allows.
- `parent` has the same kind and is itself top level.
- Wallet, category, person and recurring names are unique within their folder.

## Needs review

Shown on the home screen; affected notes count in no totals until fixed:

- Missing or wrongly typed property, unknown `type` or `kind`.
- Link that resolves to nothing or to a note outside the expected folder.
- Two notes with the same `id` (usually a sync conflict copy `... 2.md`), transactions and recurring items alike: counted once, the copy with the older `updated` (or file modification time for recurring items) is listed.
- Inbox note that cannot be processed.
- Any rule above broken by a hand edit.
