# Changelog

## 1.3.2
- Cursor tool flow: hover/click only in cursor mode; auto-return after adding a pin
- Reliable tooltips under zoom/pan; click-to-toggle sticky details
- Base Layers panel always visible; new 🏢 Building Names layer
- Building labels: authoring controls (add/clear), export merges into JSON
- UI polish: presets row (Keys/Spawns/Extracts/Buildings), context menu actions

## 1.2.4
- Updater: improved error messages, user-gesture fix (picker first), CDN fallback
- Authoring: auto-switch to Pin tool when enabling Author Mode

## 1.2.3
- Authoring draft pins drawn on top with glow and emoji; draft counter HUD

## 1.2.2
- Updater: CDN cache-busting and GitHub Releases fallback

## 1.2.1
- Added pin types: 🔑 Keys and 🚪 Extracts

## 1.2.0
- Shipped map support (assets/maps/*)
- Base layers with category toggles (assets/maps/data/<slug>.json)
- Author Mode for base pins + JSON export (dev only)

## 1.1.0
- First public update manifest/zip pipeline

## 1.0.0
- Initial helper + map tool

## 1.2.x (Map UX Cleanup)
- Always-on editing; removed dev mode and author toggle
- Right-click context menu for add/edit/move/delete; size adjustments
- Hover/left-click pin details with larger text
- Simplified layer controls to four toggle chips
- Persist project folder selection in IndexedDB; no repeated prompts

## 1.2.5 (in dev)
- Hover details: robust canvas-space hit test; click to lock
- User pins use emoji icons: 🔑 Keys, ⬇️ Spawns, ⬆️ Extracts
- Buildings render text-only labels (no dot); Buildings toggle controls all
- Layer chip state sync after render; fewer "all black" glitches
- Context menu simplified: Add Keys/Spawns/Extracts/Building Label only
- Size +/− actions keep menu open; clamp 10–48px
- Auto-save on every change and on unload; local restore of drafts
- Draft base pins and building labels persist in localStorage
- Image attach from editor writes to the edited pin; no extra prompts
- Quiet project folder handling; export runs only if already set