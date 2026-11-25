# Testing on devices and releasing

Two ways to get a build onto the iPhone: the test vault for daily work, GitHub releases with BRAT for versions.

## Mac: the `plugin-test` vault (D-011)

The source lives in `plugin-test/.obsidian/plugins/tane`, so `npm run dev` writes `main.js` straight into a vault the Mac's Obsidian has open. The `hot-reload` plugin reloads Tane after each build. `plugin-test` holds fake data only.

## iPhone: test vault on iCloud

1. On the iPhone, create a vault named `Tane Dev` with "Store in iCloud" on. Fake data only.
2. On the Mac, open it with "Open folder as vault" (`~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Tane Dev`). Turn on community plugins on both devices.
3. Put the path in `.envrc.local` (see `.envrc.local.example`) and run `direnv allow`.
4. `npm run dev` (watch) or `npm run build`: after each build, `main.js`, `manifest.json` and `styles.css` are also copied to `$TANE_VAULT/.obsidian/plugins/tane/`.
5. Mac: Settings → Community plugins → enable Tane; after a rebuild, run "Reload app without saving".
6. iPhone: wait for iCloud, force-quit Obsidian, reopen.

Never point `TANE_VAULT` at the real finance vault.

## Versions: GitHub release + BRAT

Done by the `release-brat` skill, which runs only when the owner types `/release-brat`.

1. `npm run check` passes.
2. `npm version patch|minor|major` (or `npm version 0.2.0-beta.1` for a pre-release) updates `package.json`, `manifest.json`, `versions.json`, commits, and tags without a `v` (see `.npmrc`).
3. `git push && git push --tags`. The `Release` workflow checks, builds, verifies the tag matches the manifest, and publishes a release with the three files. Tags containing `-` become pre-releases.
4. Verify: `gh run list --workflow=release.yml --limit 1`, then `gh release view <tag>`.
5. iPhone: Obsidian → BRAT → "Add beta plugin" with `<owner>/<repo>` the first time, "Check for updates" afterwards.

The repository is public (D-017), so BRAT needs no token.

## Test data

- `fixtures/` holds fake data. A generator in `scripts/` (M2) builds a fake vault, including one with about 4,000 transactions to measure startup time on the iPhone (Obsidian → Settings → General → the stopwatch icon shows startup timing).
- Real data never enters the repository; `private/` is ignored by git and denied to Claude Code.
