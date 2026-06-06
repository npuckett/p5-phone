# p5 Web Editor Batch Sync

Repeatable method for updating p5-phone example links to p5 Web Editor projects in batches.

Use this when local examples have changed, existing Web Editor links are stale, or a new release needs public editable sketches under the maintainer account (currently `npuckett`).

See also: [README.md](./README.md) for server setup, [webeditorLinks.md](../../webeditorLinks.md) for the migration log.

## Goals

- Create or update p5 Web Editor sketches from the current local example files
- Keep each Web Editor project **Public**
- Verify public full-preview pages before adding links to the homepage catalog
- Record every migrated link, replaced URL, and known manual follow-up in `webeditorLinks.md`
- Leave examples without a trustworthy preview out of the verified section until the issue is fixed

## Prerequisites checklist

- [ ] Browser logged into p5 Web Editor as the target account
- [ ] `npm install` completed in the repo
- [ ] `npm run serve:docs` running (port **8765**) if you will verify the homepage catalog locally
- [ ] `npm run serve:cors` running (port **8876**) for automation or manual file reference
- [ ] `npm publish` done if this batch depends on a new `p5-phone@VERSION` CDN pin

## Required state

### Docs preview server

```bash
npm run serve:docs
```

Open `http://localhost:8765/examples/homepage/` to verify catalog links after editing `examples-data.js`.

### CORS file server

The CORS server lets a logged-in Web Editor browser session (or automation running inside it) fetch local files from the repo:

```bash
npm run serve:cors
```

Equivalent manual command:

```bash
npx http-server . -p 8876 --cors -c-1
```

Files are served at `http://127.0.0.1:8876/...`. Stop this server after the batch finishes.

## Batch selection

Work in small batches grouped by dependency shape:

| Type | Local files | Notes |
|------|-------------|-------|
| Basic | `index.html`, `sketch.js` | Standard p5-phone CDN tags |
| Sound / mic | + `p5.sound@0.3.0` | Confirm no stale `tracks/` or `loadSound()` unless assets will be uploaded |
| ML5 | + `GazeDetector.js`, `functions.js`, etc. | See [Known compatibility fixes](#known-compatibility-fixes) |
| GIF | + empty `gifs/` folder | Code-only first; assets uploaded manually in Web Editor |
| NFC | — | **Do not migrate** — iframe blocks Web NFC |
| Multi-page index | — | Decide if a single Web Editor sketch makes sense |

Before creating a batch, inventory missing or stale catalog links from `examples/homepage/scripts/examples-data.js` and confirm each local folder has the files needed for Web Editor.

## Web Editor API shape

The authenticated Web Editor page can call these endpoints from browser automation (e.g. `page.evaluate()` in Playwright/Puppeteer, or the DevTools console while logged in):

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

Public URLs:

```text
https://editor.p5js.org/{username}/sketches/{projectId}
https://editor.p5js.org/{username}/full/{projectId}
```

## Creation steps (automation)

1. Start `npm run serve:cors` from the repo root
2. In the logged-in Web Editor browser context, fetch local files from `http://127.0.0.1:8876/...`
3. Build a project payload with `visibility: 'Public'`
4. `POST /editor/projects` for new sketches, or `PUT /editor/projects/{projectId}` when updating an existing sketch
5. Record the returned project ID, sketch URL, and full-preview URL in `webeditorLinks.md`
6. Confirm saved file contents contain expected dependency strings: `p5@2.2.3`, `p5-phone@VERSION`, `p5.js-compatibility@0.2.0`, `p5.sound@0.3.0`, `ml5@1`, or `three@0.160.0` as applicable

Do not patch the homepage catalog until the public full preview has been smoke-tested.

## Manual fallback (no automation)

1. Log into [editor.p5js.org](https://editor.p5js.org/)
2. Create a new sketch (or open an existing one to update)
3. Copy contents from local `index.html` and `sketch.js` (and helper files) into the Web Editor file tree
4. Set project visibility to **Public**
5. **File → Share** and copy the full-preview URL (`.../full/{projectId}`)
6. Smoke-test the full-preview URL in a browser
7. Add a row to `webeditorLinks.md` and update `webEditor` in `examples-data.js`

Use `npm run serve:cors` or `serve:docs` to open local files side-by-side while copying.

## Preview verification

Open each full-preview URL and inspect the nested sketch frame (usually `blob:https://preview.p5js.org/...`).

For each preview, verify:

- A canvas or expected primary DOM surface exists
- Expected scripts are present
- No page errors or unexpected console errors
- No bad network responses (ignore analytics, favicon, and Cloudflare RUM noise)
- Sound examples do not request stale `tracks/` files unless the asset is intentionally pending
- GIF code-only examples are not listed as fully verified until assets have been uploaded

`lockGestures()` commonly triggers beforeunload dialogs while moving between previews. Accept them and continue.

For camera examples, desktop browser automation may deny camera permission. Treat that as expected only if the preview otherwise loads the app surface, scripts, helper files, and canvas/video without unrelated runtime errors.

## Catalog updates

After previews pass, update `examples/homepage/scripts/examples-data.js`:

- Replace stale account URLs with verified maintainer URLs
- Add missing `webEditor` fields to verified entries
- Keep `p5` compatibility labels accurate
- Do not add a verified `webEditor` link for a project that still needs asset uploads or has unresolved runtime errors unless the project is intentionally code-only and documented

After patching, load the local homepage (`npm run serve:docs`) and confirm each expected `webEditor` URL appears in the rendered catalog.

## Migration log updates

Update [webeditorLinks.md](../../webeditorLinks.md) every batch.

Use these sections consistently:

- **Verified on phone** — user-confirmed phone tests
- **Created and browser verified** — full-preview smoke tests passed in browser
- **Created with assets pending** — project exists, but assets still need manual upload
- **Not migrated** — intentional skips (NFC, multi-page indexes, etc.)

For each row, include catalog ID, title, Web Editor URL, full-preview URL, and either the replaced URL or a concise note.

## Known compatibility fixes

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

### p5-phone sensor aliases

Published versions may expose `enableGyroCanvas()` and `enableGyroOn()` before `enableSensorCanvas()` and `enableSensorOn()`. When targeting an already-published CDN version, use the names that exist in that release. Add aliases in source for the next package release when needed.

### GIF assets

The API workflow can create an empty `gifs/` folder, but binary asset upload still requires manual Web Editor work. Document the exact expected paths:

```text
gifs/corgiswimflip.gif
gifs/spaceSuit2.png
gifs/comparison.gif
gifs/how-penciles-are-made.gif
```

**Note:** GIF binary files are not currently in the git repo. Upload them into each Web Editor project's `gifs/` folder before marking those sketches fully verified.

## Validation checklist

Run before ending a batch:

```bash
node --check examples/homepage/scripts/examples-data.js
git diff --check -- examples/homepage/scripts/examples-data.js webeditorLinks.md
```

Also run `node --check` on any edited JavaScript files and `npm run build` if `src/p5-phone.js` changed.

Verify the local homepage DOM contains each expected Web Editor URL.

End by checking:

```bash
git status --short
git diff --stat
```

## Common failure signals

| Symptom | Fix |
|---------|-----|
| `p5.prototype.registerMethod is not a function` | Add the p5 2 compatibility shim before ml5 |
| `Cannot read properties of undefined (reading 'bind')` in `ml5Init` | Add `_incrementPreload` / `_decrementPreload` polyfill before ml5 |
| `p5 is not defined` in Web Editor preview | Move p5/compat/ml5 scripts into `<head>` |
| Full preview has canvas but page errors are present | Do not mark browser verified until errors are understood |
| GIF preview 404s an asset | Move row to **Created with assets pending** and document the missing path |

## Published sketches use npm CDN

Once sketches are in the Web Editor, they load p5-phone from jsDelivr (not the local CORS server):

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5-phone@1.11.0/dist/p5-phone.min.js"></script>
<script src="sketch.js"></script>
```

Update the version pin across examples and Web Editor sketches after each npm release.
