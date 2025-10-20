// Tab switching functionality
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const features = (typeof CONFIG !== 'undefined' && CONFIG.features) ? CONFIG.features : {};
    const rememberLastTab = features.rememberLastTab !== false; // default true

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked button and corresponding content
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');

            // Save the active tab to localStorage
            if (rememberLastTab) localStorage.setItem('activeTab', targetTab);
        });
    });

    // Restore last active tab on page load
    const defaultTab = (typeof CONFIG !== 'undefined' && CONFIG.defaultTab) ? CONFIG.defaultTab : 'keybinds';
    const savedTab = rememberLastTab ? localStorage.getItem('activeTab') : null;
    if (savedTab) {
        const savedButton = document.querySelector(`[data-tab="${savedTab}"]`);
        if (savedButton) {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            savedButton.classList.add('active');
            document.getElementById(savedTab).classList.add('active');
        }
    } else {
        const defButton = document.querySelector(`[data-tab="${defaultTab}"]`);
        if (defButton) {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            defButton.classList.add('active');
            document.getElementById(defaultTab).classList.add('active');
        }
    }

    // Keyboard shortcuts
    if (features.enableKeyboardShortcuts !== false) {
        document.addEventListener('keydown', function(e) {
            if (!e.altKey) return;
            const keyNum = parseInt(e.key);
            if (keyNum === 1) {
                const button = document.querySelector('[data-tab="keybinds"]');
                if (button) button.click();
            }
            if (keyNum === 2) {
                window.location.href = 'map-tool.html';
            }
        });
    }

    // Add a subtle animation to cards on scroll
    const cards = document.querySelectorAll('.card');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    if (features.enableAnimations !== false) {
        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            observer.observe(card);
        });
    }

    // Add clock to show current time
    function updateClock() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit'
        });
        
        // You can add a clock element to the header if desired
        // For now, this is just a placeholder for future enhancement
    }

    setInterval(updateClock, 1000);
    updateClock();

    console.log('Arena Breakout Helper loaded successfully!');
    console.log('Keyboard shortcuts: Alt + 1-4 to switch tabs');
});

// Add custom functionality here
// You can add features like:
// - Timer for mission objectives
// - Notes system
// - Screenshot viewer for maps
// - Custom keybind editor

// Updater logic (shared on index and map pages)
document.addEventListener('DOMContentLoaded', function() {
    // Version tag injection
    try {
        const v = (typeof CONFIG !== 'undefined' && CONFIG.version) ? CONFIG.version : null;
        const el = document.getElementById('versionTag');
        if (v && el) el.textContent = 'v' + v;
    } catch (_) {}

    const btn1 = document.getElementById('checkUpdatesBtn');
    const btn2 = document.getElementById('checkUpdatesBtnMap');
    const banner = document.getElementById('updateBanner');
    const bannerText = document.getElementById('updateBannerText');
    const bannerInstall = document.getElementById('bannerInstallBtn');
    const bannerDismiss = document.getElementById('bannerDismissBtn');

    // Check on load for newer version and show banner
    (async function checkForNewerOnLoad() {
        try {
            if (!CONFIG || !CONFIG.update) return;
            const manifestRes = await fetch(CONFIG.update.manifestUrl, { cache: 'no-store' });
            if (!manifestRes.ok) return;
            const manifest = await manifestRes.json();
            const current = CONFIG.version;
            const latest = manifest.version;
            if (latest && latest !== current && banner) {
                banner.style.display = '';
                if (bannerText) bannerText.textContent = `(current v${current} → v${latest})`;
                if (bannerInstall) bannerInstall.onclick = () => {
                    const trigger = btn1 || btn2; // reuse the same install flow
                    if (trigger) trigger.click();
                };
                if (bannerDismiss) bannerDismiss.onclick = () => {
                    banner.style.display = 'none';
                };
            }
        } catch (_) {}
    })();

    const attach = (btn) => {
        if (!btn) return;
        btn.addEventListener('click', async () => {
            try {
                if (!CONFIG || !CONFIG.update) {
                    alert('Update configuration missing.');
                    return;
                }
                const manifestRes = await fetch(CONFIG.update.manifestUrl, { cache: 'no-store' });
                if (!manifestRes.ok) throw new Error('Failed to fetch manifest');
                const manifest = await manifestRes.json();
                const current = CONFIG.version;
                const latest = manifest.version;
                if (!latest) {
                    alert('No version info found.');
                    return;
                }
                if (latest === current) {
                    alert(`You are up to date (v${current}).`);
                    return;
                }
                const proceed = confirm(`New version available: v${latest} (current v${current}).\nInstall update now?`);
                if (!proceed) return;

                // Try File System Access API
                const supportsFS = 'showDirectoryPicker' in window;
                if (!supportsFS) {
                    window.open(CONFIG.update.releaseUrl || CONFIG.update.zipUrl, '_blank');
                    return;
                }

                // Ask user to pick the app folder (the folder containing index.html)
                try {
                    const href = decodeURIComponent(location.href || '');
                    let suggestion = '';
                    if (href.startsWith('file:///')) {
                        // Convert file:///G:/path/to/index.html -> G:\path\to\
                        const windowsPath = href.replace('file:///', '').replace(/\//g, '\\');
                        suggestion = windowsPath.replace(/[^\\]+$/, '');
                    }
                    const msg = 'Select the folder where Arena Breakout Helper is installed.\n' +
                                'Pick the folder that contains index.html.\n' +
                                (suggestion ? ('Suggested: ' + suggestion) : '');
                    alert(msg);
                } catch (_) {}
                const dirHandle = await window.showDirectoryPicker();
                // Simple check: ensure index.html exists
                const hasIndex = await dirHandle.getFileHandle('index.html').then(() => true).catch(() => false);
                if (!hasIndex) {
                    const proceedAnyway = confirm('Selected folder does not contain index.html. Continue anyway?');
                    if (!proceedAnyway) return;
                }

                // Download ZIP
                const zipRes = await fetch(CONFIG.update.zipUrl, { cache: 'no-store' });
                if (!zipRes.ok) throw new Error('Failed to download update');
                const zipArray = await zipRes.arrayBuffer();

                // Lazy-load JSZip if not present
                if (!(window).JSZip) {
                    await new Promise((resolve, reject) => {
                        const s = document.createElement('script');
                        s.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
                        s.onload = resolve;
                        s.onerror = () => reject(new Error('Failed to load JSZip'));
                        document.head.appendChild(s);
                    });
                }

                const zip = await (window).JSZip.loadAsync(zipArray);

                // Extract files
                const writeFile = async (path, content) => {
                    const parts = path.split('/').filter(Boolean);
                    let currentDir = dirHandle;
                    for (let i = 0; i < parts.length - 1; i++) {
                        const part = parts[i];
                        currentDir = await currentDir.getDirectoryHandle(part, { create: true });
                    }
                    const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(content);
                    await writable.close();
                };

                const entries = Object.keys(zip.files);
                for (const name of entries) {
                    const entry = zip.files[name];
                    if (entry.dir) continue;
                    const blob = await entry.async('blob');
                    await writeFile(name, blob);
                }

                alert('Update installed. Please refresh the page.');
                if (banner) banner.style.display = 'none';
            } catch (err) {
                console.error(err);
                alert('Update failed: ' + err.message);
            }
        });
    };
    attach(btn1);
    attach(btn2);
});

