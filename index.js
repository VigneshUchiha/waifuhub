
// --- State ---
let activeTag = 'waifu';
let isLoading = false;

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

// --- Initialization ---
function init() {
    renderTags();
    setupEventListeners();
    loadImages(true); // Initial load
}

// --- Tag Logic ---
function renderTags() {
    tagsBarEl.innerHTML = '';

    TAGS.forEach(tag => {
        const btn = document.createElement('button');
        const isActive = tag.name === activeTag;

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
            renderTags(); // Re-render for active state
            loadImages(true); // Reset grid
        };

        tagsBarEl.appendChild(btn);
    });
}

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
        const safeHref = encodeURI(record.sourceUrl);
        sourceInfo.innerHTML = `${record.source} · <a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="underline hover:text-white">${record.artist}</a>`;
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
    // Infinite Scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadImages(false);
        }
    });
}

// Start
init();

