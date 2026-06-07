
// --- State ---
let activeTag = 'waifu';
let isLoading = false;
let favoritesMode = false;   // when true, the grid shows saved favorites
let tagQuery = '';           // current search filter for the tag bar

// --- DOM Elements ---
const gridEl = document.getElementById('masonry-grid');
const tagsBarEl = document.getElementById('tags-bar');
const loaderEl = document.getElementById('loader');
const lightboxEl = document.getElementById('lightbox');

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

// --- Helpers ---
function altFor(record) {
    return `${record.tag} anime art` + (record.artist ? ` by ${record.artist}` : '');
}

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

// --- Initialization ---
function init() {
    renderTags();
    setupEventListeners();
    loadImages(true); // Initial load
}

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
        if (tagQuery && !tag.name.toLowerCase().includes(tagQuery)) return;

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

// --- Fetch Logic ---
async function loadImages(reset = false) {
    if (favoritesMode) {
        if (reset) renderFavorites();
        return; // ignore infinite-scroll loads while viewing favorites
    }
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
            source: 'nekos.best',
            tag: activeTag,
            artist: img.artist_name || null,
            sourceUrl: img.source_url || null
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
            if (favoritesMode && !isFavorite(img.url)) {
                card.remove();
                if (gridEl.children.length === 0) renderFavorites();
            }
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

    // Artist attribution from nekos.best. Built with DOM APIs (no innerHTML) so
    // artist names / URLs from the API cannot inject markup; only http(s) links
    // are honored.
    sourceInfo.textContent = record.source;
    if (record.artist) {
        sourceInfo.append(' · ');
        let safeUrl = null;
        if (record.sourceUrl) {
            try {
                const u = new URL(record.sourceUrl);
                if (u.protocol === 'http:' || u.protocol === 'https:') safeUrl = u.href;
            } catch { /* invalid URL — fall back to plain text */ }
        }
        if (safeUrl) {
            const a = document.createElement('a');
            a.href = safeUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'underline hover:text-white';
            a.textContent = record.artist;
            sourceInfo.append(a);
        } else {
            sourceInfo.append(record.artist);
        }
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

window.closeLightbox = (e) => {
    if (e && e.target.id !== 'lightbox' && !e.target.closest('button')) return;

    const lb = document.getElementById('lightbox');
    const lbContent = document.getElementById('lightbox-content');

    lb.classList.add('opacity-0');
    lbContent.classList.add('scale-95');

    setTimeout(() => {
        lb.classList.add('hidden');
        document.getElementById('lightbox-img').src = '';
    }, 300);
};

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
            if (!q) return;
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

// Start
init();

