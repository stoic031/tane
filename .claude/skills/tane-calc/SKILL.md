---
name: tane-calc
description: Write or change Tane's calculations in src/core (wallet balances, period income and spending, budgets and pace, left to spend today, credit card cycles, goals, loans by person, recurring estimates, net worth, currency conversion), test first.
when_to_use: a number on screen is wrong, a new report or figure, a change to a formula, a new currency rule
---

# Tane's calculations

Source of truth: `docs/calculations.md`. Folder rules: `.claude/rules/core.md`.

## Steps

1. Find the formula in `docs/calculations.md`. If it is not there, stop, agree the formula with the owner, and write it into the docs before coding.
2. Write tests first in `test/core/<name>.test.ts`:
   - At least one worked example from the docs, with exact numbers.
   - Edge cases: a period crossing the year, February, start day 29–31 clamped, negative amounts (refunds), cross-currency transfers with a fee, a wallet before its `opening_date`, parent and child categories, archived wallets.
3. Run `npm test` and see it fail for the right reason.
4. Write a pure function in `src/core/calc/`. Inputs: parsed records (not `TFile`), `today`, and the settings it needs. No `obsidian`, no clock.
5. `npm test`, then `npm run check`.

## Function shape

```ts
// src/core/calc/balance.ts
export function walletBalance(wallet: Wallet, txs: readonly Transaction[], until: Ymd): number
```

- One function per figure; screens combine several. The UI store calls them on the current snapshot.
- Add money as integers in minor units (`src/core/money.ts`). JPY and VND have 0 decimals.
- Period income and spending use `amount_base`; wallet balances use `amount` and `to_amount` in the wallet's own currency.
- Transfers are never income or spending; a transfer fee is its own `expense` (category from the `feeCategory` setting, same `group` as the transfer), so it counts as spending.
- Loan types move wallet balances but are never income or spending.

## When a number looks wrong

1. Reproduce it with a small fake data set in a test, not with the owner's real data.
2. Decide whether the code or the docs are wrong; if the docs are unclear, ask the owner.
3. Fix, keep the test, update `docs/calculations.md` if the rule changed.
