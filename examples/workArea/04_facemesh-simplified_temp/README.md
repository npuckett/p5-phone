# FaceMesh Simplified - p5-phone Camera API

This example demonstrates the new **PhoneCamera** class from p5-phone library, which dramatically simplifies ML5 integration.

## Comparison with Original Version

### Original (03_facemesh-nose):
- **98 lines** of camera and coordinate mapping code
- Manual `createCapture()` setup
- Manual `getVideoDimensions()` calculation (35 lines)
- Manual coordinate scaling: `x = keypoint.x * scaleX + dims.x`
- Manual mirroring calculations
- Orientation detection logic

### Simplified (04_facemesh-simplified):
- **~60 lines** of actual logic (camera code eliminated!)
- One line camera creation: `cam = createPhoneCamera('user', true, 'fitWidth')`
- One line coordinate mapping: `let nose = cam.mapKeypoint(noseKeypoint)`
- Automatic mirroring when `cam.mirror = true`
- Works in any orientation automatically

## Key Features Demonstrated

### 1. Simple Camera Creation
```javascript
// Create front-facing camera, mirrored, fit to height
cam = createPhoneCamera('user', true, 'fitHeight');
```

### 2. ML5 Integration
```javascript
// Just pass cam.video to ML5
facemesh = ml5.faceMesh(cam.video, options);
```

### 3. Coordinate Mapping
```javascript
// Single keypoint - ONE LINE!
let nose = cam.mapKeypoint(face.keypoints[1]);
ellipse(nose.x, nose.y, 20, 20);

// Multiple keypoints - also ONE LINE!
let allPoints = cam.mapKeypoints(face.keypoints);
for (let point of allPoints) {
  ellipse(point.x, point.y, 3, 3);
}
```

### 4. Camera Drawing
```javascript
// Draw camera like any p5.Image
image(cam, 0, 0);  // Auto-positioned, auto-mirrored!
```

### 5. Camera Switching
```javascript
// Switch between front and back camera
cam.active = 'environment';  // or 'user'
cam.mirror = false;  // Turn off mirroring for back camera
```

## Benefits

✅ **Less Code**: ~40% reduction in code length  
✅ **Easier to Understand**: No coordinate math needed  
✅ **More Maintainable**: Camera logic centralized in library  
✅ **Consistent API**: Same pattern for FaceMesh, HandPose, BodyPose  
✅ **Automatic Updates**: Handles orientation changes internally  
✅ **Mirroring Built-in**: No manual flip calculations  

## Display Modes

The PhoneCamera supports multiple display modes:

- `'fitHeight'` - Fill canvas height, maintain aspect ratio (default)
- `'fitWidth'` - Fill canvas width, maintain aspect ratio
- `'cover'` - Fill entire canvas, crop if needed
- `'contain'` - Fit entirely within canvas, letterbox if needed
- `'fixed'` - Use `cam.fixedWidth` and `cam.fixedHeight`

Change modes dynamically:
```javascript
cam.mode = 'cover';  // Switch to cover mode
```

## Works with All ML5 Models

The same API works with:
- **ml5.faceMesh()** - Face tracking (this example)
- **ml5.handPose()** - Hand tracking
- **ml5.bodyPose()** - Body pose estimation

All use the same keypoint structure `{x, y, z}` and the same mapping methods!
