---
paths:
  - "src/ui/**"
  - "styles.css"
---

# Rules for src/ui/ and styles.css

- Obsidian's API only (D-018): `Modal`, `SuggestModal`, `ItemView`, `MarkdownRenderChild`, `BasesView`, `Setting`, `createEl`, `setIcon`. No UI framework, no custom animation.
- Every surface is (or is owned by) a `Component`; register listeners on it so they are removed on unload.
- Surfaces never call `app.vault` write methods or `app.fileManager`; they call functions in `src/data`. They may call pure helpers from `src/core`.
- Widgets are functions that render into an element from a snapshot; the panel and code blocks share them.
- The UI reads the clock only through `src/ui/time.ts`.
- No `innerHTML` or HTML strings: merchants, notes and names are user text. Use `createEl` / `setText`.
- No fixed inline styles. Styles go in `styles.css` with `.tane-` selectors; a computed value may set a CSS variable (`el.style.setProperty('--tane-progress', …)`).
- Use Obsidian CSS variables for colors, fonts, radii and spacing so themes and dark mode work.
- All user-facing text comes from `src/core/i18n` (en, vi, ja), in sentence case.
- Tap targets at least 44 px on mobile; icon-only buttons have `aria-label`.
- Use `activeDocument` / `activeWindow` instead of `document` / `window`.
