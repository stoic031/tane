---
name: release-brat
description: Publish a Tane version as a GitHub release so the iPhone can update through BRAT. Runs only when the owner types /release-brat.
disable-model-invocation: true
argument-hint: "[patch | minor | major | x.y.z | x.y.z-beta.n]"
---

# Releasing a version

Version: $ARGUMENTS (if empty, ask the owner: `patch`, `minor`, `major`, or an exact number; pre-releases look like `0.2.0-beta.1`).

## Checks first

1. `git status`: clean working tree on `main`. Otherwise stop and tell the owner.
2. `npm run check` passes.
3. Run the `obsidian-review` skill on the changes since the last release (`git log <previous tag>..HEAD`). Any **Must fix** item stops the release.
4. `gh auth status` and `git remote -v`: signed in to GitHub, `origin` exists.

## Release

1. Summarise for the owner (in Vietnamese): current version → new version, main changes from `git log`. Wait for approval.
2. `npm version $ARGUMENTS`: updates `package.json`, `manifest.json`, `versions.json`, commits, tags without a `v` (`.npmrc`).
3. Check the tag matches the manifest: `node -p "require('./manifest.json').version"` and `git describe --tags`.
4. `git push && git push --tags` (Claude Code asks for permission).
5. Watch: `gh run list --workflow=release.yml --limit 1`, then `gh run watch <id>`. On failure: `gh run view <id> --log-failed`, tell the owner, do not delete the tag yourself.
6. Confirm: `gh release view <tag>` lists `main.js`, `manifest.json`, `styles.css`.

## Tell the owner (numbered, in Vietnamese)

1. Open Obsidian → Settings → BRAT.
2. First time: "Add beta plugin", paste `<owner>/<repo>`, enable Tane in Community plugins. Later: "Check for updates".
3. Private repository: BRAT needs a fine-grained token for this repository only, with Contents: read-only.
4. Force-quit Obsidian, reopen, check the version in Community plugins.
