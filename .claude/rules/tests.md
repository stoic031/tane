---
paths:
  - "test/**/*.ts"
  - "fixtures/**"
  - "scripts/**"
---

# Rules for tests, fixtures and scripts

- vitest. One `describe` per function; test names describe the situation in English.
- Use the worked examples from `docs/calculations.md` (lunch 1,280 JPY; transfer 100,000 JPY → 17,500,000 VND with 1,500 fee; refund −8,900; period with D = 25…) so tests check both the code and the docs.
- Fixed dates (`'2026-11-24'`); no test depends on the real clock or on randomness (pass a byte source to `newId`).
- `test/mocks/obsidian.ts` stays minimal; prefer moving logic into `src/core` over mocking more of Obsidian.
- Data-layer tests use an in-memory fake vault, never a real vault on disk.
- `fixtures/` and generated vaults hold fake data only. Never copy real financial data into the repository.
- Generators use a fixed seed so output is reproducible.
