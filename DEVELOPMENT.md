# Development

This guide keeps the project workflow consistent and discoverable without chat context.

## Daily Workflow

- Pull latest: `git pull`
- Run locally by opening `index.html` or `launch-helper.bat`
- For Maps: use Map Tool → dev mode Ctrl+Shift+D for Author Mode
- Keep docs updated as you change flows (README, Map Tool Guide, Changelog)

## Versioning & Releases

- Bump version in `config.js` or use `tools/release.ps1 -VersionOverride X.Y.Z`
- Build: `./tools/release.ps1 -VersionOverride X.Y.Z`
  - Updates `version.json`
  - Creates `dist/arena-breakout-helper-vX.Y.Z.zip` and updates `dist/latest.zip`
- Commit & push:
```
git add -A
git commit -m "vX.Y.Z: summary"
git push
```
- CDN propagation: wait ~1–2 minutes (warm `https://cdn.jsdelivr.net/gh/<OWNER>/<REPO>@main/dist/latest.zip`)

## Updater URLs

- Manifest: `raw.githubusercontent.com/<OWNER>/<REPO>/main/version.json`
- ZIP (primary): `cdn.jsdelivr.net/gh/<OWNER>/<REPO>@main/dist/latest.zip`
- ZIP fallback: GitHub Releases `latest/download/arena-breakout-helper.zip`

## Authoring Base Pins

- Toggle dev mode: Ctrl+Shift+D → Author Mode
- Pick category → Pin tool → click map → enter label
- “Draft pins: N” shows placements
- Export JSON → select project folder → writes `assets/maps/data/<slug>.json`
- Commit JSON + any images in `assets/maps/`

## Checklists

Release checklist:
- [ ] Version bumped in `config.js` (or via release script)
- [ ] `version.json` updated
- [ ] `dist/latest.zip` committed
- [ ] README/Guides updated if UX changed
- [ ] CHANGELOG entry added

Docs checklist:
- [ ] README layout/flow current
- [ ] Map Tool Guide reflects authoring and hover tooltips
- [ ] Customization mentions shipped maps + data locations
- [ ] Quick Start includes update button instructions

## Notes

- `.gitignore` allows `dist/latest.zip` to be committed; other zips ignored
- Updater requires selecting the install folder (contains `index.html`)
- Use Ctrl+Shift+D only for development. Author UI remains hidden for users
