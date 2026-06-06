# Contributing to p5-phone

Thank you for helping maintain p5-phone. This document covers npm releases and syncing examples to the p5 Web Editor.

## Development setup

```bash
git clone https://github.com/npuckett/p5-phone.git
cd p5-phone
npm install
npm run build
node -c src/p5-phone.js
```

Local servers for docs preview and Web Editor batch sync:

```bash
npm run serve:docs   # http://localhost:8765 — homepage catalog
npm run serve:cors   # http://127.0.0.1:8876 — CORS file server for migration
```

See [docs/web-editor/README.md](docs/web-editor/README.md) for the full Web Editor workflow.

## npm release checklist

1. Update [CHANGELOG.md](CHANGELOG.md) with release notes
2. Bump version and tag:
   ```bash
   npm run release:patch   # or release:minor / release:major
   ```
   The `postversion` hook pushes commits and tags to origin.
3. Publish to npm:
   ```bash
   npm publish
   ```
4. Update CDN version pins (`p5-phone@VERSION`) in:
   - Example `index.html` files (~75 files)
   - [README.md](README.md)
   - [.github/skills/p5-phone/SKILL.md](.github/skills/p5-phone/SKILL.md) and portable skill stubs
5. Push a version tag to trigger the GitHub Release workflow (optional)

## Web Editor batch sync checklist

After local examples or CDN pins change:

1. Log into [editor.p5js.org](https://editor.p5js.org/) as the maintainer account
2. Start `npm run serve:cors` (and `npm run serve:docs` for catalog verification)
3. Follow [docs/web-editor/batch-sync.md](docs/web-editor/batch-sync.md):
   - Create or update public sketches from local files
   - Smoke-test each full-preview URL
4. Update [webeditorLinks.md](webeditorLinks.md) with sketch IDs and verification status
5. Update `webEditor` fields in:
   - [examples/homepage/scripts/examples-data.js](examples/homepage/scripts/examples-data.js)
   - [doNotTouchWorkshop/scripts/workshop-data.js](doNotTouchWorkshop/scripts/workshop-data.js) (if applicable)
6. Validate:
   ```bash
   node --check examples/homepage/scripts/examples-data.js
   npm run build   # if src/p5-phone.js changed
   ```

### Intentional exclusions

- **NFC examples** — do not link to p5 Web Editor (iframe blocks Web NFC); host on HTTPS directly
- **Multi-page indexes** (e.g. UX Compare index) — not single editable sketches

### GIF assets pending

Four Phone and GIF Web Editor sketches need binary files uploaded manually into each project's `gifs/` folder. See **Created with assets pending** in [webeditorLinks.md](webeditorLinks.md). GIF binaries are not stored in this repo.

## Pull requests

- Keep changes focused; match existing code style
- Run `npm run build` and `node -c src/p5-phone.js` before submitting
- If you add or change catalog examples, update `examples-data.js` and note whether Web Editor sync is required

## Documentation

| Resource | Purpose |
|----------|---------|
| [README.md](README.md) | Full API reference |
| [examples/homepage/](examples/homepage/) | Interactive docs site |
| [docs/web-editor/](docs/web-editor/) | Maintainer Web Editor workflow |
| [webeditorLinks.md](webeditorLinks.md) | Migration log of sketch URLs |
