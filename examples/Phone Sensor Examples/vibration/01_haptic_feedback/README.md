# Haptic Feedback Example

This example demonstrates how to use the vibration motor on Android devices to provide haptic feedback for different touch interactions.

## Features

- **Four Touch Zones**: Screen divided into 2x2 grid with different vibration patterns
- **Quick Tap**: 20ms single pulse for subtle feedback
- **Double Tap**: Two 50ms pulses with 30ms pause between
- **Triple Tap**: Three 50ms pulses for more prominent feedback
- **Long Press**: 200ms extended pulse for significant actions

## Android Only

⚠️ **Important**: Vibration is only supported on Android devices. iOS does not support the Vibration API, so this example will not provide haptic feedback on iPhones or iPads.

## How It Works

1. Tap screen to enable vibration (browser security requirement)
2. Touch different zones to experience different vibration patterns
3. Each zone has a distinct pattern:
   - Single number = duration in milliseconds
   - Array = pattern of [vibrate, pause, vibrate, pause, ...]

## Key Concepts

- `enableVibrationTap()` - Request permission to use vibration
- `window.vibrationEnabled` - Check if vibration is available
- `vibrate(pattern)` - Trigger vibration with duration or pattern
- Combining visual and haptic feedback for enhanced UX

## Code Highlights

```javascript
// Enable vibration with tap
enableVibrationTap('Tap to enable vibration');

// Single vibration
vibrate(50);  // 50ms pulse

// Pattern vibration
vibrate([100, 50, 100]);  // vibrate-pause-vibrate
```

## Use Cases

- Button press feedback
- Game interactions
- Alert notifications
- Touch zone confirmation
- Gesture completion feedback
