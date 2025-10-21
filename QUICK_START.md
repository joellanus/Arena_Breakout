# 🚀 Quick Start Guide

Get your Arena Breakout Helper running in under 2 minutes!

## Option 1: Double-Click (Easiest)

1. **Double-click `launch-helper.bat`**
   - Opens in a clean borderless window
   - Automatically finds Chrome or Edge
   
2. **Position the window**
   - Drag it below or beside your game window
   - Resize as needed

3. **You're done!** Start playing with quick keybind reference

## Option 2: Manual Browser

1. **Right-click `index.html`**
2. **Select "Open with" → Your favorite browser**
3. **Press F11 for fullscreen** (press F11 or Esc to exit)
4. **Position as needed**

## Tips for Best Experience

### Perfect Positioning for 4K Monitor

**If your game is in the top-left (2560×1440):**
- Position helper below the game
- Use browser width: 2560px or full width
- Height: ~700px

**If your game is centered:**
- Position helper on the left or right side
- Width: ~1280px
- Full height

### Make it Always-on-Top

**Chrome/Edge:**
1. Install "Always On Top" extension from web store
2. Click the extension icon on the helper window
3. Helper will now stay above everything

**Alternative:**
- Use free tool like "DeskPins" (Google it)
- Pin the window to stay on top

### Keyboard Shortcuts

Once the helper is open:
- **Alt + 1**: Keybinds tab
- **Alt + 2**: Maps (opens Map Tool)
- **F11**: Toggle fullscreen

### Editing Maps Quickly

- Open Map Tool → Settings → "Set Project Folder" (once)
- Right-click the map to add pins/labels; hover or left-click to view details
- Four layer chips toggle visibility: Keys, Spawns, Extracts, Buildings
- Changes auto-save to the project folder

## Next Steps

1. ✅ **Try the Interactive Map Tool** - Click the orange button! Draw routes, add pins, plan strategies
2. ✅ **Customize keybinds** - Edit `index.html` to match your actual game controls
3. ✅ **Add maps** - Take screenshots and use the Interactive Map Tool to annotate them
4. ✅ **Personalize loadouts** - Update with your favorite builds
5. ✅ **Check examples** - Open `examples.html` for advanced features like timers and notes

## 🗺️ Interactive Map Tool (NEW!)

The **Interactive Map Tool** is a game-changer! Access it from the main helper (orange button).

**What you can do:**
- 📍 Add pins (7 types: Danger, Loot, Spawn, Objective, Cover, Vantage, Custom)
- ✏️ Draw routes and mark areas
- 📝 Add notes to each pin
- 💾 Auto-saves everything
- 📥 Export annotated maps

**Perfect for:**
- Planning attack routes before missions
- Marking dangerous zones
- Coordinating with your squad
- Learning map layouts
- Building your tactical knowledge

See `MAP_TOOL_GUIDE.md` for detailed instructions!

## Update Button

- Click “⬇️ Check for Updates” in the header
- Select the install folder (the folder that contains `index.html`)
- The app downloads and extracts the latest ZIP
- If CDN is slow, wait ~1–2 minutes or open the ZIP URL once in your browser

## File Overview

```
arena breakpoint/
├── index.html              ← Main helper (open this!)
├── map-tool.html           ← Interactive Map Tool (NEW!)
├── map-tool.js             ← Map tool functionality
├── launch-helper.bat       ← Quick launcher
├── styles.css              ← Colors and design
├── script.js               ← Interactivity
├── examples.html           ← Extra features to copy
├── config.js               ← Easy customization
├── README.md               ← Full documentation
├── QUICK_START.md          ← This file
├── MAP_TOOL_GUIDE.md       ← Map tool instructions (NEW!)
├── CUSTOMIZATION_GUIDE.md  ← How to customize
└── assets/
    └── maps/               ← Put map screenshots here
```

## Common Questions

**Q: Can I change the colors?**  
A: Yes! Edit `styles.css` - look for `#0099ff` (blue) and replace with your color.

**Q: Can I add my own sections?**  
A: Absolutely! Check `CUSTOMIZATION_GUIDE.md` for detailed instructions.

**Q: Will this work with other games?**  
A: Yes! Just customize the content for any game you want.

**Q: Can I share this with friends?**  
A: Sure! Just zip the folder and send it to them.

## Need Help?

1. Check `README.md` for full documentation
2. Look at `CUSTOMIZATION_GUIDE.md` for customization help
3. Open `examples.html` for code samples
4. View the source code - it's heavily commented!

---

**Ready to play?** Open the helper and start gaming! 🎮

