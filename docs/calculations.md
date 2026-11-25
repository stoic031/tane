# Calculations

Every number is recomputed from the notes; nothing derived is stored. All formulas live in `src/core/` as pure functions: inputs are parsed records (never `TFile`), settings, and `today` as `YYYY-MM-DD` passed in by the caller. Notes in needs-review are excluded before any calculation.

## Period

Implemented in `src/core/period.ts`, tested in `test/core/period.test.ts`.

- `periodStartDay` = D (1–28). A period starts on day D and ends the day before day D of the next month.
- Name (key `YYYY-MM`): D ≤ 15 → the month it starts in; D > 15 → the next month (the one holding most of its days).
- Example, D = 25: period `2026-11` runs 2026-10-25 to 2026-11-24.

## Wallet balance

```
B(W, d) = opening_balance
        + Σ income + Σ collect + Σ borrow + Σ adjust
        − Σ expense − Σ lend − Σ repay
        − Σ transfer from W (amount)
        + Σ transfer to W (to_amount)
```

- Sums use `amount` of transactions whose `wallet` is W, except transfers into W, which use `to_amount`.
- Only transactions dated from `opening_date` through d. Without d: current balance.
- Credit wallets are normally negative (amount owed).

## Income and spending for a period

- Income = Σ `amount_base` of `income` in the period. Spending = Σ `amount_base` of `expense` in the period; refunds (negative) reduce it.
- Transfers, adjustments and loan types are never income or spending.
- Spending of a parent category = its own + its children's.
- Cash flow = income − spending. Savings rate = cash flow ÷ income, not shown when income is 0.
- Saved this period = Σ `amount_base` of transfers into goal wallets − transfers out of goal wallets.

## Budgets

- A category's limit is its `budget` property; the same limit applies to every period (changing it changes past comparisons too; accepted trade-off, D-008).
- Spent = spending of the category and its children in the period, in all wallets, in the base currency.
- Overall: `totalBudget` from settings if set; otherwise the sum of budgets on top-level categories, plus budgets on child categories whose parent has none.
- Status: below `budgetWarnPct` normal; from the threshold to 100% warning; above 100% over.
- Pace: expected spend today = limit × days elapsed (including today) ÷ days in period. Ahead of pace when spent > expected.

## Left to spend today

- = max(0, (overall limit − spent before today) ÷ days left in the period including today − spent today) (D-015).
- The daily share is fixed at the start of the day; each purchase today lowers the number by exactly its amount.
- No overall limit at all → not shown; the home screen invites the user to set budgets.
- The headline number on the home screen.

## Goals (goal wallets)

- Saved = current balance. Progress = saved ÷ `goal_amount`.
- Monthly amount needed = (`goal_amount` − saved) ÷ months left until `goal_date`, rounded up. Months left = calendar months from today to `goal_date`, rounded up, at least 1. Not shown when reached or past the date.
- On track when saved ≥ `opening_balance` + (`goal_amount` − `opening_balance`) × (days since `opening_date`) ÷ (days from `opening_date` to `goal_date`).
- Reached when saved ≥ `goal_amount`.

## Loans by person

- They owe me = Σ `lend` − Σ `collect`. I owe them = Σ `borrow` − Σ `repay`.
- Computed per person and per currency; wallets are combined. The two directions are kept apart, never netted.
- The currency of a loan is the currency of its `lend` (or `borrow`). A `collect` (or `repay`) in another currency is converted into the loan's currency at the rate of its own date (§ Exchange rates in `docs/data-model.md`); if the person has open loans in several currencies, the oldest open one is reduced first (D-016).
- Settled at 0. A negative value (over-repaid) shows in needs-review.
- Due date = the latest `due_date` among that person's `lend` (or `borrow`) transactions while the balance is open; overdue when today is later.
- Totals across people are converted with the latest rates.

## Recurring items

- Occurrences: from `start`, every `interval` × `every`, up to `end`. Monthly items on days 29–31 fall on the month's last day when it is shorter.
- Catch-up (when Tane opens, once per day): for each `auto` item, log every occurrence from `next` through today, then advance `next`.
- Due soon (`remind`): today is between `next` − `remind_days` and `next`. Overdue: today after `next`; several missed occurrences are listed one by one, oldest first.
- Upcoming 30 days = every occurrence of every item due in the next 30 days, plus overdue ones, converted with the latest rates.
- Suggested estimate for a `remind` item = average of the last 3 transactions it produced.

## Credit cards

- Last closing date C = the latest `statement_day` not after today (31 = month end).
- Statement amount = −B(card, C). Still to pay = statement amount − transfers into the card after C, not below 0.
- Due date = `payment_day` in the month of C + `payment_month_offset` (month end when the month is shorter).
- Current cycle spending = expenses on the card after C.
- These are estimates: purchases close to the closing date may land on the next real statement.

## Net worth

- = Σ balances of all wallets + Σ they owe me − Σ I owe them, in the base currency at the latest rates. Credit wallets are negative, so they subtract.
- Second currency = base total × latest base→second rate.
- Net worth on a past date: same formula with that date's balances and rates.

## Money arithmetic and conversion

- Add money as integers in minor units (multiply by 10^decimals) to avoid floating-point drift; round only for display and when freezing `amount_base`.
- `amount_base` and `fx_rate` are set once when the transaction is written. Editing `amount` or `date` recomputes them. Changing a historical rate offers a command to recompute affected transactions, with confirmation.
- Display rounding follows the currency's `decimals`.

## Worked examples (use these in tests)

| Case | Data | Expected |
| --- | --- | --- |
| Period | D = 25, today 2026-11-09 | Period `2026-11`, 2026-10-25 to 2026-11-24, 31 days, 16 left |
| Lunch | expense 1,280 JPY from PayPay | PayPay −1,280; spending +1,280 |
| Refund | expense −8,900 JPY, category Shoes | Spending −8,900 |
| Cross-currency transfer | Yucho → VN Bank, 100,000 JPY sent, 17,500,000 VND received, fee 1,500 JPY | Yucho −101,500; VN Bank +17,500,000; spending +1,500 (fee); income unchanged |
| Card payment | transfer 48,200 Yucho → card | Yucho −48,200; card +48,200; spending unchanged |
| Lend and collect | lend Minh 20,000; collect 5,000 | Minh owes 15,000; wallet −15,000 net |
| Borrow and repay | borrow Lan 50,000; repay 20,000 | I owe Lan 30,000 |
| Left to spend | overall limit 150,000; spent before today 90,000; 10 days left including today | 6,000 at the start of the day; after lunch 1,280 → 4,720 |
| Loan in two currencies | lend Minh 20,000 JPY; collect 1,750,000 VND at 175 VND per JPY | Minh owes 10,000 JPY |
