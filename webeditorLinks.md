# Web Editor migration log

Maintainer workflow (CORS server, batch sync, validation): [docs/web-editor/batch-sync.md](docs/web-editor/batch-sync.md)

Several examples link to the p5 Web Editor so users can edit starter sketches and host code for phones. This file records sketch IDs and verification status. Update it after every migration batch.

## Migration log

## Verified on phone

| Catalog id | Title | Web Editor | Full preview | Notes |
| --- | --- | --- | --- | --- |
| haptic-feedback | Haptic Feedback | https://editor.p5js.org/npuckett/sketches/jolA5eA_M | https://editor.p5js.org/npuckett/full/jolA5eA_M | Updated from local files with p5 2.2.3 and p5-phone 1.10.0; user confirmed phone test works. |

## Created and browser verified

These sketches were created under `npuckett`, loaded in public full-preview pages, and verified for canvas creation, `p5@2.2.3`, `p5-phone@1.11.0`, and no runtime/page errors in browser smoke testing. Existing hosted HTML files were updated to `p5-phone@1.11.0` on 2026-06-02.

**2026-06-08:** Local examples and `webeditor/projects/` export pins updated to `p5-phone@1.12.0`. Run `npm run sync:webeditor` after `npx p5-webeditor-sync login` to push updates to the sketches below.

| Catalog id | Title | Web Editor | Full preview | Replaces |
| --- | --- | --- | --- | --- |
| blank-template | Blank Template | https://editor.p5js.org/npuckett/sketches/X9JmobuuM | https://editor.p5js.org/npuckett/full/X9JmobuuM | https://editor.p5js.org/creationcomputation/sketches/R-c_HpeUg |
| touch-basic | Basic Touch | https://editor.p5js.org/npuckett/sketches/kfcPPs1a3 | https://editor.p5js.org/npuckett/full/kfcPPs1a3 | https://editor.p5js.org/creationcomputation/sketches/zIRMsYKRN |
| touch-zones | Touch Zones | https://editor.p5js.org/npuckett/sketches/lZWVCIGVoD | https://editor.p5js.org/npuckett/full/lZWVCIGVoD | https://editor.p5js.org/creationcomputation/sketches/PkhKKZWMC |
| touch-count | Touch Count | https://editor.p5js.org/npuckett/sketches/dWJJTZ9qEh | https://editor.p5js.org/npuckett/full/dWJJTZ9qEh | https://editor.p5js.org/creationcomputation/sketches/g-9HeBb8B |
| touch-distance | Touch Distance | https://editor.p5js.org/npuckett/sketches/5HUoDmiyG | https://editor.p5js.org/npuckett/full/5HUoDmiyG | https://editor.p5js.org/creationcomputation/sketches/s6icb8y_o |
| touch-angle | Touch Angle | https://editor.p5js.org/npuckett/sketches/M6N0chnCq | https://editor.p5js.org/npuckett/full/M6N0chnCq | https://editor.p5js.org/creationcomputation/sketches/IPYIo8_FV |
| orientation-basic | Orientation | https://editor.p5js.org/npuckett/sketches/-_pUgcYmW | https://editor.p5js.org/npuckett/full/-_pUgcYmW | https://editor.p5js.org/creationcomputation/sketches/Sf_um9wYw |
| rotational-velocity | Rotational Velocity | https://editor.p5js.org/npuckett/sketches/fij6LZwPQ | https://editor.p5js.org/npuckett/full/fij6LZwPQ | https://editor.p5js.org/creationcomputation/sketches/IDSid9rOX |
| acceleration | Acceleration | https://editor.p5js.org/npuckett/sketches/AsM63da8sJ | https://editor.p5js.org/npuckett/full/AsM63da8sJ | https://editor.p5js.org/creationcomputation/sketches/xaxOYgK9q |
| device-shaken | Device Shaken | https://editor.p5js.org/npuckett/sketches/FgraGpDkn | https://editor.p5js.org/npuckett/full/FgraGpDkn | New link |
| device-moved | Device Moved | https://editor.p5js.org/npuckett/sketches/0UdVXvdcN | https://editor.p5js.org/npuckett/full/0UdVXvdcN | New link |
| device-orientation | Device Orientation | https://editor.p5js.org/npuckett/sketches/ayDVWysQ2 | https://editor.p5js.org/npuckett/full/ayDVWysQ2 | New link |
| combined-permissions | Combined Permissions | https://editor.p5js.org/npuckett/sketches/GgquhEnKv | https://editor.p5js.org/npuckett/full/GgquhEnKv | New link for `enablePermissionsTap(['sensors', 'mic'])`; created with `p5-phone@1.11.0`. |
| torch-touch-toggle | Torch Touch Toggle | https://editor.p5js.org/npuckett/sketches/6bBT4VeRa | https://editor.p5js.org/npuckett/full/6bBT4VeRa | New link; uses npm-hosted `p5-phone@1.11.0`. |
| torch-disco | Torch Disco | https://editor.p5js.org/npuckett/sketches/049BpqM9K | https://editor.p5js.org/npuckett/full/049BpqM9K | New link; uses `enablePermissionsTap(['torch', 'vibration'])` with slow flashlight pulses. |
| shake-torch-toggle | Shake Torch Toggle | https://editor.p5js.org/npuckett/sketches/OH_hsgddL | https://editor.p5js.org/npuckett/full/OH_hsgddL | New link; uses `enablePermissionsTap(['sensors', 'torch'])`. |
| mic-level | Microphone Level | https://editor.p5js.org/npuckett/sketches/fuWalYu-L | https://editor.p5js.org/npuckett/full/fuWalYu-L | https://editor.p5js.org/creationcomputation/sketches/ySuEk7s6- |
| speech-recognition | Speech Recognition | https://editor.p5js.org/npuckett/sketches/kMjBzPtoYL | https://editor.p5js.org/npuckett/full/kMjBzPtoYL | New link |
| sound-basic | Sound Basic | https://editor.p5js.org/npuckett/sketches/x8Mix5h19D | https://editor.p5js.org/npuckett/full/x8Mix5h19D | New generated-sound link; no tracks/loadSound asset dependency. |
| volume-touches | Volume by Touches | https://editor.p5js.org/npuckett/sketches/bfJNTE16Ni | https://editor.p5js.org/npuckett/full/bfJNTE16Ni | New generated-sound link; no tracks/loadSound asset dependency. |
| motion-synth | Motion Synth | https://editor.p5js.org/npuckett/sketches/i17rxtwHM | https://editor.p5js.org/npuckett/full/i17rxtwHM | New generated-sound link; no tracks/loadSound asset dependency. |
| ui-banner | Banner Permission Style | https://editor.p5js.org/npuckett/sketches/cE3a0kZPa | https://editor.p5js.org/npuckett/full/cE3a0kZPa | New link. |
| ui-canvas | Canvas Permission Style | https://editor.p5js.org/npuckett/sketches/5IwCEIxI- | https://editor.p5js.org/npuckett/full/5IwCEIxI- | New link; sketch updated to use published `enableGyroCanvas()` API. |
| ui-custom-element | Custom Element Permission Style | https://editor.p5js.org/npuckett/sketches/dzTJBBH_94 | https://editor.p5js.org/npuckett/full/dzTJBBH_94 | New link; sketch updated to use published `enableGyroOn()` API. |
| ml5-bodypose-phone | PHONE BodyPose Two Points | https://editor.p5js.org/npuckett/sketches/hXHfWAYSN | https://editor.p5js.org/npuckett/full/hXHfWAYSN | Updated 2026-06-02 with `p5-phone@1.11.0`, ml5 loaded-callback startup, and direct video drawing fix. |
| ml5-facemesh-phone | PHONE FaceMesh Two Points | https://editor.p5js.org/npuckett/sketches/DLnD9LIMG | https://editor.p5js.org/npuckett/full/DLnD9LIMG | Updated 2026-06-02 with `p5-phone@1.11.0`, ml5 loaded-callback startup, and direct video drawing fix. |
| ml5-handpose-phone | PHONE HandPose Two Points | https://editor.p5js.org/npuckett/sketches/aBF5_M0jN3 | https://editor.p5js.org/npuckett/full/aBF5_M0jN3 | Updated 2026-06-02 with `p5-phone@1.11.0`, ml5 loaded-callback startup, direct video drawing fix, and camera toggle. |
| gaze-detector | Gaze Detector Class | https://editor.p5js.org/npuckett/sketches/y3aGKwPIx_ | https://editor.p5js.org/npuckett/full/y3aGKwPIx_ | Updated 2026-06-02 with `p5-phone@1.11.0`, `GazeDetector.js` ml5 loaded-callback startup, and direct video drawing fix. |
| three-bodypose | THREE BodyPose Two Points | https://editor.p5js.org/npuckett/sketches/L-ch91hH8 | https://editor.p5js.org/npuckett/full/L-ch91hH8 | New link; includes `functions.js`, Three.js, p5 2 compatibility shim, and ml5 preload-counter polyfill. Camera permission denial ignored in browser smoke test. |
| three-facemesh | THREE FaceMesh Two Points | https://editor.p5js.org/npuckett/sketches/Olii4GsA6 | https://editor.p5js.org/npuckett/full/Olii4GsA6 | New link; includes `functions.js`, Three.js, p5 2 compatibility shim, and ml5 preload-counter polyfill. Camera permission denial ignored in browser smoke test. |
| three-handpose | THREE HandPose Two Points | https://editor.p5js.org/npuckett/sketches/El8kyGBLL | https://editor.p5js.org/npuckett/full/El8kyGBLL | New link; includes `functions.js`, Three.js, p5 2 compatibility shim, and ml5 preload-counter polyfill. Camera permission denial ignored in browser smoke test. |

## Created with assets pending

These sketches were created under `npuckett` with `index.html`, `sketch.js`, and an empty `gifs/` folder. The code references the filenames below; upload those files into each Web Editor project's `gifs/` folder before treating the full preview as complete. **GIF binaries are not in the git repo** — source them locally or from the original asset collection, then upload via the Web Editor file panel.

| Catalog id | Title | Web Editor | Full preview | Asset to upload |
| --- | --- | --- | --- | --- |
| gif-fetch | Phone and GIF Fetch | https://editor.p5js.org/npuckett/sketches/iFWnkkrpK | https://editor.p5js.org/npuckett/full/iFWnkkrpK | `gifs/corgiswimflip.gif` |
| gif-collision | Phone and GIF Collision | https://editor.p5js.org/npuckett/sketches/hYTeGTQFO | https://editor.p5js.org/npuckett/full/hYTeGTQFO | `gifs/spaceSuit2.png` |
| gif-fly | Phone and GIF Fly | https://editor.p5js.org/npuckett/sketches/9QJ58vzOU | https://editor.p5js.org/npuckett/full/9QJ58vzOU | `gifs/comparison.gif` |
| gif-roll | Phone and GIF Roll | https://editor.p5js.org/npuckett/sketches/FgHXAZajKF | https://editor.p5js.org/npuckett/full/FgHXAZajKF | `gifs/how-penciles-are-made.gif` |

## Not migrated

NFC examples are intentionally not linked to p5 Web Editor. Even the Web Editor full-page preview is contained inside a frame, which blocks Web NFC; host these examples directly on an HTTPS server instead.

| Catalog id | Title | Reason |
| --- | --- | --- |
| nfc-tag-identifier | NFC Tag Identifier | Requires direct HTTPS hosting; do not add a p5 Web Editor link. |
| nfc-two-tag-effects | Two Tag Effects | Requires direct HTTPS hosting; do not add a p5 Web Editor link. |
| ux-compare | UX Compare Index | This is a multi-page reference index whose buttons point to external hosted demos, not a single editable p5 Web Editor sketch. |


