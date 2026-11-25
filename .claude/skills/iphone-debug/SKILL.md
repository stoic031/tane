---
name: iphone-debug
description: Find bugs that only happen on the iPhone (plugin does not load, blank screen, wrong gestures, slow startup) when Obsidian on iOS has no developer tools. Use when the owner reports a problem on the phone.
---

# Debugging on the iPhone

Obsidian on iOS has almost no debugging tools. Work through these steps in order and stop when the cause is found. Talk to the owner in Vietnamese.

## 1. Ask for the facts (once, numbered)

1. iOS version, Obsidian version (Settings → About), Tane version (Settings → Community plugins).
2. What they did and what happened (a screenshot if possible).
3. The end of `Tane/system/log.md` (they may blank out real amounts).
4. Does it also happen in the "Tane Dev" test vault, or only in the real vault?

## 2. Usual suspects

- **Plugin does not load**: syntax older WebKit does not understand (regex lookbehind, very new JS APIs). Check `target` in `esbuild.config.mjs` (es2018), run `npm run check`, check `minAppVersion`.
- **Desktop-only APIs**: Node, Electron, `require('fs')`, `process`. Lint and `check-forbidden` usually catch these.
- **Blank screen after opening**: an uncaught error in `onLayoutReady`, `onOpen` or a Svelte component's first render. Wrap boundaries in try/catch and log.
- **Gestures taken by Obsidian**: horizontal swipes open sidebars, pulling down opens the command palette (`docs/ui.md`).
- **Slow startup**: iCloud may need to download files; count notes in `transactions/`; measure with Settings → General → the stopwatch icon (startup time).
- **Data missing**: iCloud has not finished syncing; conflict copies `... 2.md`.

## 3. Reproduce on the Mac (if possible)

1. Open "Tane Dev" in Obsidian desktop, then developer tools (Cmd+Option+I).
2. In the console: `app.emulateMobile(true)`, reproduce, read the error; `app.emulateMobile(false)` to undo.
3. If it only fails on WebKit: try the code in Safari, or lower the build `target`.

## 4. Add logging when the cause is unclear

- Log through `src/data/log.ts` into `Tane/system/log.md`: time, version, step, error message, stack. No amounts, merchants or notes.
- Show a short `Notice` on error so the owner knows to send the log.
- Build, get it onto the iPhone (iCloud test vault or BRAT), ask the owner to repeat and send the log.

## 5. After the fix

Add a test if the bug was in logic; add a line to `docs/ui.md` or `docs/obsidian-rules.md` if it was a new iOS trap.
