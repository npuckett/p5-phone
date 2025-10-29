# FaceMesh Simplified (Preload Version)

This example demonstrates face tracking using ML5's FaceMesh with the **preload pattern**.

## Key Differences from Standard Version

### Standard Version (04_facemesh-simplified_temp)
```javascript
function setup() {
  cam = createPhoneCamera('user', true, 'fitHeight');
  
  cam.onReady(() => {
    let options = { maxFaces: 1, refineLandmarks: false, flipHorizontal: false };
    facemesh = ml5.faceMesh(options, modelLoaded);
  });
}

function modelLoaded() {
  facemesh.detectStart(cam.videoElement, gotFaces);
}

function gotFaces(results) {
  faces = results;
}
```

### Preload Version (this example)
```javascript
function preload() {
  // Model loads BEFORE setup() runs
  let options = { maxFaces: 1, refineLandmarks: false, flipHorizontal: false };
  facemesh = ml5.faceMesh(options);
}

function setup() {
  cam = createPhoneCamera('user', true, 'fitHeight');
  // Wait for camera before starting detection
  cam.onReady(() => {
    facemesh.detectStart(cam.videoElement, gotFaces);
  });
}

function gotFaces(results) {
  faces = results;
}
```

## Benefits of Preload Pattern

1. **Cleaner code**: No `modelLoaded()` callback needed
2. **Faster startup**: ML5 model loads while camera initializes  
3. **Better p5.js integration**: Uses standard preload() pattern
4. **Simpler callback structure**: Only `cam.onReady()` needed, not `modelLoaded()`
5. **Works correctly on iOS**: Camera initializes after permissions granted

## When to Use Each Pattern

**Use Preload** when:
- You want the fastest possible initialization
- You're loading multiple models
- You prefer the standard p5.js pattern

**Use Standard** when:
- You need to dynamically choose which model to load
- Model selection depends on runtime conditions
- You want explicit control over loading sequence

## Features

- ✅ Face tracking with nose cursor
- ✅ All 468 face keypoints visible (toggle with `SHOW_ALL_KEYPOINTS`)
- ✅ Touch to toggle video on/off
- ✅ Spacebar to switch cameras (front/back)
- ✅ Automatic coordinate mapping with `cam.mapKeypoint()`
- ✅ Works in portrait and landscape

## Usage

Change `TRACKED_KEYPOINT_INDEX` to track different face points:
- 1 = nose tip
- 10 = top of face
- 152 = chin
- 234 = left eye
- 454 = right eye
- 13 = lips
