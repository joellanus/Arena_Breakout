# 🗺️ Interactive Map Tool Guide

Your personal tactical map planner for Arena Breakout!

## New in 1.2+

- Shipped Base Layers: curated pins per map from `assets/maps/data/<map>.json`
- Layer chips: show/hide Categories (Keys, Spawns, Extracts) and Buildings
- Inline editor and floating inspector; hover/click to view details

## New Workflow

- Editing is always enabled; no dev mode
- Right-click the map (empty space) to add a pin or building label
- Right-click a pin to Edit, Move, Delete, or adjust text sizes
- Hover or left-click a pin to view title, notes, and image
- Toggle layers via chips: 🔑 Keys, 📍 Spawns, 🚪 Extracts, 🏢 Buildings
- Settings → Set Project Folder once to avoid repeated prompts; stored in your browser

## Base Layers

- Base pins are read from `assets/maps/data/<slug>.json`
- Example schema:
```json
{
  "map": "Farm",
  "image": "assets/maps/farm.png",
  "categories": ["Keys", "Spawns", "Extracts"],
  "basePins": [
    { "x": 1234, "y": 890, "category": "Keys", "label": "Dorm Key" },
    { "x": 640,  "y": 512, "category": "Spawns", "label": "South Spawn" }
  ]
}
```
- Category toggles are persisted per map in `localStorage`

## Quick Start

1. Open Map Tool (orange button)
2. Load or use shipped map image
3. Select tools and start annotating

## Tools

### 📍 Add/Edit Pins
- Right-click empty space → choose a pin category (Keys, Spawns, Extracts, Loot, Vantage, Danger)
- Left-click a pin to open the Inspector → Edit to change title/notes, sizes, and image
- Right-click a pin to Move or Delete

**Pin Types:**
- ⚠️ **Danger Zone** (Red) - Enemy hotspots, dangerous areas
- 💎 **Loot** (Green) - Item spawns, resource locations
- 🚁 **Spawn Point** (Blue) - Your team spawn locations
- 🎯 **Objective** (Yellow) - Mission objectives, targets
- 🛡️ **Cover** (Purple) - Good cover positions
- 👁️ **Vantage Point** (Cyan) - Sniper spots, overwatch positions
- ⭐ **Custom** (White) - Anything else!

### ✏️ Draw
- Click and drag to draw freehand
- Perfect for planning routes or circling areas
- Customize color, brush size, and opacity
- Use different colors for different strategies

**Drawing Tips:**
- Draw arrows to show movement direction
- Circle dangerous choke points
- Outline safe paths
- Mark flanking routes

### 🧹 Erase
- Click and drag to erase drawings (not pins)
- Useful for cleaning up mistakes
- Adjust eraser size as needed

## Keyboard Shortcuts

- **1/2/3** - Optional drawing tools (Pin/Draw/Erase)
- **Ctrl+S** - Manual save (auto-saves anyway)
- **Ctrl+Z** - Undo last drawing stroke
- **+/-** - Zoom in/out (zoom buttons)

## Managing Your Pins

**In the sidebar:**
- See all your pins listed
- Click a pin to highlight it on the map
- Delete individual pins with the Delete button
- See pin count at the top

**Pin Notes:**
- Add tactical information: "Sniper watches this spot"
- Team coordination: "Alpha team takes this route"
- Reminders: "Check for loot here"
- Warnings: "Always check corners here"

## Drawing Settings

**Color** - Choose any color for your drawings  
**Brush Size** - 1-20px, adjust for detail vs bold lines  
**Opacity** - 10-100%, lower for subtle overlays  

**Strategy Ideas:**
- Red = Danger/Enemy positions
- Green = Safe routes
- Blue = Water/alternate paths
- Yellow = Objectives/attention needed
- Purple = Team positions

## Save & Export

**Auto-Save:**
- Your map saves automatically as you work
- Closes browser? No problem - it'll be there when you return
- Uses browser localStorage (nothing leaves your computer)

**Export as Image:**
- Click "Export as Image" to download
- Share with your squad
- Print for reference
- Keep multiple map versions

**Clear Options:**
- Clear Drawings - Removes all lines but keeps pins
- Clear All Pins - Removes all pins but keeps drawings
- Clear Map - Starts completely fresh

## Zoom Controls

**+ Button** - Zoom in for detail work  
**- Button** - Zoom out for overview  
**⟲ Button** - Reset to default zoom  

Great for examining specific areas or seeing the big picture!

## Pro Tips

### 1. Take Good Screenshots
- Use in-game map if available
- Capture at high resolution
- Take multiple screenshots for different areas
- Name them clearly (e.g., "north-sector.png")

### 2. Layer Your Information
- Use light opacity for background info
- Darker/brighter colors for important stuff
- Different colors for different mission types

### 3. Create Templates
- Mark permanent features (spawns, extractions)
- Export as base template
- Reload for each mission

### 4. Coordinate with Team
- Export and share before missions
- Use consistent color codes
- Add notes about player positions

### 5. Update After Missions
- Add new enemy positions you discovered
- Mark areas that were safe/dangerous
- Note loot locations
- Build your knowledge over time

## Example Use Cases

### 🎯 Mission Planning
1. Load map screenshot
2. Add objective pins
3. Draw primary and alternate routes
4. Mark known enemy positions
5. Add cover positions along route
6. Share with squad

### 🗺️ Map Learning
1. Start with blank map
2. Add pins as you discover locations
3. Note which areas are hot/cold
4. Build comprehensive knowledge
5. Refer back before matches

### 🎮 Solo Practice
1. Mark areas you want to explore
2. Set personal challenges
3. Track your usual death spots
4. Plan better approaches

### 👥 Squad Coordination
1. Draw team positions
2. Mark individual responsibilities
3. Plan flanking maneuvers
4. Show rally points
5. Export and share

## Troubleshooting

**Map won't load?**
- Check file format (PNG, JPG, WebP supported)
- Try a smaller file size (under 10MB)
- Make sure image isn't corrupted

**Can't draw?**
- Make sure you've selected a tool (1, 2, or 3)
- Check that you loaded a map first
- Try clicking the tool button again

**Pins disappeared?**
- Check if "Clear All Pins" was clicked
- Browser storage might be full
- Export regularly as backup

**Export not working?**
- Check browser permissions for downloads
- Try a different browser
- Make sure pop-ups aren't blocked

**Storage full?**
- Browser has ~5-10MB localStorage limit
- Export and clear old maps
- Use smaller image files

## Advanced: Multiple Maps

Want to manage multiple maps?

1. **Method 1: Export & Reload**
   - Work on one map, export it
   - Clear and load new map
   - Re-import old map when needed

2. **Method 2: Different Browsers**
   - Use Chrome for Map A
   - Use Firefox for Map B
   - Each has separate storage

3. **Method 3: Browser Profiles**
   - Create different Chrome profiles
   - Each profile = separate map storage
   - Switch between profiles as needed

## Privacy & Data

- **All local** - Nothing sent to any server
- **Browser only** - Stored in your browser's localStorage
- **No tracking** - Completely private
- **Your data** - Clear browser data to remove everything

## Get Creative!

The tool is flexible - use it however helps you:
- Draw memes on maps
- Create tactical masterpieces
- Mark your favorite camping spots
- Plan elaborate strategies
- Or just doodle while you think!

---

**Happy mapping!** 🗺️ Now go plan some epic strategies!

