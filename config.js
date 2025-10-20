// Arena Breakout Helper Configuration
// Edit this file to easily customize your helper without touching the main HTML

const CONFIG = {
    // App Settings
    appName: "Arena Breakout Helper",
    version: "1.0",
    update: {
        // Replace OWNER and REPO after pushing to GitHub
        manifestUrl: "https://raw.githubusercontent.com/joellanus/Arena_Breakout/main/version.json",
        zipUrl: "https://github.com/joellanus/Arena_Breakout/releases/latest/download/arena-breakout-helper.zip",
        releaseUrl: "https://github.com/joellanus/Arena_Breakout/releases",
        autoInstall: true
    },
    
    // Theme Colors (edit these to change the color scheme)
    theme: {
        primaryColor: "#0099ff",
        accentColor: "#00d4ff",
        backgroundColor: "#000000",
        cardBackground: "#1a1a1a",
        borderColor: "#2a2a2a"
    },
    
    // Default tab to show on load
    defaultTab: "keybinds", // keybinds, maps, loadouts, tips
    
    // Feature Toggles
    features: {
        enableKeyboardShortcuts: true,
        enableAnimations: true,
        rememberLastTab: true,
        showFooter: true
    },
    
    // Custom Keybinds (add your own here)
    customKeybinds: [
        // Example:
        // { category: "Custom", key: "K", description: "Custom Action" }
    ],
    
    // Map Locations (add your own locations here)
    customLocations: [
        // Example:
        // { name: "My Spot", description: "Hidden vantage point" }
    ],
    
    // Custom Tips (add your own tips here)
    customTips: [
        // Example:
        // { category: "My Tips", tip: "This is a custom tip" }
    ]
};

// Apply custom theme on load
document.addEventListener('DOMContentLoaded', function() {
    if (CONFIG.theme) {
        const root = document.documentElement;
        root.style.setProperty('--primary-color', CONFIG.theme.primaryColor);
        root.style.setProperty('--accent-color', CONFIG.theme.accentColor);
        // Add more theme customization as needed
    }
    
    // Hide footer if disabled
    if (!CONFIG.features.showFooter) {
        const footer = document.querySelector('footer');
        if (footer) footer.style.display = 'none';
    }
    
    console.log(`${CONFIG.appName} v${CONFIG.version} loaded`);
});

