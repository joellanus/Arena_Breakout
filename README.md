# Arena Breakout Helper

A modern, offline HTML app for Arena Breakout. Includes a sleek helper, an interactive map tool, and a built‑in self‑update flow (no localhost/servers).

## Highlights

- Updater: checks `version.json` on main, downloads ZIP from CDN; fallback to GitHub Releases
- Interactive Map Tool: draw, pins, zoom, export
- Shipped Base Layers: curated pins per map loaded from `assets/maps/data/<map>.json` with category toggles
- Always‑on editing: right‑click to add/edit/move/delete pins and building labels; changes auto‑save
- Hover tooltip: enlarged label when hovering near a pin
- No server required; everything runs from the filesystem

## Getting Started

- Launch: double‑click `launch-helper.bat` (Chrome/Edge app window) or open `index.html`
- Update: click “⬇️ Check for Updates”, select the folder that contains `index.html` (your install folder)
- Maps: click the orange Maps button

## Repository Layout

```
/                     project root (open this folder in the updater)
├─ index.html         main helper UI
├─ map-tool.html      interactive map tool UI
├─ styles.css         global styles
├─ script.js          tabs + updater + shared helpers
├─ map-tool.js        map logic (drawing, pins, base layers, authoring)
├─ config.js          app configuration (version + update URLs)
├─ version.json       update manifest (current version)
├─ tools/
│  └─ release.ps1     build script → dist/*.zip and refresh manifest
├─ dist/
│  ├─ arena-breakout-helper-vX.Y.Z.zip
│  └─ latest.zip      symlink copy of the latest build (committed)
└─ assets/
   └─ maps/
      ├─ farm.png     shipped map image example
      └─ data/
         └─ farm.json shipped base pins + categories
```

## How Updates Work

- Manifest: `https://raw.githubusercontent.com/<OWNER>/<REPO>/main/version.json`
- ZIP (CDN): `https://cdn.jsdelivr.net/gh/<OWNER>/<REPO>@main/dist/latest.zip`
- The app fetches the manifest and only prompts if online version > local version (no downgrades)
- Download uses CDN with cache‑busting and falls back to GitHub Releases’ `latest/download/arena-breakout-helper.zip`

Troubleshooting updates:
- Always select the install folder (the folder that contains `index.html`)
- CDN can take ~1–2 minutes after a push; warm it by visiting the ZIP URL in a browser
- If a fetch fails, the alert shows attempted URLs

## Editing and Data

- Editing is always on: right‑click the map (empty) to add a pin/label; right‑click a pin to Edit/Move/Delete or adjust text sizes
- Hover/left‑click a pin to view title, notes, and image; use the inline editor to make changes
- Toggle Base Layers via chips: Keys, Spawns, Extracts, Buildings
- Auto‑save writes to `assets/maps/data/<map>.json`; set the Project Folder once in Settings

## Building and Publishing a Release

1) Bump version in `config.js` (e.g., to 1.2.5), or pass `-VersionOverride`

2) Build and refresh manifest:
```
./tools/release.ps1 -VersionOverride 1.2.5
```
This creates/updates:
- `dist/arena-breakout-helper-v1.2.5.zip`
- `dist/latest.zip`
- `version.json` with the new version

3) Commit and push:
```
git add -A
git commit -m "v1.2.5: description of changes"
git push
```
CDN propagation may take ~1–2 minutes.

Notes:
- `.gitignore` keeps `dist/` ignored except for `dist/latest.zip` which is committed for CDN delivery
- Update URLs live in `config.js` under `CONFIG.update`

## Map Editing (Always On)

- Left-click: inspect pins (hover also shows details)
- Right-click: context menu to Add/Edit/Move/Delete pins and building labels; adjust note/label size
- Layers: use the four chips to toggle Keys, Spawns, Extracts, and Buildings
- Auto-save: changes persist to `assets/maps/data/<map>.json` immediately (select the Project Folder once under Settings)

## Map Tool Quick Tips

- Tools: 1=Pin, 2=Draw, 3=Erase; Ctrl+S=Save, Ctrl+Z=Undo; ⟲ resets zoom
- Hover near a pin to see a large tooltip with its label
- Draft pins counter is displayed in the HUD while authoring

## Contributing

- Put new maps in `assets/maps/` and add JSON to `assets/maps/data/`
- Keep `README.md`, `DEVELOPMENT.md`, and `CHANGELOG.md` updated when you change flows

## License

Personal use permitted. Customize and share with your squad.

## Development

See `DEVELOPMENT.md` for workflows, checklists, and release steps.

