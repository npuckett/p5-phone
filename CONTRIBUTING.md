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

## npm authentication

Publish with `npm login`, then `npm publish`, approving each in the browser (step 3 of the [release checklist](#npm-release-checklist)). An access token in `.env/keys.txt` no longer works for publishing: npm refuses direct publishing with tokens that bypass 2FA. The `.env/` folder is ignored by git — do not commit secrets.

For p5 Web Editor sync, store editor credentials in `.env/p5login.txt`:

```bash
login: your-username
password: your-password
```

Then authenticate the CLI:

```bash
npm run login:webeditor:env
npx p5-webeditor-sync session
```

## npm release checklist

1. Update [CHANGELOG.md](CHANGELOG.md) with release notes
2. Bump version and tag:
   ```bash
   npm run release:patch   # or release:minor / release:major
   ```
   The `postversion` hook pushes commits and tags to origin.
3. Publish to npm, approving the login and the publish in the browser (npm prints an `npmjs.com/auth/cli/…` link for each):
   ```bash
   npm login
   npm publish
   ```
   The token in `.env/keys.txt` no longer works for this. It bypasses 2FA, and npm now refuses direct publishing with such tokens: on 2026-10-02, publishing 1.15.1 with it failed with `404 Not Found - PUT https://registry.npmjs.org/p5-phone`, though `npm whoami` accepted the token. See https://gh.io/npm-gat-bypass2fa-deprecation. Check first with `npm publish --dry-run`. Run `npm run test:press` and `npm run test:share` before a release that touches the activation UIs or Share, `npm run test:audio` before one that touches the sound or mic taps, `npm run test:input` before one that touches motion sensors or touch handling, `npm run test:modes` before one that adds functions or changes how they are registered with p5, and `npm run test:remove` before one that touches the p5.js 2.x addon or what `remove()` releases.
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
- **Screen Wake Lock example** (`wakelock/`) — do not link to p5 Web Editor (the preview iframe lacks `allow="screen-wake-lock"`); host on HTTPS directly
- **Multi-page indexes** (e.g. UX Compare index) — not single editable sketches

### Phone and GIF images

The four Phone and GIF sketches load their images by full URL from p5-phone's GitHub Pages site, and the export leaves their `gifs/` folders out: p5-webeditor-sync 1.1.0 uploads binary files as UTF-8 text, which corrupts them. Keep the images in `examples/Phone and Gif/*/gifs/`, where Pages serves them from. A new Web Editor sketch that needs an image, sound or font should load it by full URL the same way. See **Phone and GIF images** in [webeditorLinks.md](webeditorLinks.md#phone-and-gif-images).

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
