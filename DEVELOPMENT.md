# Development

This guide keeps the project workflow consistent and discoverable without chat context.

## Current UX (v1.2.x)

- Editing is always available; no dev mode
- Right-click context menu handles add/edit/move/delete and size adjustments
- Four chips toggle base layers: Keys, Spawns, Extracts, Buildings
- Project folder is stored in the browser (IndexedDB); set it once in Settings

## Versioning & Releases

- Bump version in `config.js` (CONFIG.version) and run `./tools/release.ps1`
- `release.ps1` updates `version.json` and `dist/latest.zip`
- Commit `version.json` and `dist/latest.zip`, push to main
- Updater reads `version.json` and downloads `dist/latest.zip`

## Map Tool Architecture (quick)

- UI: `map-tool.html`, shared styles in `styles.css`
- Runtime: `map-tool.js`
  - Canvas render: base map, buildings, base pins, drawings, user pins, draft pins
  - Pins:
    - Base pins: from `assets/maps/data/<slug>.json`
    - User pins: in-memory + localStorage under `mapToolData:<Map>`
    - Draft base pins/buildings: authoring; export to JSON if project folder set
  - Visibility:
    - `visibleBaseCategories` (Keys/Spawns/Extracts) and `showBuildings`
    - Chips update localStorage key `mapTool:visibleCats:<Map>`
  - Hover/Click:
    - Canvas-based hit test; 64px radius; filters respect visibility
    - Tooltip follows cursor; click toggles hold
  - Context Menu:
    - Add Keys/Spawns/Extracts/Building Label; Edit/Move/Delete; size +/−
  - Editor/Inspector:
    - Edit updates user pin `label/note/image` (not `type`), preserves category
    - Attach image uses hidden input; writes under `assets/maps/images/`
  - Persistence:
    - Auto-save on every change; includes `draftBasePins` and `draftBuildings`
    - `beforeunload` saves local state

## Known Items / Follow-ups

- Verify image attach on user pins persists across reload for all browsers
- Consider caching project-folder handle permission state more explicitly
- Validate emoji fonts across platforms; provide SVG fallback if needed