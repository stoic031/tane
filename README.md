# Tane

Personal finance inside your Obsidian vault: one note per transaction, wallets, categories and people as notes, budgets and pay-cycle months, two currencies, built for iPhone first.

> Status: early development. Not ready for general use.

## Quick start (macOS, Nix + direnv)

```bash
cd tane
git init -b main && git add .   # a flake only sees files tracked by git
direnv allow                    # loads flake.nix: Node 26, git, gh
npm install
npm run check                   # build + lint + test
```

The repository sits inside a test vault's `.obsidian/plugins/tane/`, so builds load there directly (use the `hot-reload` plugin). Optional: copy `.envrc.local.example` to `.envrc.local`, point `TANE_VAULT` at a **test** vault, run `direnv allow`, then `npm run dev`. Each build is copied into that vault's `.obsidian/plugins/tane/`.

Built with TypeScript and Obsidian's own API. Working with Claude Code: run `claude` in this folder. Project instructions are in `CLAUDE.md`, docs in `docs/`, workflows in `.claude/skills/`.

## Install on iPhone (beta)

Install the BRAT plugin in Obsidian, choose **Add beta plugin**, and enter this repository. See `docs/release.md`.

## What it does

- **Log** with the "Add transaction" modal (ribbon, command, mobile toolbar, or `obsidian://tane?amount=1280&merchant=Lawson` from iOS Shortcuts): expenses, income, transfers between currencies with a fee, balance adjustments, loans to and from people.
- **See** left to spend today, budgets with pace, period income and spending, upcoming bills, wallets, loans and net worth in the right-sidebar panel, or anywhere with a code block such as ` ```tane today ``` `.
- **List** transactions with Bases: Tane creates `This period.base`, `By wallet.base` and `To review.base`, with its own "Tane ledger" view.
- **Capture** card payments automatically with iOS Shortcuts (`docs/shortcuts.md`).
- **Recurring** rent, salary and bills: logged automatically or reminded with Pay / Skip.
- Vietnamese, English, Japanese.

Data format: `docs/data-model.md`. Try it with the fake vault in `fixtures/vault-small`.

## Privacy and network use

All data stays in your vault as Markdown files. Tane collects no telemetry and sends nothing about your data anywhere.

One optional network feature, off by default: **exchange rates**. When "Exchange rates online" is set to currency-api, Tane downloads the public daily rate table for your base currency once a day from `cdn.jsdelivr.net` (fallback `currency-api.pages.dev`), [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api). No account, key or payment is needed, and the request contains only the base currency code. Later AI features will use your own API key and stay off by default.

## License

MIT, see `LICENSE`.
