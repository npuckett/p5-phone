# p5 Web Editor Migration Workflow

This document records the repeatable method for updating p5-phone example links to p5 Web Editor projects in batches.

Use this workflow when local examples have changed, existing Web Editor links are stale, or a new release needs public editable sketches under the `npuckett` account.

## Goals

- Create or update p5 Web Editor sketches from the current local example files.
- Keep each Web Editor project public and owned by `npuckett`.
- Verify public full-preview pages before adding links to the homepage catalog.
- Record every migrated link, replaced URL, and known manual follow-up in `webeditorLinks.md`.
- Leave examples without a trustworthy preview out of the verified section until the issue is fixed.

## Required State

- The browser is logged in to p5 Web Editor as `npuckett`.
- The local docs/dev server is running, usually at `http://localhost:8765`.
- A temporary CORS file server can serve the repo root to the browser:

```bash
npx http-server . -p 8876 --cors -c-1
```

Stop this server after the batch is finished.

## Batch Selection

Work in small batches grouped by dependency shape:

- Basic p5-phone examples: `index.html` and `sketch.js` only.
- Sound/mic examples: confirm `p5.sound@0.3.0` and no stale `tracks/` or `loadSound()` dependency unless assets will be uploaded.
- ML5 examples: include helper files such as `GazeDetector.js` or `functions.js`.
- GIF examples: create code-only projects with an empty `gifs/` folder when assets will be uploaded manually.
- Multi-page index pages: decide whether they belong in Web Editor at all before migrating.

Before creating a batch, inventory missing or stale catalog links from `examples/homepage/scripts/examples-data.js` and confirm each local folder has the files needed for Web Editor.

## Web Editor API Shape

The authenticated Web Editor page can call these endpoints from `page.evaluate()`:

- `GET /editor/session`
- `GET /editor/{username}/projects/{projectIdOrSlug}`
- `POST /editor/projects`
- `PUT /editor/projects/{projectId}`

Project payloads use a flat `files` array. The root folder has `children` containing file IDs. Typical files:

- `root` folder
- `index.html`
- `sketch.js`
- optional `style.css`
- optional helper files such as `GazeDetector.js` or `functions.js`
- optional empty asset folder such as `gifs`

The public URLs are:

```text
https://editor.p5js.org/npuckett/sketches/{projectId}
https://editor.p5js.org/npuckett/full/{projectId}
```

## Creation Steps

1. Start the CORS file server from the repo root.
2. In the logged-in Web Editor browser page, fetch local files from `http://127.0.0.1:8876/...`.
3. Build a project payload with `visibility: 'Public'`.
4. `POST /editor/projects` for new sketches, or `PUT /editor/projects/{projectId}` when updating an existing sketch.
5. Record the returned project ID, sketch URL, and full-preview URL.
6. Confirm saved file contents contain the expected dependency strings, such as `p5@2.2.3`, `p5-phone@1.9.2`, `p5.js-compatibility@0.2.0`, `p5.sound@0.3.0`, `ml5@1`, or `three@0.160.0`.

Do not patch the homepage catalog until the public full preview has been smoke-tested.

## Preview Verification

Open each full-preview URL and inspect the nested sketch frame. The sketch frame is usually a `blob:https://preview.p5js.org/...` iframe.

For each preview, verify:

- A canvas or expected primary DOM surface exists.
- Expected scripts are present.
- No page errors or unexpected console errors occurred.
- No bad responses occurred, excluding analytics, favicon, and Cloudflare RUM noise.
- Sound examples do not request stale `tracks/` files unless the asset is intentionally pending.
- GIF code-only examples are not listed as fully verified until assets have been uploaded.

`lockGestures()` commonly triggers beforeunload dialogs while moving between previews. Accept them and continue.

For camera examples, desktop browser automation may deny camera permission. Treat that as expected only if the preview otherwise loads the app surface, scripts, helper files, and canvas/video without unrelated runtime errors.

## Catalog Updates

After previews pass, update `examples/homepage/scripts/examples-data.js`:

- Replace stale `creationcomputation` URLs with verified `npuckett` URLs.
- Add missing `webEditor` fields to verified entries.
- Keep `p5` compatibility labels accurate.
- Do not add a verified `webEditor` link for a project that still needs asset uploads or has unresolved runtime errors unless the project is intentionally code-only and documented.

After patching, load the local homepage and query `window.P5PHONE_EXAMPLES` plus rendered anchors to confirm every expected `webEditor` URL is present.

## Migration Log Updates

Update `webeditorLinks.md` every batch.

Use these sections consistently:

- `Verified on phone`: user-confirmed phone tests.
- `Created and browser verified`: full-preview smoke tests passed in browser.
- `Created with assets pending`: project exists, but assets still need manual upload.
- `Not migrated`: explain intentional skips, such as multi-page external indexes.

For each row, include catalog ID, title, Web Editor URL, full-preview URL, and either the replaced URL or a concise note.

## Known Compatibility Fixes

### p5 2 and ml5

`ml5@1` expects p5 1-style preload hooks. With `p5@2.2.3`, include the p5 compatibility shim and a tiny preload-counter polyfill before loading ml5:

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
<script>
  p5.prototype._incrementPreload ||= function() {};
  p5.prototype._decrementPreload ||= function() {};
</script>
<script src="https://unpkg.com/ml5@1/dist/ml5.min.js"></script>
```

For non-p5 Three.js pages that still load ml5, put the p5 and ml5 scripts in the document `<head>`. In the p5 Web Editor preview, injected p5 accessibility code can run early; loading p5 late in the body can produce `p5 is not defined`.

### p5-phone Sensor Aliases

Published versions may expose `enableGyroCanvas()` and `enableGyroOn()` before `enableSensorCanvas()` and `enableSensorOn()`. When targeting an already-published CDN version, use the names that exist in that release. Add aliases in source for the next package release when needed.

### GIF Assets

The API workflow can create an empty `gifs/` folder, but binary asset upload may still need manual Web Editor work. Document the exact expected paths, for example:

```text
gifs/corgiswimflip.gif
gifs/spaceSuit2.png
gifs/comparison.gif
gifs/how-penciles-are-made.gif
```

## Validation Checklist

Run these checks before ending a batch:

```bash
node --check examples/homepage/scripts/examples-data.js
git diff --check -- examples/homepage/scripts/examples-data.js webeditorLinks.md
```

Also run `node --check` on any edited JavaScript files and `npm run build` if `src/p5-phone.js` changed.

Use VS Code diagnostics for edited files. Then verify the local homepage DOM contains each expected Web Editor URL.

End by checking:

```bash
git status --short
git diff --stat
```

## Common Failure Signals

- `p5.prototype.registerMethod is not a function`: add the p5 2 compatibility shim before ml5.
- `Cannot read properties of undefined (reading 'bind')` in `ml5Init`: add the `_incrementPreload` / `_decrementPreload` polyfill before ml5.
- `p5 is not defined` in Web Editor preview: move p5/compat/ml5 scripts into `<head>` before Web Editor injected code can run.
- Full preview has canvas but page errors are present: do not mark browser verified until the errors are understood or intentionally ignored.
- GIF preview 404s an asset: move the row to `Created with assets pending` and document the missing path.