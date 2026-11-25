---
paths:
  - "src/core/**/*.ts"
---

# Rules for src/core/

`src/core/` is pure TypeScript so it can be tested without Obsidian and reused later (for example by an import script or an AI feature).

- Do not import `obsidian`; no DOM, no browser-only or Node-only APIs.
- Do not read the clock (`new Date()`, `Date.now()`): take `today: string` (`YYYY-MM-DD`) or a timestamp as an argument.
- No randomness outside `ids.ts`; `newId` takes a byte source when a test needs one.
- Pure functions: same input, same output; never mutate arguments.
- Dates are `YYYY-MM-DD` strings; do date arithmetic with `period.ts` helpers (UTC inside), never by adding milliseconds by hand.
- Money: add as integers in minor units; round to the currency's `decimals` only for display and when freezing `amount_base`.
- Inputs are parsed records (plain objects), never `TFile` or frontmatter objects straight from Obsidian.
- Parsers return `{ ok: true, value }` or `{ ok: false, problems: string[] }`; they never throw on bad user data.
- Every exported function has tests in `test/core/` with concrete examples from `docs/calculations.md` or `docs/data-model.md`.
- Comments explain why, and point to the relevant docs section.
