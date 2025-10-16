# Touch Collision Detection Example

This example demonstrates using `collidePointRect()` from the p5.collide2D library to detect touches on multiple moving objects.

## Features
- Multiple space people moving around the screen
- Each object independently detects touches using collision detection
- Objects bounce off screen edges
- Individual and total touch counters
- Visual feedback when touched

## Setup

1. The space suit image is already included at `gifs/spaceSuit2.png`
2. Open `index.html` in a browser or on a mobile device

If the image fails to load, the example will display simple placeholder astronaut shapes.

## How It Works

- **SpacePerson Class**: Simple class that handles position, movement, collision detection, and display
- **collidePointRect()**: Detects if a touch point (x, y) is inside each object's rectangular bounds
- **No Screen Division**: Each object can be touched anywhere without dividing the screen into zones

## Customization

In `sketch.js` you can change:
- Number of space people: Modify the loop in `setup()` (currently 5)
- Size: Change `this.width` and `this.height` in the class
- Speed: Adjust the `random()` values for `speedX` and `speedY`
- Colors: Modify the `backgroundColor` values
