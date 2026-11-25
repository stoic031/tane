# fixtures/

FAKE data for tests and for the "Tane Dev" test vault. Never put real data here.

Planned (milestone M2):

- `vault-small/`: a few wallets, categories, people, recurring items and transactions that follow `docs/data-model.md`, covering every transaction type and the worked examples in `docs/calculations.md`.
- A generator in `scripts/` builds a large fake vault (about 4,000 transactions, one year) with a fixed seed, for performance checks on iPhone. Its output is not committed.
