---
paths:
  - "src/main.ts"
  - "src/settings.ts"
  - "src/data/**/*.ts"
---

# Rules for src/main.ts, src/settings.ts and src/data/

- `main.ts` only wires things up: `onload` registers the view, commands, settings tab, protocol handler and events; heavy work waits for `workspace.onLayoutReady()`.
- Register every listener, interval and vault event with `this.registerEvent`, `this.registerInterval`, `this.registerDomEvent` so unloading cleans up.
- Do not keep references to views in the plugin; find them with `workspace.getLeavesOfType`.
- Read data from `metadataCache.getFileCache(file)?.frontmatter`, parse with `src/core`. Keep the index in sync with `metadataCache.on('changed')`, `vault.on('create' | 'delete' | 'rename')`, one file at a time, debounced.
- Resolve links with `metadataCache.getFirstLinkpathDest` and check the target folder; build links with `metadataCache.fileToLinktext` and write `"[[...]]"`.
- Every write goes through `data/writer.ts`: validate with `src/core` first, then `vault.create`, `fileManager.processFrontMatter`, `fileManager.renameFile` or `fileManager.trashFile`. Never `vault.delete`, never the Adapter API, `normalizePath` for user paths.
- The writer does not patch the index; vault events do, so hand edits and plugin edits take the same path.
- Jobs (inbox, catch-up, fx, integrity) are idempotent: deterministic ids, check before create.
- Network: `requestUrl` only, and only for features listed in the README. Secrets go in `app.secretStorage`, never in `data.json`.
- Errors: catch at boundaries (commands, events, jobs, writer), append to `system/log.md` via `data/log.ts` without amounts, merchants or notes, show a short `Notice`. No `console.log`.
- Settings changes that alter the data format bump `schemaVersion` and add a one-time, tested migration.
