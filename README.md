# SIMFLAT

Browser driving sim (BMW 116d / M140i). Serve the folder (e.g. `python3 -m http.server`) and open `index.html`.

- `camera.js` – chase / free / cinematic cameras (visual only). C = mode, V = next cinematic shot, 1-7 = pick shot, R = reset view, B = letterbox, H = hide HUD. Drag = look, right-drag/shift-drag = pan, wheel = zoom, double-click = reset. Touch: one finger look, two fingers pan + pinch.
- `world.js` – 3 km x 3 km UK-style car park (2.5 x 4.8 m bays, 6 m aisles, 7 m roads every 250 m, STOP / give-way junctions, zebra crossings).
- Driving physics are unchanged; the only physics-file change is that the boundary wall is now at +-1500 m (`HW`).
