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

Built with TypeScript and Svelte 5. Working with Claude Code: run `claude` in this folder. Project instructions are in `CLAUDE.md`, docs in `docs/`, workflows in `.claude/skills/`.

## Install on iPhone (beta)

Install the BRAT plugin in Obsidian, choose **Add beta plugin**, and enter this repository. See `docs/release.md`.

## Privacy and network use

All data stays in your vault as Markdown files. Tane collects no telemetry. Network features, each optional and off by default, will be listed here before release: exchange rates (for example JPY/VND) from a public rate API; later, AI features with your own API key.

## License

Not decided yet (see `docs/decisions.md`, Q-05).
