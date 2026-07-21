# Bug report: `lockGestures()` causes unwanted reload / leave-page behavior on mobile (embedded multi-page sites)

**Status:** Resolved · **Reported from:** [preposition-programming](https://github.com/npuckett/preposition-programming) · **p5-phone version:** 1.11.0 (fixed in 1.12.0)

---

## Summary

Calling `lockGestures()` installs **document-level** gesture blocking that includes a global `beforeunload` handler and history manipulation. On mobile, this produces disruptive navigation behavior — including “Leave site?” prompts and reload-like interactions — when the sketch is **not** a full-screen standalone app but an **embedded canvas inside a scrollable, multi-page site**.

This is reproducible in [preposition-programming](https://prepositionprogramming.com): p5-phone is loaded on tutorial pages, and `lockGestures()` is invoked from a shared sketch host after canvas creation on touch-primary devices.

---

## Environment

- **p5-phone:** `1.11.0` (behavior aligns with current `main` in `src/p5-phone.js`)
- **p5.js:** `2.0.0` / `2.2.3`
- **Consumer site:** multi-page Eleventy site with sidebar navigation, scrollable content, embedded responsive canvas (~560px max width)
- **Devices:** mobile touch-primary browsers (iOS Safari, Android Chrome)
- **Integration pattern:**

```javascript
// sketch-host.js — called after createCanvas() on touch devices only
if (typeof p.lockGestures === "function") {
  p.lockGestures();
}
```

p5-phone is loaded globally in the page `<head>`, before the sketch module.

---

## Steps to reproduce

1. Open a page with an embedded p5 sketch on mobile (e.g. `https://prepositionprogramming.com/preposition-above.html`).
2. Wait for sketch to mount; `lockGestures()` runs in `setup()`.
3. Interact with the canvas (drag circles / tap targets).
4. Try to navigate away (sidebar link, back gesture, or pull down at top of page).

---

## Expected behavior

- Canvas drag/tap works without scrolling the page or triggering pull-to-refresh.
- Normal page navigation works without confirmation dialogs or reload-like behavior.
- Gesture blocking should be **scoped to the canvas** (or sketch container), not the entire browsing session.

---

## Actual behavior

- Users see **leave-page / reload-like behavior** on mobile when navigating or interacting near the top of the page.
- Pull-to-refresh and back-swipe prevention feel overly aggressive on pages that are meant to scroll and link to other tutorials.
- The site becomes “sticky” in a way that reads as a broken reload/navigation loop.

---

## Root cause (in p5-phone source)

`lockGestures()` → `_initializeGestureBlocking()` in `src/p5-phone.js` installs **page-wide** side effects:

```javascript
function _initializeGestureBlocking() {
  // Prevent back navigation
  window.history.pushState(null, '', window.location.href);
  window.onpopstate = function() {
    window.history.pushState(null, '', window.location.href);
  };

  // Warn before leaving
  window.addEventListener('beforeunload', function(e) {
    e.preventDefault();
    e.returnValue = '';
  });

  _initializeEdgeSwipePrevention();
  _initializeOtherGesturePrevention();
}
```

Additional document-level handlers in `_initializeEdgeSwipePrevention()`:

- `touchstart` / `touchmove` with `{ passive: false, capture: true }` on **`document`**
- Pull-to-refresh blocked when `window.pageYOffset === 0 && deltaY > 0`
- `preventDefault()` on canvas touches globally

### Issues with this design for embedded sketches

| Mechanism | Intended effect | Problem in embedded/multi-page context |
|-----------|-----------------|----------------------------------------|
| `beforeunload` + `returnValue = ''` | Discourage accidental leave | Triggers browser “Leave site?” dialogs; on mobile this feels like reload/navigation failure |
| `history.pushState` + `onpopstate` loop | Block back-swipe | Breaks normal back navigation on tutorial sites |
| Document-level `touchmove` capture | Block pull-to-refresh / edge swipes | Affects whole page, not just canvas — conflicts with scrollable layout |
| No `unlockGestures()` / cleanup | N/A | Handlers persist for page lifetime; no way to release when sketch unmounts |

The p5-phone docs already note a related symptom in `docs/web-editor/batch-sync.md`:

> `lockGestures()` commonly triggers beforeunload dialogs while moving between previews.

That confirms the `beforeunload` handler is a known pain point, but it is still installed unconditionally by default.

---

## Use case mismatch

`lockGestures()` appears designed for **full-screen mobile sketches** (Web Editor full preview, kiosk-style examples) where:

- The canvas is the entire viewport
- Users should not scroll, go back, or refresh
- A “don’t leave” warning may be acceptable

It is **not** a good default for **embedded sketches** in:

- Multi-page documentation/tutorial sites
- Scrollable article layouts with nav sidebars
- Static sites where users move between pages frequently

preposition-programming is the second case.

---

## Suggested fixes

### 1. Make `beforeunload` opt-in (highest priority)

```javascript
lockGestures({ warnBeforeLeave: false }); // default false for embedded use
```

Most consumers want gesture blocking, not navigation warnings.

### 2. Add `unlockGestures()`

Remove listeners and reset `window.gesturesLocked` when:

- p5 instance is removed (`p.remove()`)
- User navigates away (SPA route change)
- Page `beforeunload` / `pagehide`

### 3. Scope handlers to a target element

```javascript
lockGestures({ target: canvasElement });
// or
p.lockGestures({ element: p.canvas });
```

Only attach `touch-action: none`, `touchmove` prevention, and pull-to-refresh blocking to the canvas/container — not `document`.

### 4. Split “full app” vs “embedded canvas” presets

```javascript
lockGestures({ mode: 'embedded' });  // canvas-only, no beforeunload, no history trap
lockGestures({ mode: 'fullscreen' }); // current behavior for Web Editor / kiosk
```

### 5. Don't trap browser history on content sites

History manipulation may be appropriate for standalone apps; it should not run in embedded mode.

---

## Resolution (p5-phone 1.12.0+)

Use embedded mode for canvases inside scrollable multi-page sites:

```javascript
p.lockGestures({ mode: 'embedded', element: p.canvas });
```

Bare `lockGestures()` keeps fullscreen behavior for full-viewport sketches. `beforeunload` is now opt-in via `{ warnBeforeLeave: true }`. Call `unlockGestures()` (or `p.remove()`) to clean up listeners.

---

## Acceptance criteria for a fix

- [x] Embedded canvas: drag works, page scroll/nav works, no leave-site dialog
- [x] Full-screen sketch: optional strict mode still blocks pull-to-refresh / back-swipe
- [x] `unlockGestures()` cleans up all listeners
- [x] Documented API for `{ mode: 'embedded' | 'fullscreen' }` or equivalent options
- [x] batch-sync docs updated — “accept beforeunload dialogs” should not be required for normal browsing

---

## References

- p5-phone `_initializeGestureBlocking()`: `src/p5-phone.js` (~lines 1716–1731)
- p5-phone batch-sync note: `docs/web-editor/batch-sync.md` (beforeunload dialogs)
- Consumer integration: [preposition-programming `sketch-host.js`](https://github.com/npuckett/preposition-programming/blob/main/src/js/sketch-host.js)
