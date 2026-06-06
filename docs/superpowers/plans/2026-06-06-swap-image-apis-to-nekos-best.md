# Swap Dead Image APIs to nekos.best Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore image loading in WaifuHub by replacing the two dead third-party APIs (`api.waifu.pics`, `api.waifu.im`) with the working, CORS-enabled `nekos.best` API.

**Architecture:** WaifuHub is a 100%-client-side static site (Vite + Tailwind) deployed to GitHub Pages. There is no backend. The only broken layer is the data source: `api.waifu.pics` no longer resolves (`ERR_NAME_NOT_RESOLVED`) and `api.waifu.im` is behind a Cloudflare anti-bot wall that strips CORS headers (browser blocks it). The fix swaps both to `nekos.best`, which returns 200 + valid `Access-Control-Allow-Origin` from the browser (verified live). Because nekos.best is SFW-only, the NSFW toggle and character-specific tags are removed.

**Tech Stack:** Vanilla JS (`index.js`), HTML (`index.html`), Tailwind CSS, Vite 4, GitHub Pages. No test framework exists in this repo, so verification is done by running the app in a real browser (Playwright MCP) and asserting images load with zero fetch errors — this is the project's equivalent of a passing test.

---

## Root Cause (for context — already diagnosed, do not re-investigate)

Verified in a real browser at `http://localhost:5173/waifuhub/`:

| API | Browser result |
|-----|----------------|
| `https://api.waifu.pics/sfw/waifu` | `net::ERR_NAME_NOT_RESOLVED` (domain dead) |
| `https://api.waifu.im/search?...` | `blocked by CORS policy: No 'Access-Control-Allow-Origin' header` |
| `https://nekos.best/api/v2/waifu?amount=3` | **200 OK, valid image URLs, CORS allowed** ✅ |

Everything else (Vite build, Tailwind CSS generation, GitHub Pages base path `/waifuhub/`, asset rewriting, the UI) already works and must not be changed.

## nekos.best API reference (what the new code targets)

- **Endpoint:** `GET https://nekos.best/api/v2/<category>?amount=<1..20>`
- **No API key. Sends CORS headers.**
- **Response shape:** `{ "results": [ { "url": "https://...", "artist_name": "...", "source_url": "..." }, ... ] }`
  (GIF categories return `{ "results": [ { "url": "...", "anime_name": "..." } ] }` — `url` is always present, which is all we use.)
- **Valid categories used in this plan** (all confirmed real nekos.best v2 categories):
  - Static images: `waifu`, `neko`, `kitsune`, `husbando`
  - GIFs: `hug`, `cuddle`, `kiss`, `handhold`, `pat`, `poke`, `highfive`, `slap`, `bite`, `tickle`, `feed`, `happy`, `smile`, `wave`, `blush`, `smug`, `cry`, `pout`, `dance`, `sleep`, `think`

## File Structure

- **Modify** `index.js` — remap `TAGS`, rewrite `loadImages()`, strip all NSFW logic, remove dead DOM refs.
- **Modify** `index.html` — remove the NSFW toggle pill from the nav (its JS handler is being deleted).
- No new files. No config changes. No dependency changes.

---

### Task 1: Remap the tag list to nekos.best categories

**Files:**
- Modify: `index.js:18-65` (the entire `TAGS` array)

- [ ] **Step 1: Replace the `TAGS` array**

Replace the whole array (currently `const TAGS = [ ... ];`, lines 18-65) with this. Note: the `source` and `nsfw` fields are gone — every tag now maps 1:1 to a nekos.best category, and the `category` field is kept only as a human-readable grouping label.

```js
// --- Configuration ---
// Each `name` is a valid nekos.best v2 category (https://docs.nekos.best).
// `category` is just a human-readable grouping label.
const TAGS = [
    // Portraits (static images)
    { name: 'waifu', category: 'Character' },
    { name: 'neko', category: 'Character' },
    { name: 'kitsune', category: 'Character' },
    { name: 'husbando', category: 'Character' },

    // Interactions (animated gifs)
    { name: 'hug', category: 'Interaction' },
    { name: 'cuddle', category: 'Interaction' },
    { name: 'kiss', category: 'Interaction' },
    { name: 'handhold', category: 'Interaction' },
    { name: 'pat', category: 'Interaction' },
    { name: 'poke', category: 'Interaction' },
    { name: 'highfive', category: 'Interaction' },
    { name: 'slap', category: 'Interaction' },
    { name: 'bite', category: 'Interaction' },
    { name: 'tickle', category: 'Interaction' },
    { name: 'feed', category: 'Interaction' },

    // Moods (animated gifs)
    { name: 'happy', category: 'Mood' },
    { name: 'smile', category: 'Mood' },
    { name: 'wave', category: 'Mood' },
    { name: 'blush', category: 'Mood' },
    { name: 'smug', category: 'Mood' },
    { name: 'cry', category: 'Mood' },
    { name: 'pout', category: 'Mood' },
    { name: 'dance', category: 'Mood' },
    { name: 'sleep', category: 'Mood' },
    { name: 'think', category: 'Mood' }
];
```

`activeTag` stays `'waifu'` (line 3) — `'waifu'` is a valid nekos.best category, so the initial load works.

- [ ] **Step 2: Commit**

```bash
git add index.js
git commit -m "refactor: remap tag list to nekos.best SFW categories"
```

---

### Task 2: Rewrite `loadImages()` to call nekos.best (and fix the isLoading lockup)

**Files:**
- Modify: `index.js:108-171` (the whole `loadImages` function)

The old function branched between waifu.im and waifu.pics and used an aggressive `Promise.all` of N single-image requests. nekos.best returns a batch in **one** request via `?amount=`, so this gets simpler. This step also fixes a latent bug: the old `if (!tagData) return;` (line 118) returned **without** resetting `isLoading`/hiding the loader, permanently locking future loads.

- [ ] **Step 1: Replace the `loadImages` function**

Replace lines 108-171 (`async function loadImages(reset = false) { ... }`) with:

```js
// --- Fetch Logic ---
async function loadImages(reset = false) {
    if (isLoading) return;
    isLoading = true;
    loaderEl.classList.remove('hidden');

    if (reset) {
        gridEl.innerHTML = '';
    }

    const tagData = TAGS.find(t => t.name === activeTag);
    if (!tagData) {
        // Guard: unknown tag. Reset state so the UI doesn't lock up.
        isLoading = false;
        loaderEl.classList.add('hidden');
        return;
    }

    try {
        const count = 12;
        // nekos.best returns a batch in a single request and sends CORS headers.
        const url = `https://nekos.best/api/v2/${activeTag}?amount=${count}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`nekos.best API Error: ${res.status}`);

        const data = await res.json();
        const results = (data.results || []).map(img => ({
            url: img.url,
            source: 'nekos.best'
        }));

        if (results.length === 0) throw new Error('No images returned');

        renderImages(results);

    } catch (err) {
        console.error("Fetch error:", err);
        // Show error in grid
        gridEl.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-red-400 font-bold mb-2">Failed to load images</p>
                <p class="text-xs text-gray-500 font-mono">${err.message}</p>
                <button onclick="loadImages(true)" class="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm">Retry</button>
            </div>
        `;
    } finally {
        isLoading = false;
        loaderEl.classList.add('hidden');
    }
}
```

The `Retry` button calls `loadImages(true)`, so `loadImages` must remain global. It already is — it's a top-level function in a module that Vite serves, and the inline `onclick` resolves it via the global scope only if it's attached to `window`. **Note:** in the original code this worked because the script is loaded as a classic-ish module but `loadImages` is referenced by inline `onclick`. Verify in Task 4 that Retry works; if the console shows `loadImages is not defined`, add `window.loadImages = loadImages;` right after the function. (Leave it as-is for now to keep the diff minimal — Task 4 confirms.)

- [ ] **Step 2: Commit**

```bash
git add index.js
git commit -m "feat: fetch images from nekos.best in a single batched request"
```

---

### Task 3: Remove the NSFW toggle (SFW-only scope)

nekos.best is SFW-only, so the NSFW toggle and all `isNSFW` logic are dead weight and would reference DOM nodes we're deleting. Remove them from both files.

**Files:**
- Modify: `index.html:61-69` (NSFW nav pill)
- Modify: `index.js` — `isNSFW` state, `nsfwToggleBtn`/`nsfwKnob` refs, the NSFW skip in `renderTags`, and the NSFW handler in `setupEventListeners`

- [ ] **Step 1: Remove the NSFW pill from `index.html`**

Delete this entire block (lines 61-69):

```html
    <div class="pointer-events-auto liquid-glass rounded-full px-2 py-2 flex items-center">
      <button id="nsfw-toggle"
        class="px-4 py-1.5 rounded-full text-xs font-bold text-gray-400 hover:text-white transition-colors flex items-center gap-2">
        <span>NSFW</span>
        <div class="w-8 h-4 bg-white/10 rounded-full relative">
          <div id="nsfw-knob" class="absolute left-0.5 top-0.5 w-3 h-3 bg-gray-400 rounded-full transition-all"></div>
        </div>
      </button>
    </div>
```

The surrounding `<nav>` keeps its left "WaifuHub + search" glass pill; only the right-hand NSFW pill is removed.

- [ ] **Step 2: Remove the `isNSFW` state line in `index.js`**

Delete line 4:

```js
let isNSFW = false;
```

- [ ] **Step 3: Remove the dead DOM references in `index.js`**

Delete lines 12-13:

```js
const nsfwToggleBtn = document.getElementById('nsfw-toggle');
const nsfwKnob = document.getElementById('nsfw-knob');
```

- [ ] **Step 4: Remove the NSFW skip in `renderTags`**

In `renderTags`, delete this line (was line 79):

```js
        if (tag.nsfw && !isNSFW) return; // Skip NSFW if toggle off
```

- [ ] **Step 5: Replace `setupEventListeners` to drop the NSFW handler**

Replace the entire `setupEventListeners` function (was lines 241-272) with this — it keeps infinite scroll and removes the NSFW toggle block entirely:

```js
// --- Event Listeners ---
function setupEventListeners() {
    // Infinite Scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadImages(false);
        }
    });
}
```

- [ ] **Step 6: Commit**

```bash
git add index.html index.js
git commit -m "refactor: remove NSFW toggle (nekos.best is SFW-only)"
```

---

### Task 4: Verify in the browser (dev server) — the project's real test

This repo has no unit-test framework (`npm test` is a stub), so the authoritative verification is loading the running app in a real browser and confirming images render with no fetch errors.

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `npm run start`
Expected: `VITE v4.x ready` and `Local: http://localhost:5173/waifuhub/`

- [ ] **Step 2: Load the app in a real browser and assert images load**

Use Playwright MCP (`browser_navigate` to `http://localhost:5173/waifuhub/`), then run this in `browser_evaluate`:

```js
async () => {
  const r = await fetch('https://nekos.best/api/v2/waifu?amount=12');
  const j = await r.json();
  return { status: r.status, count: (j.results || []).length, first: j.results?.[0]?.url };
}
```

Expected: `{ status: 200, count: 12, first: "https://nekos.best/api/v2/waifu/...png" }`

- [ ] **Step 3: Assert the rendered grid actually has images**

In `browser_evaluate`:

```js
() => document.querySelectorAll('#masonry-grid img').length
```

Expected: `> 0` (around 12). Take a screenshot to confirm the masonry grid is full of images and the "Failed to load images" panel is gone.

- [ ] **Step 4: Assert zero fetch errors in the console**

Use Playwright `browser_console_messages` (level `error`). Expected: **no** `Failed to fetch`, **no** CORS errors, **no** `ERR_NAME_NOT_RESOLVED`. (A `favicon.ico` 404 is pre-existing and harmless — ignore it, or optionally add a favicon later.)

- [ ] **Step 5: Click through a few tags (image + gif categories)**

Click `Neko` (static), `Hug` (gif), and `Dance` (gif) pills. Each should repopulate the grid with no console errors. This confirms both static-image and gif categories work.

- [ ] **Step 6: Confirm the Retry button works**

If Step 4 surfaced `loadImages is not defined` when the error panel's Retry was clicked, add `window.loadImages = loadImages;` immediately after the `loadImages` function in `index.js`, then re-verify. Otherwise no change needed.

- [ ] **Step 7: Stop the dev server.**

---

### Task 5: Production build + deploy verification

**Files:** none (build + deploy)

- [ ] **Step 1: Build for production**

Run: `npm run build`
Expected: `✓ N modules transformed`, a `dist/` with `index.html`, `assets/index-*.js`, `assets/index-*.css`, and `.nojekyll`. No errors.

- [ ] **Step 2: Preview the production build locally**

Run: `npm run preview`
Open the previewed URL at the `/waifuhub/` base and confirm images load (same checks as Task 4, Steps 3-4) against the built bundle. Stop preview when done.

- [ ] **Step 3: Push to trigger GitHub Pages deploy**

```bash
git push origin main
```

The `.github/workflows/jekyll-gh-pages.yml` workflow runs `npm ci → npm run build → upload dist → deploy`. No workflow changes are needed.

- [ ] **Step 4: Verify the live site**

After the Actions run finishes, load `https://VigneshUchiha.github.io/waifuhub/` in a browser. Expected: masonry grid full of images, no console fetch errors. This is the definition of done.

---

## Notes / Out of Scope

- **Dropped features (per chosen SFW-only scope):** the NSFW toggle and character-specific tags (`marin-kitagawa`, `mori-calliope`, `raiden-shogun`, `kamisato-ayaka`, `shinobu`, `megumin`, `oppai`, `selfies`, `maid`, `uniform`). nekos.best has no equivalents. If these are wanted later, that requires the "proxy" or "hybrid" approach (a CORS proxy / serverless function in front of waifu.im) — a separate plan.
- **Pre-existing cosmetics not touched:** `tailwind.config.js` `content: ["*"]` works today (root files are scanned) but is fragile; `fontFamily.sans` is `'Inter'` in config while the page uses `'Outfit'` inline; `favicon.ico` 404. None affect functionality; leave them unless asked.
- **No dependency or Vite config changes** — the build/deploy pipeline is already healthy and verified.

## Self-Review

- **Spec coverage:** Swap both dead APIs → Tasks 1-2. SFW-only (remove NSFW) → Task 3. Verify it actually works → Tasks 4-5. ✅
- **Placeholder scan:** every code step contains complete, runnable code; no TBD/TODO. ✅
- **Type consistency:** `TAGS` items use `{ name, category }` everywhere; `renderImages` consumes `{ url, source }` objects, which `loadImages` produces; `activeTag` ('waifu') is a valid category. ✅
