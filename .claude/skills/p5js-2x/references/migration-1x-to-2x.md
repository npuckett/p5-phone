# p5.js 1.x → 2.x migration reference

Full companion to the `p5js-2x` skill. Each section shows the 1.x pattern (what training data defaults to) and the 2.x pattern to write instead. Reference docs: 1.x https://p5js.org/reference/ · 2.x https://beta.p5js.org/

Quick index:

| Area | 1.x | 2.x |
| --- | --- | --- |
| Asset loading | `preload()` + `loadImage()` | `async setup()` + `await loadImage()` |
| Custom curves | `curveVertex()`, `curve()`, `curveTangent()`, `curveTightness()` | `splineVertex()`, `spline()`, `splineTangent()`, `splineProperty('tightness', …)` |
| Bezier | `bezierVertex(x2,y2,x3,y3,x4,y4)` | `bezierOrder(n)` + one `bezierVertex(x,y)` per control point |
| Keyboard | `keyCode === UP_ARROW` | `keyIsDown(UP_ARROW)` or `key === 'ArrowUp'` / `code` check |
| Mouse button | `mouseButton === LEFT` | `mouseButton.left` (object) |
| Multitouch | separate touch callbacks | unified pointer model + `touches[]` |
| Text metrics | `textWidth()` (with spacing) | `textWidth()` = tight bbox; `fontWidth()` = with spacing |
| Dictionaries | `createStringDict()`, `p5.TypedDict` | plain JS objects / `Map` |
| Array helpers | `append()`, `arrayCopy()`, `concat()`, `sort()`, `splice()`, `subset()`, … | native JS array methods |
| Vectors | `createVector()` implies 3D | be explicit: `createVector(0,0)` vs `createVector(0,0,0)` |

## 1. Asset loading (the highest-frequency failure)

All `load…()` functions (`loadImage`, `loadJSON`, `loadSound`, `loadFont`, `loadModel`, `loadStrings`, `loadTable`, `loadShader`, `loadBytes`, `loadXML`) return **Promises** in 2.x. Use `async setup()` + `await`. `preload()` still exists but is no longer the idiom to reach for.

```js
// 1.x — DO NOT use for 2.x sketches
let img, data;
function preload() {
  img = loadImage('bricks.jpg');
  data = loadJSON('scores.json');
}
function setup() {
  createCanvas(400, 400);
  image(img, 0, 0);
}
```

```js
// 2.x — correct
let img, data;
async function setup() {
  createCanvas(400, 400);
  background(240);                 // draws while assets load
  img = await loadImage('bricks.jpg');
  data = await loadJSON('scores.json');
  image(img, 0, 0);
}
```

Load several assets in parallel when order doesn't matter:

```js
async function setup() {
  createCanvas(400, 400);
  const [img, font] = await Promise.all([
    loadImage('bricks.jpg'),
    loadFont('Inter.ttf'),
  ]);
  textFont(font);
  image(img, 0, 0);
}
```

Note: `draw()` still runs after `setup()` resolves, so guard any global that an `await` hasn't populated yet (`if (!img) return;`).

## 2. Custom shapes, curves, and splines

Catmull-Rom "curve" functions were renamed to "spline":

```js
// 1.x
beginShape();
curveVertex(20, 20);
curveVertex(20, 20);
curveVertex(80, 60);
curveVertex(80, 60);
endShape();
curveTightness(0.5);
```

```js
// 2.x
beginShape();
splineVertex(20, 20);
splineVertex(20, 20);
splineVertex(80, 60);
splineVertex(80, 60);
endShape();
splineProperty('tightness', 0.5);
```

Also: `curve()` → `spline()`, `curveTangent()` → `splineTangent()`, `curvePoint()` → `splinePoint()`.

Bezier vertices now take **one point per call**, with the curve order set explicitly:

```js
// 1.x — 3 points in one call
beginShape();
vertex(30, 20);
bezierVertex(80, 0, 80, 75, 30, 75);
endShape();
```

```js
// 2.x — bezierOrder + one point per bezierVertex
beginShape();
bezierOrder(3);
bezierVertex(30, 20);   // anchor
bezierVertex(80, 0);    // control 1
bezierVertex(80, 75);   // control 2
bezierVertex(30, 75);   // anchor
endShape();
```

## 3. Keyboard input

```js
// 1.x muscle memory — avoid for new 2.x code
function draw() {
  if (keyIsDown(LEFT_ARROW)) x -= 5;
  if (keyCode === UP_ARROW) { /* … */ }
}
```

```js
// 2.x — keyIsDown works in both versions; use key/code strings for named keys
function draw() {
  if (keyIsDown(LEFT_ARROW)) x -= 5;   // still fine
}
function keyPressed() {
  if (key === 'ArrowUp') { /* … */ }   // or: if (code === 'ArrowUp')
}
```

## 4. Mouse buttons (now an object)

```js
// 1.x
if (mouseButton === LEFT)  { /* … */ }
if (mouseButton === RIGHT) { /* … */ }
```

```js
// 2.x — object; multiple buttons can be pressed at once
if (mouseButton.left)   { /* … */ }
if (mouseButton.right)  { /* … */ }
if (mouseButton.center) { /* … */ }
```

## 5. Touch and multitouch

`touchStarted()` / `touchMoved()` / `touchEnded()` still exist, but mouse and touch are unified under the browser's **pointer model**. `mousePressed/Dragged/Released` fire for touch too. For multitouch, read the global `touches` array rather than assuming separate code paths.

```js
// 2.x — one code path for mouse + single touch
function mousePressed() { addDot(mouseX, mouseY); return false; }

// 2.x — multitouch
function draw() {
  for (const t of touches) {
    circle(t.x, t.y, 40);
  }
}
```

Prefer p5's callbacks and `touches[]` over hand-rolled `element.addEventListener('touchstart', …)`.

## 6. Text measurement

The meanings swapped relative to 1.x muscle memory:

- `textWidth(str)` → **tight** bounding box (no leading/trailing space).
- `fontWidth(str)` → includes leading/trailing space (the old `textWidth` behavior).

Pick based on whether you want the inked width or the advance width.

## 7. Data structures

The p5 dictionary and array-helper wrappers are gone. Use native JavaScript.

```js
// 1.x — removed in 2.x
let scores = createNumberDict();          // gone
scores.create('alice', 10);
let arr = append([], 5);                  // gone
arr = sort(arr);                          // gone
```

```js
// 2.x — native JS
const scores = new Map();                 // or a plain object {}
scores.set('alice', 10);
let arr = [];
arr.push(5);
arr.sort((a, b) => a - b);
```

Removed dictionary APIs: `createStringDict()`, `createNumberDict()`, `p5.TypedDict`, `p5.StringDict`, `p5.NumberDict`.
Removed array helpers (use native equivalents): `append()`→`push`, `arrayCopy()`→`slice`/spread, `concat()`→`concat`/spread, `reverse()`→`reverse`, `shorten()`→`slice(0,-1)`, `sort()`→`sort`, `splice()`→`splice`, `subset()`→`slice`.

## 8. Vectors

`createVector()` with no arguments no longer implies a 3D vector. Be explicit about dimensionality.

```js
// 2.x
const a = createVector(0, 0);      // 2D
const b = createVector(0, 0, 0);   // 3D
```

## 9. New in 2.1 / 2.2 (genuinely new — verify before assuming behavior)

- **`p5.strands`** — a JavaScript-flavored shader authoring API compiled to GLSL.
- **WebGPU renderer** — an alternative renderer option alongside WebGL.

These are new surface area; confirm against https://beta.p5js.org/ rather than assuming a model already knows them.

## 10. Keeping a sketch on 1.x

If the goal is running existing 1.x code on the 2.x runtime rather than rewriting it, use the official compatibility add-ons instead of hand-writing shims: `preload.js`, `shapes.js`, `data.js`, `events.js` from https://github.com/processing/p5.js-compatibility. Load the relevant add-on after p5 and it restores the corresponding 1.x APIs on top of 2.x.

```html
<script src="https://cdn.jsdelivr.net/npm/p5@2.2.3/lib/p5.js"></script>
<script src="https://cdn.jsdelivr.net/npm/p5.js-compatibility@0.2.0/src/preload.js"></script>
```
