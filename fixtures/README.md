# fixtures/

FAKE data for tests and for test vaults. Never put real data here.

- `vault-small/Tane/`: wallets of every kind, categories with parents and budgets, people, recurring items (auto and remind), an inbox capture, a rate file, and transactions covering every type and the worked examples in `docs/calculations.md`. `test/data/fixtures.test.ts` loads it and expects no problems. To try it in Obsidian, copy `vault-small/Tane` into a test vault (for example `plugin-test`).
- `scripts/gen-vault.mjs` builds a large fake vault (default about 4,000 transactions over one year) with a fixed seed, for performance checks on iPhone. Its output is not committed.
