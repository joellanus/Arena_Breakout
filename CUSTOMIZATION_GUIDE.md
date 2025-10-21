# Customization Guide

This guide will help you customize the Arena Breakout Helper to fit your exact needs.

## 📝 Quick Edits

### Changing Colors

Edit `styles.css` and find these color values:
- **Primary Blue**: `#0099ff` - Main buttons and highlights
- **Accent Blue**: `#00d4ff` - Text highlights and borders  
- **Background**: `#000000` - Main background (pure black)
- **Card Background**: `#1a1a1a` - Card backgrounds

Replace these values throughout the file to change the theme.

### Adding Keybinds

Open `index.html` and find the keybinds section. Add new keybinds using this template:

```html
<div class="keybind-item">
    <span class="key">YOUR_KEY</span>
    <span class="description">What it does</span>
</div>
```

**Example:**
```html
<div class="keybind-item">
    <span class="key">F</span>
    <span class="description">Use Item</span>
</div>
```

### Adding a New Category

To add a completely new keybind category:

```html
<div class="card">
    <h3>My Custom Category</h3>
    <div class="keybind-list">
        <div class="keybind-item">
            <span class="key">KEY</span>
            <span class="description">Description</span>
        </div>
        <!-- Add more keybinds here -->
    </div>
</div>
```

## 🗺️ Adding Maps

### Method 1: Simple Image

Replace the map placeholder in `index.html`:

```html
<div class="map-placeholder">
    <img src="assets/maps/my_map.png" alt="Game Map" 
         style="max-width: 100%; height: auto; border-radius: 8px;">
</div>
```

### Method 2: Multiple Maps with Gallery

```html
<div class="map-gallery">
    <div class="map-item">
        <h4>Main Map</h4>
        <img src="assets/maps/main.png" alt="Main Map">
    </div>
    <div class="map-item">
        <h4>Spawn Locations</h4>
        <img src="assets/maps/spawns.png" alt="Spawns">
    </div>
</div>
```

Add this CSS to `styles.css`:

```css
.map-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
}

.map-item img {
    width: 100%;
    height: auto;
    border-radius: 8px;
    border: 2px solid #2a2a2a;
}
```

## 🎯 Customizing Loadouts

Add new loadouts in the loadouts section:

```html
<div class="card loadout-card">
    <h3>🎯 Your Loadout Name</h3>
    <div class="loadout-details">
        <div class="loadout-item">
            <strong>Primary:</strong> Your weapon
        </div>
        <div class="loadout-item">
            <strong>Secondary:</strong> Your secondary
        </div>
        <div class="loadout-item">
            <strong>Gadget:</strong> Your gadget
        </div>
        <div class="loadout-item">
            <strong>Perk:</strong> Your perk
        </div>
    </div>
</div>
```

## 💡 Adding Tips

Add new tips to the tips section:

```html
<div class="card tip-card">
    <h3>💡 My Custom Tips</h3>
    <ul class="tip-list">
        <li>First tip here</li>
        <li>Second tip here</li>
        <li>Third tip here</li>
    </ul>
</div>
```

## 🔧 Advanced Customization

### Adding a New Tab

1. **Add tab button** in the header navigation:
```html
<button class="tab-btn" data-tab="mytab">My Tab</button>
```

2. **Add tab content** in the main section:
```html
<section class="tab-content" id="mytab">
    <h2>My Custom Tab</h2>
    <div class="grid">
        <!-- Your content here -->
    </div>
</section>
```

3. **Update keyboard shortcut** in `script.js`:
```javascript
const tabs = ['keybinds', 'maps', 'loadouts', 'tips', 'mytab'];
```

### Adding a Timer

Add this to `script.js`:

```javascript
let timerSeconds = 0;
let timerInterval;

function startTimer() {
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timerSeconds / 60);
    const seconds = timerSeconds % 60;
    console.log(`${minutes}:${seconds.toString().padStart(2, '0')}`);
}
```

### Adding a Notes System

Add to HTML:
```html
<div class="card">
    <h3>Quick Notes</h3>
    <textarea id="gameNotes" placeholder="Type your notes here..."></textarea>
</div>
```

Add to CSS:
```css
#gameNotes {
    width: 100%;
    min-height: 200px;
    background: #0a0a0a;
    color: #fff;
    border: 2px solid #2a2a2a;
    border-radius: 8px;
    padding: 1rem;
    font-family: inherit;
    resize: vertical;
}
```

Add to JavaScript:
```javascript
// Auto-save notes to localStorage
const notesArea = document.getElementById('gameNotes');
notesArea.value = localStorage.getItem('gameNotes') || '';
notesArea.addEventListener('input', () => {
    localStorage.setItem('gameNotes', notesArea.value);
});
```

## 🎨 Theme Presets

### Red Theme
Replace blues with reds in `styles.css`:
- `#0099ff` → `#ff0040`
- `#00d4ff` → `#ff4466`

### Green Theme
Replace blues with greens:
- `#0099ff` → `#00ff88`
- `#00d4ff` → `#00ffaa`

### Purple Theme
Replace blues with purples:
- `#0099ff` → `#9933ff`
- `#00d4ff` → `#bb55ff`

## 📱 Window Positioning

### For 4K Monitor (3840x2160) with Game in 2K (2560x1440)

**Option 1: Below Game**
- Browser window: 3840px × 720px
- Position: Bottom of screen

**Option 2: Left Side**
- Browser window: 1280px × 2160px
- Position: Left side of screen

### Creating Perfect Window Size (Chrome)

1. Press F12 to open DevTools
2. Click the device toolbar button (or Ctrl+Shift+M)
3. Select "Responsive" 
4. Enter custom dimensions
5. Press F11 for fullscreen

## 🚀 Performance Tips

1. **Optimize Images**: Compress map images before adding them
2. **Remove Unused Sections**: Delete tabs you don't need
3. **Disable Animations**: Set `enableAnimations: false` in `config.js`
4. **Use Hardware Acceleration**: Enable in browser settings

## 📦 Creating a Standalone App

### Using Electron (Advanced)

1. Install Node.js
2. Run: `npm install electron --save-dev`
3. Create `main.js` for Electron
4. Package with `electron-packager`

### Using NW.js (Alternative)

Similar to Electron but simpler:
1. Download NW.js
2. Create `package.json`
3. Run with NW.js

## 🔍 Troubleshooting

**Images not loading?**
- Check file paths are correct
- Use forward slashes: `assets/maps/image.png`
- Make sure images are in the right folder

**Styling looks broken?**
- Clear browser cache (Ctrl+F5)
- Check for typos in CSS
- Validate HTML syntax

**Tabs not working?**
- Check browser console (F12) for errors
- Ensure `script.js` is loaded
- Verify tab IDs match data-tab attributes

---

Need more help? Check the main README.md or the inline comments in the code!

## Shipped Maps & Base Pins

- Place map images in `assets/maps/` (e.g., `assets/maps/farm.png`)
- Place map data JSON in `assets/maps/data/` (e.g., `assets/maps/data/farm.json`)
- Use the map tool’s right-click editing to curate pins/labels and auto-save JSON
- Commit and push the JSON and images to ship to everyone

