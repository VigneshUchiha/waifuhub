# Finish What Only Looks Done — Design Spec (Project A)

**Date:** 2026-06-06
**Status:** Approved (design); pending implementation plan
**Scope:** Client-side only. No backend, no new infra. Ships on the existing GitHub Pages pipeline unchanged.

## Goal

Three UI affordances in WaifuHub currently *look* finished but do nothing, and the app has an accessibility gap. This project makes them real:

1. **Search bar** — wire up the existing nav input to filter tags.
2. **Favorites** — turn the decorative "Save to Collection" into a real, persisted favorites feature.
3. **Artist attribution** — surface the `artist_name` / `source_url` already returned by nekos.best.
4. **Alt text / a11y** — give images meaningful `alt` and icon buttons `aria-label`s.

This is the first of two sequenced projects. The **serverless proxy** (re-enabling waifu.im rich tags + NSFW + caching) is a separate, later spec and is explicitly out of scope here.

## Current State (what exists today)

- Pure client-side app: `index.html` + `index.js` (vanilla JS) + Tailwind, built by Vite, deployed to GitHub Pages.
- Images come from nekos.best only (SFW): `GET https://nekos.best/api/v2/<tag>?amount=12` → `{ results: [{ url, artist_name, artist_href, source_url, anime_name? }] }`.
- `loadImages()` maps each result to `{ url, source: 'nekos.best' }` — **discarding artist/source metadata**.
- `renderImages()` builds a card per image; `card.onclick → openLightbox(img.url, activeTag, img.source)`.
- `openLightbox(url, tag, source)` fills `#lightbox-img`, `#lightbox-tag`, `#lightbox-source`, `#download-btn`.
- Nav has a **search `<input>` with no `id`** and no listener (placeholder only).
- Lightbox has a **"Save to Collection" `<button>` with no `id`** and no handler (decorative).
- Grid/lightbox images use generic/empty `alt`.

## Design

### Shared change: widen the image record

The one structural change everything else builds on. `loadImages()` maps each nekos.best result to:

```
{ url, source: 'nekos.best', tag: <activeTag>, artist: artist_name||null, sourceUrl: source_url||null }
```

`openLightbox` is changed to accept the full record (`openLightbox(img)`) instead of `(url, tag, source)`. `card.onclick` passes the record. This carries the data needed for attribution and favorites without re-fetching.

### Feature 1 — Search

- Give the nav input `id="tag-search"`.
- On `input`: filter the rendered pills in `#tags-bar` so only tags whose name **contains** the query (case-insensitive substring) remain visible; empty query shows all. The `♥ Favorites` pill (see Feature 2) always stays visible.
- On `Enter`: load the **top matching tag** (first pill still visible), i.e. set `activeTag` and `loadImages(true)`.
- Implementation note: `renderTags()` already rebuilds pills; the filter operates by hiding/showing existing pill elements (or re-rendering with a filter argument) so active-state styling is preserved.

### Feature 2 — Favorites

- **Store:** a single list in `localStorage` under key `waifuhub:favorites`, holding the widened image records. Helpers: `getFavorites()`, `isFavorite(url)`, `toggleFavorite(record)` (dedupe by `url`).
- **Add/remove from cards:** a heart button overlaid top-right on each card. Hidden until card hover (visible/filled when already favorited). Clicking toggles favorite state and updates its own icon. `aria-label` reflects state ("Add to favorites" / "Remove from favorites"). The heart click must `stopPropagation` so it doesn't open the lightbox.
- **Add/remove from lightbox:** the existing "Save to Collection" button gets `id="save-btn"` and becomes a toggle reflecting the current image's saved state ("♥ Saved" when favorited).
- **Viewing favorites:** a `♥ Favorites` pill pinned as the **first** item in `#tags-bar` (rendered by `renderTags()`, not part of the `TAGS` data array). Activating it sets a mode where `loadImages` renders saved records from `localStorage` instead of fetching. Re-clicking a normal tag exits favorites mode.
- **Empty state:** in favorites mode with no saved items, the grid shows a friendly "No favorites yet — tap the ♥ on any image" message (reuses the existing centered-message pattern from the error state).
- **No** named collections, **no** cloud sync (future work, with the proxy/accounts).

### Feature 3 — Artist attribution

- In the lightbox, when `record.artist` is present, show the artist name; if `record.sourceUrl` is present, render it as a link (`target="_blank"`, `rel="noopener noreferrer"`). Falls back gracefully to just the tag/source when absent (GIF categories often have no artist — may use `anime_name` as a secondary label if desired, optional).
- The API-source label (`nekos.best`) is retained.

### Feature 4 — Alt text / accessibility

- Grid and lightbox images get a meaningful `alt`: `"<tag> anime art"` plus `" by <artist>"` when an artist is known.
- New icon buttons (card heart, lightbox save, download) get appropriate `aria-label`s.
- Scope guard: full lightbox keyboard navigation (arrow keys, focus trap) is **Project B**, not here.

## Data Flow

```
nekos.best → loadImages() → [widened records] → renderImages() → cards (+ heart) → openLightbox(record)
                                   │                                   │
                                   └── Favorites pill mode reads ◄──── toggleFavorite() → localStorage
```

## Error / Edge Handling

- `localStorage` unavailable or JSON corrupt → treat favorites as empty; never throw (wrap reads in try/catch).
- Favoriting the same image twice is a no-op (dedupe by `url`).
- Toggling a favorite while in Favorites mode removes its card from the current view.
- Search query matching no tag → empty pill strip (Favorites pill still shown); Enter with no match does nothing.

## Testing / Verification

No unit-test harness exists; verification is browser-based (Playwright MCP), consistent with prior work:

- Type in search → pills filter live; Enter loads top match.
- Heart a card → persists across reload (localStorage); `♥ Favorites` pill shows it; un-heart removes it.
- Lightbox "Save to Collection" toggles and stays in sync with the card heart.
- Lightbox shows a real artist link when the image has one.
- Images expose meaningful `alt`; icon buttons expose `aria-label`s.
- `npm run build` succeeds; deployed site behaves the same as dev.

## Out of Scope (future projects)

- Serverless proxy, waifu.im rich tags, NSFW gating, response caching.
- Multiple named collections, cloud sync / accounts.
- Full lightbox keyboard nav, shareable deep-link URLs, PWA, framework migration.
