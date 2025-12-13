
// --- State ---
let activeTag = 'waifu';
let isNSFW = false;
let isLoading = false;

// --- DOM Elements ---
const gridEl = document.getElementById('masonry-grid');
const tagsBarEl = document.getElementById('tags-bar');
const loaderEl = document.getElementById('loader');
const lightboxEl = document.getElementById('lightbox');
const nsfwToggleBtn = document.getElementById('nsfw-toggle');
const nsfwKnob = document.getElementById('nsfw-knob');

// --- Configuration ---
// Tag mapping: Tag Name -> Source Compatibility
// Source: 'pics' (Waifu.pics), 'im' (Waifu.im), 'both'
const TAGS = [
    { name: 'waifu', source: 'both', category: 'Character' },
    { name: 'neko', source: 'both', category: 'Character' },
    { name: 'maid', source: 'im', category: 'Character' },
    { name: 'uniform', source: 'im', category: 'Character' },
    { name: 'marin-kitagawa', source: 'im', category: 'Character' },
    { name: 'mori-calliope', source: 'im', category: 'Character' },
    { name: 'raiden-shogun', source: 'im', category: 'Character' },
    { name: 'oppai', source: 'im', category: 'Character' },
    { name: 'selfies', source: 'im', category: 'Character' },
    { name: 'kamisato-ayaka', source: 'im', category: 'Character' },
    { name: 'shinobu', source: 'pics', category: 'Character' },
    { name: 'megumin', source: 'pics', category: 'Character' },

    // Interactions
    { name: 'cuddle', source: 'pics', category: 'Interaction' },
    { name: 'hug', source: 'pics', category: 'Interaction' },
    { name: 'kiss', source: 'pics', category: 'Interaction' },
    { name: 'pat', source: 'pics', category: 'Interaction' },
    { name: 'poke', source: 'pics', category: 'Interaction' },
    { name: 'slap', source: 'pics', category: 'Interaction' },
    { name: 'bite', source: 'pics', category: 'Interaction' },
    { name: 'bonk', source: 'pics', category: 'Interaction' },
    { name: 'handhold', source: 'pics', category: 'Interaction' },
    { name: 'highfive', source: 'pics', category: 'Interaction' },
    { name: 'smile', source: 'pics', category: 'Interaction' },
    { name: 'blush', source: 'pics', category: 'Interaction' },
    { name: 'wave', source: 'pics', category: 'Interaction' },
    { name: 'dance', source: 'pics', category: 'Interaction' },

    // Moods
    { name: 'happy', source: 'pics', category: 'Mood' },
    { name: 'cry', source: 'pics', category: 'Mood' },
    { name: 'smug', source: 'pics', category: 'Mood' },
    { name: 'cringe', source: 'pics', category: 'Mood' },
    { name: 'bully', source: 'pics', category: 'Mood' },

    // NSFW (Only avail if toggled)
    { name: 'hentai', source: 'im', category: 'NSFW', nsfw: true },
    { name: 'milf', source: 'im', category: 'NSFW', nsfw: true },
    { name: 'oral', source: 'im', category: 'NSFW', nsfw: true },
    { name: 'paizuri', source: 'im', category: 'NSFW', nsfw: true },
    { name: 'ecchi', source: 'im', category: 'NSFW', nsfw: true },
    { name: 'ass', source: 'im', category: 'NSFW', nsfw: true },
    { name: 'ero', source: 'im', category: 'NSFW', nsfw: true },
    { name: 'trap', source: 'pics', category: 'NSFW', nsfw: true },
    { name: 'blowjob', source: 'pics', category: 'NSFW', nsfw: true }
];

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
        if (tag.nsfw && !isNSFW) return; // Skip NSFW if toggle off

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
    if (!tagData) return;

    try {
        let results = [];
        const count = 15;

        // Simplified logic to avoid complex if/else nesting issues
        const useWaifuIm = tagData.source === 'im' || (tagData.source === 'both' && Math.random() > 0.5);

        if (useWaifuIm) {
            // Waifu.im
            let url = `https://api.waifu.im/search?included_tags=${activeTag}&limit=${count}`;
            if (isNSFW) url += '&is_nsfw=true';

            const res = await fetch(url);
            const data = await res.json();
            if (data.images) {
                results = data.images.map(img => ({ url: img.url, source: 'waifu.im' }));
            }
        } else {
            // Waifu.pics
            const type = isNSFW ? 'nsfw' : 'sfw';
            const url = `https://api.waifu.pics/${type}/${activeTag}`;

            const promises = Array.from({ length: 12 }).map(() => fetch(url).then(res => res.json()));
            const data = await Promise.all(promises);
            results = data.map(d => ({ url: d.url, source: 'waifu.pics' }));
        }

        renderImages(results);

    } catch (err) {
        console.error("Fetch error:", err);
    } finally {
        isLoading = false;
        loaderEl.classList.add('hidden');
    }
}

// --- Render Images ---
function renderImages(images) {
    images.forEach((img, index) => {
        // Card Container
        const card = document.createElement('div');
        card.className = "break-inside-avoid mb-4 group relative rounded-2xl overflow-hidden bg-white/5 cursor-zoom-in active:scale-95 transition-transform duration-200 border border-white/5 hover:border-accent-pink/30";
        card.onclick = () => openLightbox(img.url, activeTag, img.source);

        // Image
        const imageEl = document.createElement('img');
        imageEl.src = img.url;
        imageEl.className = "w-full h-auto object-cover opacity-0 transition-opacity duration-500";
        imageEl.loading = "lazy";
        imageEl.onload = () => imageEl.classList.remove('opacity-0');

        // Overlay (Hover)
        const overlay = document.createElement('div');
        overlay.className = "absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4";
        overlay.innerHTML = `
            <div class="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                <span class="text-xs font-bold text-accent-primary uppercase tracking-wider mb-1 block">${img.source}</span>
                <h3 class="text-white font-bold capitalize text-lg shadow-black drop-shadow-md">${activeTag}</h3>
            </div>
        `;

        card.appendChild(imageEl);
        card.appendChild(overlay);
        gridEl.appendChild(card);
    });
}

// --- Lightbox Logic ---
window.openLightbox = (url, tag, source) => {
    const lb = document.getElementById('lightbox');
    const lbContent = document.getElementById('lightbox-content');
    const imgInfo = document.getElementById('lightbox-img');
    const tagName = document.getElementById('lightbox-tag');
    const sourceInfo = document.getElementById('lightbox-source');
    const dlBtn = document.getElementById('download-btn');

    imgInfo.src = url;
    tagName.textContent = tag;
    sourceInfo.textContent = source;
    dlBtn.href = url;

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
    // NSFW Toggle
    nsfwToggleBtn.addEventListener('click', () => {
        isNSFW = !isNSFW;

        // Animation
        if (isNSFW) {
            nsfwKnob.classList.add('translate-x-4', 'bg-accent-pink');
            nsfwKnob.classList.remove('bg-gray-400');
            nsfwToggleBtn.classList.add('text-white');
        } else {
            nsfwKnob.classList.remove('translate-x-4', 'bg-accent-pink');
            nsfwKnob.classList.add('bg-gray-400');
            nsfwToggleBtn.classList.remove('text-white');
        }

        renderTags();
        // If current active tag is NSFW and we switched off, reset to 'waifu'
        const currentTagData = TAGS.find(t => t.name === activeTag);
        if (currentTagData && currentTagData.nsfw && !isNSFW) {
            activeTag = 'waifu';
        }
        loadImages(true);
    });

    // Infinite Scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            loadImages(false);
        }
    });
}

// Start
init();

