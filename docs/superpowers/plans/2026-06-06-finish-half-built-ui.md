# Finish What Only Looks Done — Implementation Plan (Project A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WaifuHub's three decorative affordances real (search, favorites, artist attribution) and add basic image accessibility, all client-side.

**Architecture:** Single-file vanilla JS (`index.js`) + `index.html` + Tailwind, built by Vite, deployed to GitHub Pages. The keystone change is widening each image record from `{url, source}` to `{url, source, tag, artist, sourceUrl}`; every feature rides on that. Favorites persist in `localStorage`. No backend, no new dependencies.

**Tech Stack:** Vanilla JS, Tailwind (utility classes already loaded), Font Awesome 6 (already loaded — provides `fas fa-heart` solid and `far fa-heart` outline), Vite 4, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-06-06-finish-half-built-ui-design.md`

**Verification:** This repo has no unit-test harness (`npm test` is a stub), so each task is verified by running the dev server (`npm run start` → `http://localhost:5173/waifuhub/`) and driving a real browser via Playwright MCP — the same approach used for the nekos.best fix. Concrete browser checks are given per task.

---

## File Structure

- **Modify `index.js`** — all logic: widened record, `altFor()` helper, favorites helpers, `renderTags()`, `renderImages()`, `loadImages()`, `openLightbox()`, `setupEventListeners()`.
- **Modify `index.html`** — add two `id`s only: `id="tag-search"` on the nav input, `id="save-btn"` on the lightbox "Save to Collection" button.

No new files. No dependency or config changes.

---

### Task 1: Widen the image record — artist attribution + alt text (Features 3 & 4)

Thread artist/source/tag through each record, show real attribution in the lightbox, and give images meaningful `alt`. Changes `loadImages()`'s mapping, adds an `altFor()` helper, and rewrites `renderImages()` and `openLightbox()`.

**Files:** Modify `index.js`

- [ ] **Step 1: Capture artist/source/tag in `loadImages()`**

In `index.js`, find the results mapping inside `loadImages()`:

```js
        const results = (data.results || []).map(img => ({
            url: img.url,
            source: 'nekos.best'
        }));
```

Replace it with:

```js
        const results = (data.results || []).map(img => ({
            url: img.url,
            source: 'nekos.best',
            tag: activeTag,
            artist: img.artist_name || null,
            sourceUrl: img.source_url || null
        }));
```

- [ ] **Step 2: Add an `altFor()` helper**

In `index.js`, immediately after the `// --- Configuration ---` `TAGS` array closing `];`, add:

```js

// --- Helpers ---
function altFor(record) {
    return `${record.tag} anime art` + (record.artist ? ` by ${record.artist}` : '');
}
```

- [ ] **Step 3: Rewrite `renderImages()` to use the record (alt + pass record to lightbox)**

Replace the entire `renderImages` function with:

```js
// --- Render Images ---
function renderImages(images) {
    images.forEach((img) => {
        // Card Container
        const card = document.createElement('div');
        card.className = "break-inside-avoid mb-4 group relative rounded-2xl overflow-hidden bg-white/5 cursor-zoom-in active:scale-95 transition-transform duration-200 border border-white/5 hover:border-accent-pink/30";

        // Image
        const imageEl = document.createElement('img');
        imageEl.src = img.url;
        imageEl.alt = altFor(img);
        imageEl.className = "w-full h-auto object-cover opacity-0 transition-opacity duration-500";
        imageEl.loading = "lazy";
        imageEl.onload = () => imageEl.classList.remove('opacity-0');

        // Overlay (Hover)
        const overlay = document.createElement('div');
        overlay.className = "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4";
        overlay.innerHTML = `
            <div class="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <span class="text-xs font-bold text-accent-primary uppercase tracking-wider mb-1 block">${img.source}</span>
                <h3 class="text-white font-bold capitalize text-lg shadow-black drop-shadow-md">${img.tag}</h3>
            </div>
        `;

        card.onclick = () => openLightbox(img);

        card.appendChild(imageEl);
        card.appendChild(overlay);
        gridEl.appendChild(card);
    });
}
```

- [ ] **Step 4: Rewrite `openLightbox()` to take the record + show attribution + alt**

Replace the entire `window.openLightbox = ...` assignment with:

```js
// --- Lightbox Logic ---
window.openLightbox = (record, onFavChange) => {
    const lb = document.getElementById('lightbox');
    const lbContent = document.getElementById('lightbox-content');
    const imgInfo = document.getElementById('lightbox-img');
    const tagName = document.getElementById('lightbox-tag');
    const sourceInfo = document.getElementById('lightbox-source');
    const dlBtn = document.getElementById('download-btn');

    imgInfo.src = record.url;
    imgInfo.alt = altFor(record);
    tagName.textContent = record.tag;

    // Artist attribution from nekos.best; falls back to the API source name.
    if (record.artist && record.sourceUrl) {
        sourceInfo.innerHTML = `${record.source} · <a href="${record.sourceUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-white">${record.artist}</a>`;
    } else if (record.artist) {
        sourceInfo.textContent = `${record.source} · ${record.artist}`;
    } else {
        sourceInfo.textContent = record.source;
    }

    dlBtn.href = record.url;
    dlBtn.setAttribute('aria-label', 'Download image');

    lb.classList.remove('hidden');
    // Force reflow
    void lb.offsetWidth;
    lb.classList.remove('opacity-0');
    lbContent.classList.remove('scale-95');
};
```

(The `onFavChange` parameter is unused until Task 3; it's harmless now.)

- [ ] **Step 5: Verify in browser**

Run `npm run start`. Navigate (Playwright) to `http://localhost:5173/waifuhub/`, then evaluate:

```js
async () => {
  const start = performance.now();
  while (document.querySelectorAll('#masonry-grid img').length === 0 && performance.now() - start < 8000) {
    await new Promise(r => setTimeout(r, 200));
  }
  const img = document.querySelector('#masonry-grid img');
  img.closest('div').click(); // open lightbox
  await new Promise(r => setTimeout(r, 300));
  return {
    gridAlt: img.getAttribute('alt'),
    lightboxOpen: !document.getElementById('lightbox').classList.contains('hidden'),
    sourceHtml: document.getElementById('lightbox-source').innerHTML
  };
}
```

Expected: `gridAlt` is like `"waifu anime art by <name>"` (or `"waifu anime art"` if no artist); `lightboxOpen` is `true`; `sourceHtml` contains `nekos.best` and, for an image with an artist, an `<a href=...>` link. No console errors.

- [ ] **Step 6: Commit**

```bash
git add index.js
git commit -m "feat: thread artist/source metadata into records, add lightbox attribution + image alt text"
```

---

### Task 2: Favorites — storage, card heart, Favorites pill, favorites mode (Feature 2 core)

**Files:** Modify `index.js`

- [ ] **Step 1: Add `favoritesMode` state**

Replace the state block:

```js
// --- State ---
let activeTag = 'waifu';
let isLoading = false;
```

with:

```js
// --- State ---
let activeTag = 'waifu';
let isLoading = false;
let favoritesMode = false;   // when true, the grid shows saved favorites
```

- [ ] **Step 2: Add favorites storage helpers**

In `index.js`, right after the `altFor()` helper added in Task 1, add:

```js

// --- Favorites (localStorage) ---
const FAV_KEY = 'waifuhub:favorites';

function getFavorites() {
    try {
        return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
    } catch {
        return [];
    }
}

function saveFavorites(list) {
    try {
        localStorage.setItem(FAV_KEY, JSON.stringify(list));
    } catch {
        /* storage unavailable — ignore */
    }
}

function isFavorite(url) {
    return getFavorites().some(f => f.url === url);
}

// Returns true if the record is now a favorite, false if it was removed.
function toggleFavorite(record) {
    const list = getFavorites();
    const idx = list.findIndex(f => f.url === record.url);
    if (idx >= 0) {
        list.splice(idx, 1);
    } else {
        list.push(record);
    }
    saveFavorites(list);
    return idx < 0;
}
```

- [ ] **Step 3: Add the Favorites pill to `renderTags()`**

Replace the entire `renderTags` function with this version (adds the pinned Favorites pill and makes normal pills exit favorites mode):

```js
// --- Tag Logic ---
function renderTags() {
    tagsBarEl.innerHTML = '';

    // Favorites pill — always first, always visible
    const favPill = document.createElement('button');
    favPill.className = "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border " +
        (favoritesMode
            ? "bg-accent-pink/20 border-accent-pink text-white shadow-[0_0_15px_rgba(255,55,95,0.3)]"
            : "bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10");
    favPill.innerHTML = '<i class="fas fa-heart mr-2 text-accent-pink"></i>Favorites';
    favPill.onclick = () => {
        favoritesMode = true;
        renderTags();
        loadImages(true);
    };
    tagsBarEl.appendChild(favPill);

    TAGS.forEach(tag => {
        const btn = document.createElement('button');
        const isActive = !favoritesMode && tag.name === activeTag;

        // Base glass styles
        let classes = "px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border border-white/5 ";

        if (isActive) {
            classes += "bg-accent-pink/20 border-accent-pink text-white shadow-[0_0_15px_rgba(255,55,95,0.3)]";
        } else {
            classes += "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10";
        }

        btn.className = classes;
        btn.textContent = tag.name.replace('-', ' ');
        btn.style.textTransform = 'capitalize';

        btn.onclick = () => {
            activeTag = tag.name;
            favoritesMode = false;
            renderTags(); // Re-render for active state
            loadImages(true); // Reset grid
        };

        tagsBarEl.appendChild(btn);
    });
}
```

- [ ] **Step 4: Short-circuit `loadImages()` in favorites mode + add `renderFavorites()`**

In `loadImages`, add the favorites short-circuit as the very first statements of the function. Replace:

```js
async function loadImages(reset = false) {
    if (isLoading) return;
    isLoading = true;
```

with:

```js
async function loadImages(reset = false) {
    if (favoritesMode) {
        if (reset) renderFavorites();
        return; // ignore infinite-scroll loads while viewing favorites
    }
    if (isLoading) return;
    isLoading = true;
```

Then, immediately AFTER the closing `}` of the `loadImages` function, add:

```js

// --- Favorites View ---
function renderFavorites() {
    loaderEl.classList.add('hidden');
    gridEl.innerHTML = '';
    const favs = getFavorites();
    if (favs.length === 0) {
        gridEl.innerHTML = `
            <div class="col-span-full text-center py-10">
                <p class="text-gray-400 font-bold mb-2">No favorites yet</p>
                <p class="text-xs text-gray-500">Tap the <i class="fas fa-heart text-accent-pink"></i> on any image to save it here.</p>
            </div>
        `;
        return;
    }
    renderImages(favs);
}
```

- [ ] **Step 5: Add the heart button in `renderImages()`**

Replace the entire `renderImages` function (the Task 1 version) with this version that adds the per-card heart and keeps the originating card in sync via `onFavToggle`:

```js
// --- Render Images ---
function renderImages(images) {
    images.forEach((img) => {
        // Card Container
        const card = document.createElement('div');
        card.className = "break-inside-avoid mb-4 group relative rounded-2xl overflow-hidden bg-white/5 cursor-zoom-in active:scale-95 transition-transform duration-200 border border-white/5 hover:border-accent-pink/30";

        // Image
        const imageEl = document.createElement('img');
        imageEl.src = img.url;
        imageEl.alt = altFor(img);
        imageEl.className = "w-full h-auto object-cover opacity-0 transition-opacity duration-500";
        imageEl.loading = "lazy";
        imageEl.onload = () => imageEl.classList.remove('opacity-0');

        // Favorite (heart) button
        const fav = document.createElement('button');
        const refreshFav = () => {
            const on = isFavorite(img.url);
            fav.className = "absolute top-3 right-3 z-10 w-9 h-9 rounded-full liquid-glass flex items-center justify-center text-base transition-all " +
                (on ? "opacity-100 text-accent-pink" : "opacity-0 group-hover:opacity-100 text-white hover:text-accent-pink");
            fav.setAttribute('aria-label', on ? 'Remove from favorites' : 'Add to favorites');
            fav.innerHTML = on ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
        };
        refreshFav();
        const onFavToggle = () => {
            refreshFav();
            if (favoritesMode && !isFavorite(img.url)) card.remove();
        };
        fav.onclick = (e) => {
            e.stopPropagation(); // don't open the lightbox
            toggleFavorite(img);
            onFavToggle();
        };

        // Overlay (Hover)
        const overlay = document.createElement('div');
        overlay.className = "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4";
        overlay.innerHTML = `
            <div class="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <span class="text-xs font-bold text-accent-primary uppercase tracking-wider mb-1 block">${img.source}</span>
                <h3 class="text-white font-bold capitalize text-lg shadow-black drop-shadow-md">${img.tag}</h3>
            </div>
        `;

        card.onclick = () => openLightbox(img, onFavToggle);

        card.appendChild(imageEl);
        card.appendChild(fav);
        card.appendChild(overlay);
        gridEl.appendChild(card);
    });
}
```

- [ ] **Step 6: Verify in browser**

With the dev server running, navigate to `http://localhost:5173/waifuhub/` and evaluate:

```js
async () => {
  const start = performance.now();
  while (document.querySelectorAll('#masonry-grid img').length === 0 && performance.now() - start < 8000) {
    await new Promise(r => setTimeout(r, 200));
  }
  // favorite the first card via its heart button
  const heart = document.querySelector('#masonry-grid button[aria-label]');
  heart.click();
  const stored = JSON.parse(localStorage.getItem('waifuhub:favorites') || '[]');
  // open favorites mode
  const favPill = [...document.querySelectorAll('#tags-bar button')].find(b => /Favorites/.test(b.textContent));
  favPill.click();
  await new Promise(r => setTimeout(r, 300));
  return {
    storedCount: stored.length,
    favViewImgCount: document.querySelectorAll('#masonry-grid img').length
  };
}
```

Expected: `storedCount` is `1`; `favViewImgCount` is `1` (the favorited image shows in Favorites mode). Then reload the page and evaluate `JSON.parse(localStorage.getItem('waifuhub:favorites')||'[]').length` → still `1` (persistence). Click Favorites with storage cleared (`localStorage.removeItem('waifuhub:favorites')` then reload + click Favorites) → grid shows "No favorites yet". No console errors.

- [ ] **Step 7: Commit**

```bash
git add index.js
git commit -m "feat: add favorites (localStorage) with card heart, Favorites pill, and favorites view"
```

---

### Task 3: Lightbox "Save to Collection" as a real toggle (Feature 2, lightbox)

**Files:** Modify `index.html`, `index.js`

- [ ] **Step 1: Give the lightbox save button an id**

In `index.html`, find:

```html
          <button
            class="w-full py-3 bg-accent-primary hover:bg-blue-600 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20">
            Save to Collection
          </button>
```

Replace with:

```html
          <button id="save-btn"
            class="w-full py-3 bg-accent-primary hover:bg-blue-600 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20">
            Save to Collection
          </button>
```

- [ ] **Step 2: Wire the save button in `openLightbox()`**

Replace the entire `window.openLightbox = ...` assignment (the Task 1 version) with this version, which adds the save-button sync/toggle:

```js
// --- Lightbox Logic ---
window.openLightbox = (record, onFavChange) => {
    const lb = document.getElementById('lightbox');
    const lbContent = document.getElementById('lightbox-content');
    const imgInfo = document.getElementById('lightbox-img');
    const tagName = document.getElementById('lightbox-tag');
    const sourceInfo = document.getElementById('lightbox-source');
    const dlBtn = document.getElementById('download-btn');
    const saveBtn = document.getElementById('save-btn');

    imgInfo.src = record.url;
    imgInfo.alt = altFor(record);
    tagName.textContent = record.tag;

    // Artist attribution from nekos.best; falls back to the API source name.
    if (record.artist && record.sourceUrl) {
        sourceInfo.innerHTML = `${record.source} · <a href="${record.sourceUrl}" target="_blank" rel="noopener noreferrer" class="underline hover:text-white">${record.artist}</a>`;
    } else if (record.artist) {
        sourceInfo.textContent = `${record.source} · ${record.artist}`;
    } else {
        sourceInfo.textContent = record.source;
    }

    dlBtn.href = record.url;
    dlBtn.setAttribute('aria-label', 'Download image');

    // Save-to-favorites toggle, kept in sync with the originating card's heart.
    const syncSave = () => {
        const on = isFavorite(record.url);
        saveBtn.innerHTML = on ? '<i class="fas fa-heart mr-2"></i>Saved' : 'Save to Collection';
        saveBtn.setAttribute('aria-label', on ? 'Remove from favorites' : 'Save to favorites');
    };
    syncSave();
    saveBtn.onclick = () => {
        toggleFavorite(record);
        syncSave();
        if (onFavChange) onFavChange();
    };

    lb.classList.remove('hidden');
    // Force reflow
    void lb.offsetWidth;
    lb.classList.remove('opacity-0');
    lbContent.classList.remove('scale-95');
};
```

- [ ] **Step 3: Verify in browser**

With the dev server running, navigate fresh (clear favorites first), then evaluate:

```js
async () => {
  localStorage.removeItem('waifuhub:favorites');
  const start = performance.now();
  while (document.querySelectorAll('#masonry-grid img').length === 0 && performance.now() - start < 8000) {
    await new Promise(r => setTimeout(r, 200));
  }
  const card = document.querySelector('#masonry-grid img').closest('div');
  card.click(); // open lightbox
  await new Promise(r => setTimeout(r, 300));
  const saveBtn = document.getElementById('save-btn');
  const before = saveBtn.textContent.trim();
  saveBtn.click(); // save
  const afterSave = saveBtn.textContent.trim();
  const stored = JSON.parse(localStorage.getItem('waifuhub:favorites') || '[]').length;
  // the originating card's heart should now read "Remove from favorites"
  const heartLabel = card.querySelector('button[aria-label]').getAttribute('aria-label');
  return { before, afterSave, stored, heartLabel };
}
```

Expected: `before` = `"Save to Collection"`, `afterSave` = `"Saved"`, `stored` = `1`, `heartLabel` = `"Remove from favorites"` (lightbox and card stay in sync). No console errors.

- [ ] **Step 4: Commit**

```bash
git add index.html index.js
git commit -m "feat: make lightbox Save-to-Collection a real favorites toggle synced with the card heart"
```

---

### Task 4: Search — filter the tag bar + Enter to load (Feature 1)

**Files:** Modify `index.html`, `index.js`

- [ ] **Step 1: Give the search input an id**

In `index.html`, find:

```html
        <input type="text" placeholder="Search tags..."
          class="bg-white/5 border border-white/5 rounded-full pl-8 pr-4 py-1 text-sm focus:outline-none focus:bg-white/10 focus:border-accent-primary transition-all w-32 focus:w-48 text-gray-200 placeholder-gray-500">
```

Replace with:

```html
        <input type="text" id="tag-search" placeholder="Search tags..."
          class="bg-white/5 border border-white/5 rounded-full pl-8 pr-4 py-1 text-sm focus:outline-none focus:bg-white/10 focus:border-accent-primary transition-all w-32 focus:w-48 text-gray-200 placeholder-gray-500">
```

- [ ] **Step 2: Add `tagQuery` state**

Replace the state block:

```js
// --- State ---
let activeTag = 'waifu';
let isLoading = false;
let favoritesMode = false;   // when true, the grid shows saved favorites
```

with:

```js
// --- State ---
let activeTag = 'waifu';
let isLoading = false;
let favoritesMode = false;   // when true, the grid shows saved favorites
let tagQuery = '';           // current search filter for the tag bar
```

- [ ] **Step 3: Filter pills in `renderTags()`**

In `renderTags`, find the start of the tag loop:

```js
    TAGS.forEach(tag => {
        const btn = document.createElement('button');
        const isActive = !favoritesMode && tag.name === activeTag;
```

Replace with (adds the query filter; the Favorites pill above is unaffected and always shows):

```js
    TAGS.forEach(tag => {
        if (tagQuery && !tag.name.toLowerCase().includes(tagQuery)) return;

        const btn = document.createElement('button');
        const isActive = !favoritesMode && tag.name === activeTag;
```

- [ ] **Step 4: Wire the search input in `setupEventListeners()`**

Replace the entire `setupEventListeners` function with:

```js
// --- Event Listeners ---
function setupEventListeners() {
    // Tag search: live-filter the pills; Enter loads the top match.
    const searchEl = document.getElementById('tag-search');
    if (searchEl) {
        searchEl.addEventListener('input', () => {
            tagQuery = searchEl.value.trim().toLowerCase();
            renderTags();
        });
        searchEl.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            const q = searchEl.value.trim().toLowerCase();
            const match = TAGS.find(t => t.name.toLowerCase().includes(q));
            if (match) {
                activeTag = match.name;
                favoritesMode = false;
                renderTags();
                loadImages(true);
            }
        });
    }

    // Infinite Scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadImages(false);
        }
    });
}
```

- [ ] **Step 5: Verify in browser**

With the dev server running, navigate to `http://localhost:5173/waifuhub/` and evaluate:

```js
async () => {
  const search = document.getElementById('tag-search');
  const visiblePills = () => [...document.querySelectorAll('#tags-bar button')].map(b => b.textContent.trim());
  search.value = 'hu';
  search.dispatchEvent(new Event('input'));
  const filtered = visiblePills();           // expect Favorites + only tags containing "hu"
  // Enter loads the top match
  search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(r => setTimeout(r, 400));
  return { filtered, gridLoaded: document.querySelectorAll('#masonry-grid img').length };
}
```

Expected: `filtered` contains `"Favorites"` plus only tags whose name includes `hu` (e.g. `Husbando`, `Hug`, `Handhold` — note `includes` matches substring, so `Husbando`/`Hug`/`Handhold` all contain "hu"); it must NOT contain unrelated tags like `Neko`. `gridLoaded` > 0 (Enter loaded the top match). No console errors.

- [ ] **Step 6: Commit**

```bash
git add index.html index.js
git commit -m "feat: wire tag search — live-filter pills and Enter to load the top match"
```

---

### Task 5: Production build + full regression verify

**Files:** none (build + verification)

- [ ] **Step 1: Syntax check + build**

```bash
node --check index.js && echo "syntax OK"
npm run build
```

Expected: `syntax OK`; build prints `✓ N modules transformed` and emits `dist/` with no errors.

- [ ] **Step 2: Preview the production bundle and regression-test all four features**

Run `npm run preview`, open the previewed `/waifuhub/` URL in the browser, and confirm end-to-end against the built bundle:
- Initial gallery loads images (no regression from Project A's nekos.best fix).
- Search filters pills and Enter loads a tag.
- Hearting a card persists across reload; the Favorites pill shows saved items; empty state appears when cleared.
- Lightbox shows a real artist link (for an image that has one) and its Save button toggles in sync with the card heart.
- Grid/lightbox images expose meaningful `alt`.

Stop the preview server when done.

- [ ] **Step 3: Done** — hand off to `superpowers:finishing-a-development-branch` to push and open a PR (work is on branch `feat/finish-half-built-ui`).

---

## Self-Review

**Spec coverage:**
- Search (filter pills + Enter) → Task 4. ✓
- Favorites: storage, card heart, lightbox toggle, Favorites pill, empty state, dedupe by url → Tasks 2 & 3. ✓
- Artist attribution (artist_name/source_url link in lightbox) → Task 1. ✓
- Alt text + icon `aria-label`s → Tasks 1 (alt, download label) & 2 (heart label) & 3 (save label). ✓
- Widened record + `openLightbox(record)` → Task 1. ✓
- Error/edge: localStorage try/catch, dedupe by url, favorites-mode scroll no-op, no-match search → Tasks 2 & 4. ✓
- Out of scope (proxy, NSFW, named collections, keyboard nav) → not in any task. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type/identifier consistency:** Record shape `{url, source, tag, artist, sourceUrl}` is produced in Task 1 and consumed by `altFor`, `renderImages`, `openLightbox`, and favorites everywhere. `favoritesMode`/`tagQuery` declared before use. `openLightbox(record, onFavChange)` signature matches all call sites (`openLightbox(img)` in Task 1 → `openLightbox(img, onFavToggle)` in Task 2; `onFavChange` consumed in Task 3). `FAV_KEY = 'waifuhub:favorites'` used consistently in helpers and all verify snippets. Font Awesome `fas fa-heart` / `far fa-heart` both ship in the loaded FA6 CSS. ✓
