# Camera Selector - PhoneCamera API Demo

This example demonstrates the full capabilities of the **PhoneCamera** class from p5-phone library.

## Features Demonstrated

### 1. Camera Switching
- Toggle between front (`'user'`) and back (`'environment'`) cameras
- Instant switching with `cam.active = 'environment'`
- No manual camera recreation needed

### 2. Display Modes
Cycle through all 5 display modes:
- **fitHeight** - Fill canvas height, maintain aspect ratio (default)
- **fitWidth** - Fill canvas width, maintain aspect ratio
- **cover** - Fill entire canvas, crop if needed
- **contain** - Fit entirely within canvas, letterbox if needed
- **fixed** - Use fixed dimensions (640x480 default)

### 3. Mirroring Control
- Toggle horizontal flip with `cam.mirror = true/false`
- Typically ON for front camera (natural selfie view)
- Typically OFF for back camera

### 4. Status Display
- Real-time display of current settings
- Shows video dimensions and display dimensions
- Demonstrates `cam.getDimensions()` for debugging

## Code Comparison

### Original Version (331 lines):
```javascript
// Manual camera management
function startCamera(facingMode) {
  if (videoCapture) videoCapture.remove();
  let constraints = { video: { facingMode }, audio: false, flipped: isFlipped };
  videoCapture = createCapture(constraints);
  videoCapture.hide();
}

// Manual dimension calculations (35+ lines)
function drawVideoFeed() {
  let videoWidth = videoCapture.width;
  let videoHeight = videoCapture.height;
  if (scaleMode === 'fitWidth') {
    drawWidth = width;
    drawHeight = (videoHeight / videoWidth) * width;
    // ... more calculations
  }
  // ... more modes
  image(videoCapture, drawX, drawY, drawWidth, drawHeight);
}
```

### New Version (~220 lines):
```javascript
// Create once in setup
cam = createPhoneCamera('user', true, 'fitHeight');

// Switch cameras with property
cam.active = 'environment';

// Change modes with property
cam.mode = 'cover';

// Draw with one line
image(cam, 0, 0);  // All positioning automatic!
```

## Key Benefits

✅ **33% Less Code** - From 331 to ~220 lines  
✅ **No Manual Calculations** - All dimension math handled by library  
✅ **Property-Based API** - Simple assignments instead of method calls  
✅ **Automatic Mirroring** - Built into drawing, no manual transforms  
✅ **5 Display Modes** - More options than original (added cover, contain)  
✅ **Status Info** - Easy access to dimensions via `getDimensions()`  

## Usage Tips

### Camera Switching
```javascript
// Instant switch
cam.active = cam.active === 'user' ? 'environment' : 'user';

// Typically adjust mirroring when switching
if (cam.active === 'environment') {
  cam.mirror = false;  // Back camera usually not mirrored
} else {
  cam.mirror = true;   // Front camera mirrored for selfie
}
```

### Display Mode Selection
- **Mobile Portrait**: Use `fitHeight` (default) - fills screen vertically
- **Mobile Landscape**: Use `fitWidth` - fills screen horizontally  
- **Fill Screen**: Use `cover` - no letterboxing, may crop video
- **See Full Video**: Use `contain` - shows entire video, may letterbox
- **Fixed Size**: Use `fixed` with `cam.fixedWidth` and `cam.fixedHeight`

### Getting Dimension Info
```javascript
let dims = cam.getDimensions();
console.log(dims.x, dims.y);           // Position on canvas
console.log(dims.width, dims.height);   // Display size
console.log(dims.scaleX, dims.scaleY);  // Scale factors for ML5
```

## Testing Instructions

1. Open on mobile device
2. Tap to enable camera
3. Use bottom buttons to:
   - **Left**: Switch between front/back cameras
   - **Middle**: Cycle through display modes
   - **Right**: Toggle mirroring on/off
4. Observe status overlay showing current settings
5. Rotate device to test different orientations
