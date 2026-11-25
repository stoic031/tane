---
name: obsidian-review
description: Review Tane's code against Obsidian's plugin policies and Tane's data, UI and privacy rules before a large commit, before a release, or when the owner asks for a review. Reports problems with file and line, then fixes them if the owner agrees.
allowed-tools: Bash(npm run check) Bash(npm run lint *) Bash(git diff *) Bash(git status *) Bash(git log *)
---

# Plugin review

## 1. Automated checks

Run `npm run check`. Note every error and warning.

## 2. Read the code

Read `git diff` (or all of `src/` before a release). Check each item:

**Obsidian policies** (`docs/obsidian-rules.md`)
- [ ] No Node or Electron modules, no `fetch`, no regex lookbehind, no `innerHTML`, no `{@html}`.
- [ ] No fixed styles from code or `style="..."`; no overrides of Obsidian's core styles.
- [ ] Listeners and intervals registered with `register*`.
- [ ] Heavy work in `onLayoutReady`, not in `onload`.
- [ ] No view references kept in the plugin. No default hotkeys.
- [ ] Every network call is listed in the README (service, what is sent, why) and can be turned off.
- [ ] API keys in SecretStorage.

**Layers** (`docs/architecture.md`)
- [ ] `src/core` does not import `obsidian` and does not read the clock.
- [ ] UI surfaces do not write to the vault.

**Data** (`docs/data-model.md`)
- [ ] Writes go through `data/writer.ts`, which validates first; nothing half-written on failure.
- [ ] Frontmatter via `processFrontMatter`; deletes via `trashFile`; links as `"[[...]]"` built with `fileToLinktext`.
- [ ] Bad notes go to needs-review, never silently skipped or counted.
- [ ] Jobs are idempotent (deterministic ids, check before create).
- [ ] If the note format changed: `schemaVersion` bumped and a tested one-time migration.

**Calculations**
- [ ] New logic in `src/core`, with tests using the worked examples.

**UI** (`docs/ui.md`)
- [ ] Only `transform` and `opacity` animated; reduced-motion branch present.
- [ ] Strings from i18n, sentence case; `aria-label` on icon buttons.
- [ ] Nothing under Obsidian's floating navigation.

**Privacy**
- [ ] No real data in tests, fixtures, screenshots or logs.
- [ ] No `console.log`; the log note contains no amounts, merchants or notes.

## 3. Report

Group findings: **Must fix** (policy violation, data loss, wrong numbers) → **Should fix** → **Notes**. For each: `file:line`, the problem, the fix. Ask the owner before making many fixes at once.
