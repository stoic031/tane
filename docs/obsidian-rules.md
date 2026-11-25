# Obsidian rules for plugins

Summarised from Obsidian's Developer policies, Plugin guidelines, the submission checklist, and `eslint-plugin-obsidianmd` (installed; `npm run lint`). The policies are binding only for plugins in the official directory; Tane follows them from day one so it can be submitted at any time.

Automated: `npm run check` (typecheck, build, lint, tests, `scripts/check-forbidden.mjs`). Manual: the `obsidian-review` skill.

## Never

- Obfuscate code; client-side telemetry; ads loaded from the network.
- Update the plugin or its dependencies outside the normal release.
- Build DOM from HTML strings: `innerHTML`, `outerHTML`, `insertAdjacentHTML`, Svelte `{@html}`.
- Assign fixed styles from code or inline `style="..."`; override Obsidian's core styles.
- Node or Electron modules (`fs`, `path`, `electron`…): the plugin must run on iPhone (`isDesktopOnly: false`).
- `fetch` or `axios`: use `requestUrl`.
- Regex lookbehind (`(?<=`, `(?<!`): breaks on older iOS.
- Cast `vault.adapter` to `FileSystemAdapter`; use `process.platform` (use `Platform`).
- `vault.delete`: use `app.fileManager.trashFile`.
- Default hotkeys for commands; the plugin id inside a command id (Obsidian adds it).
- Leave sample code (`MyPlugin`, `SampleModal`…).
- Keep references to views in the plugin; find them with `workspace.getLeavesOfType`.

## Always

- State in the README which network services are used and why (exchange rates; later AI), and whether an account or payment is needed.
- Add a license file before submitting.
- Register every event, interval and DOM listener with `this.registerEvent`, `this.registerInterval`, `this.registerDomEvent`.
- Do heavy work after `workspace.onLayoutReady()`, never in `onload` itself.
- Edit frontmatter with `app.fileManager.processFrontMatter`; edit bodies with `vault.process`; use the Vault API, not the Adapter API; `normalizePath()` user-supplied paths.
- Sentence case in UI text. Settings headings via `new Setting(el).setName(…).setHeading()`, only when there is more than one section, and without the word "settings".
- Use `activeDocument` and `activeWindow` instead of global `document` and `window` (pop-out windows on desktop).
- Store secrets with SecretStorage (`app.secretStorage`, Obsidian 1.11.4+), never in `data.json`.
- Keep `manifest.json` correct: `id` never changes after release; `minAppVersion` matches the APIs used (currently 1.11.4).

## Svelte specifics

- Follow Obsidian's guide "Use Svelte in your plugin": `esbuild-svelte` with `css: 'injected'`, `mount` in `onOpen`, `unmount` in `onClose`.
- The compiled Svelte runtime itself contains an `innerHTML` call for static templates. That is the framework, not plugin code; plugin code must still never render user text as HTML.

## Releases

- The git tag equals `version` in `manifest.json`, with no leading `v`.
- The release attaches `main.js`, `manifest.json` and `styles.css` as separate files.
- `main.js` is build output and never committed.
- Since 2026-05-12 Obsidian reviews submissions automatically and shows a scorecard; declare network and file access, and attach build provenance (artifact attestation is in `release.yml`).

## Known warning

`obsidianmd/settings-tab/prefer-setting-definitions`: Obsidian 1.13 added declarative settings (`getSettingDefinitions()`) so settings appear in settings search. Tane's `minAppVersion` is 1.11.4, so it is not used yet; revisit when raising `minAppVersion`.
