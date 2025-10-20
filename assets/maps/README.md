# Maps Folder

Place your Arena Breakout map screenshots here.

## How to Add Maps

1. **Take Screenshots**: While playing, capture screenshots of maps (usually with F12 or Print Screen)
2. **Save Here**: Place the images in this folder
3. **Supported Formats**: PNG, JPG, WEBP, GIF
4. **Recommended Size**: 1920x1080 or larger for best quality

## Naming Convention

Use descriptive names for your maps:
- `map_overview.png`
- `spawn_locations.png`
- `objective_alpha.png`
- `extraction_points.png`

## Adding to the Helper

Edit the `index.html` file and replace the map placeholder with:

```html
<div class="map-placeholder">
    <img src="assets/maps/your_map_name.png" alt="Map Name" style="max-width: 100%; height: auto; border-radius: 8px;">
</div>
```

Or add multiple maps:

```html
<div class="map-gallery">
    <img src="assets/maps/map1.png" alt="Map 1">
    <img src="assets/maps/map2.png" alt="Map 2">
    <img src="assets/maps/map3.png" alt="Map 3">
</div>
```

## Tips

- Use descriptive alt text for accessibility
- Compress large images to improve loading speed
- Consider creating annotated maps with markers for key locations
- You can use tools like Paint.NET or GIMP to add annotations

