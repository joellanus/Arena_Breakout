# Arena Breakout Helper

A sleek, modern overlay helper for Arena Breakout designed to fit perfectly on your 4K monitor while running the game in 2K resolution.

## Features

- **Clean Black Theme**: Matches your desktop for a seamless look
- **Tabbed Interface**: Easy navigation between different sections
- **Keybinds Reference**: Quick access to all game controls
- **Maps & Locations**: Visual reference for map layouts and key locations
- **Interactive Map Tool**: 🗺️ Draw routes, add pins with notes, plan strategies! (NEW!)
- **Recommended Loadouts**: Pre-configured loadouts for different playstyles
- **Tips & Tricks**: Helpful advice for improving your gameplay
- **Extra Features**: Timer, notes, checklist, stats tracker (see examples.html)

## How to Use

### Quick Start
1. Open `index.html` in your web browser
2. Position the browser window underneath or beside your game
3. Press F11 for fullscreen mode (exit with F11 or Esc)
4. Switch between tabs to access different information

### Keyboard Shortcuts
- **Alt + 1**: Keybinds tab
- **Alt + 2**: Maps tab
- **Alt + 3**: Loadouts tab
- **Alt + 4**: Tips & Tricks tab
- **F11**: Toggle fullscreen

## Customization

### Adding Your Own Content

#### To Add Keybinds:
Edit the `index.html` file and add new keybind items in the keybinds section:
```html
<div class="keybind-item">
    <span class="key">YOUR_KEY</span>
    <span class="description">Your Description</span>
</div>
```

#### To Add Maps:
1. Take screenshots of your game maps
2. Save them in the project folder
3. Add them to the Maps section in `index.html`

#### To Customize Colors:
Edit `styles.css` and change the color values:
- Primary color: `#0099ff`
- Accent color: `#00d4ff`
- Background: `#000000`

### Advanced: Create a Desktop Shortcut

**Windows:**
1. Right-click on `index.html`
2. Select "Create shortcut"
3. Right-click the shortcut → Properties
4. In "Target" field, add your browser path before the file path:
   ```
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --app="file:///G:/My Drive/black/programming/project breakpoint/index.html"
   ```
5. Click "Change Icon" to set a custom icon (optional)

### Optional: Make it Always-on-Top

For Chrome/Edge:
- Install an extension like "Always On Top" from the web store
- Use the extension to keep the helper window always visible

## Browser Recommendations

- **Chrome/Edge**: Best performance and modern features
- **Firefox**: Good alternative with solid performance
- **Opera GX**: Great for gamers with built-in features

## Future Enhancements

You can easily extend this helper with:
- Mission timers
- Note-taking system
- Screenshot gallery for maps
- Custom keybind editor
- Progress tracker
- Stats calculator

## Positioning Tips

For a 4K monitor (3840x2160) running the game in 2K (2560x1440):
- **Left Side**: 1280px of extra horizontal space
- **Bottom**: 720px of extra vertical space

Recommended browser window sizes:
- **Below game**: Full width (3840px) × 720px height
- **Left side**: 1280px width × Full height (2160px)

## Troubleshooting

**Issue**: Colors don't look right
- Make sure you're viewing in a modern browser (Chrome, Firefox, Edge)
- Check if hardware acceleration is enabled

**Issue**: Window won't stay on top
- Use an "Always on Top" browser extension
- Or use a third-party tool like "DeskPins" or "AutoHotkey"

## License

Free to use and modify for personal use. Customize it to fit your needs!

---

**Version**: 1.0  
**Created**: 2025  
**Game**: Arena Breakout

