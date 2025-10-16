// ============================================= 
// GYROSCOPE/ACCELEROMETER PERMISSIONS & GESTURE HANDLING
// For projects that only need motion/orientation sensor data
// Students don't need to modify this
// =============================================

// Global flag for sketch.js to check
window.sensorsEnabled = false;

// Store references
let startButton;
let statusText;

// =========================================
// INITIALIZATION
// =========================================
document.addEventListener('DOMContentLoaded', function() {
  startButton = document.getElementById('startButton');
  statusText = document.getElementById('statusText');
  
  // Add click event listener to start button
  startButton.addEventListener('click', handleGyroPermissionRequest);
  
  // Initialize other event listeners
  initializeGestureBlocking();
  initializeP5TouchOverrides();
});

// =========================================
// GYROSCOPE/ACCELEROMETER PERMISSION HANDLING
// =========================================
async function handleGyroPermissionRequest() {
  startButton.classList.add('hidden');
  statusText.classList.remove('hidden');
  statusText.textContent = 'Requesting motion sensor permissions...';
  
  try {
    // Request motion sensor permissions (iOS 13+)
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      
      statusText.textContent = 'Requesting gyroscope access...';
      
      const orientationPermission = await DeviceOrientationEvent.requestPermission();
      console.log('Orientation permission:', orientationPermission);
      
      if (typeof DeviceMotionEvent !== 'undefined' &&
          typeof DeviceMotionEvent.requestPermission === 'function') {
        
        statusText.textContent = 'Requesting accelerometer access...';
        const motionPermission = await DeviceMotionEvent.requestPermission();
        console.log('Motion permission:', motionPermission);
      }
    }
    
    // Mark sensors as enabled
    window.sensorsEnabled = true;
    
    // Hide status text
    statusText.classList.add('hidden');
    
    console.log('Motion sensors enabled. Available data: rotationX, rotationY, rotationZ, accelerationX, accelerationY, accelerationZ');
    
    // Call setup again if it exists (to reinitialize with permissions)
    if (typeof userSetupComplete === 'function') {
      userSetupComplete();
    }
    
  } catch (error) {
    console.error('Motion sensor permission error:', error);
    statusText.textContent = 'Error accessing motion sensors: ' + error.message;
    
    // Still enable what we can
    window.sensorsEnabled = true;
    
    setTimeout(() => {
      statusText.classList.add('hidden');
    }, 3000);
  }
}

// =========================================
// GESTURE PREVENTION INITIALIZATION
// =========================================
function initializeGestureBlocking() {
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
  
  // Initialize edge swipe prevention
  initializeEdgeSwipePrevention();
  
  // Initialize other gesture prevention
  initializeOtherGesturePrevention();
}

// =========================================
// EDGE SWIPE PREVENTION
// =========================================
function initializeEdgeSwipePrevention() {
  let touchStartX = 0;
  let touchStartY = 0;
  const edgeThreshold = 20;
  
  document.addEventListener('touchstart', function(e) {
    if (e.touches && e.touches.length > 0) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      
      // Prevent edge swipes
      if (touchStartX < edgeThreshold || 
          touchStartX > window.innerWidth - edgeThreshold) {
        e.preventDefault();
      }
    }
  }, { passive: false, capture: true });
  
  document.addEventListener('touchmove', function(e) {
    if (!e.touches || e.touches.length === 0) return;
    
    let currentX = e.touches[0].clientX;
    let currentY = e.touches[0].clientY;
    let deltaX = currentX - touchStartX;
    let deltaY = currentY - touchStartY;
    
    // Prevent horizontal edge swipes (back/forward)
    if ((touchStartX < edgeThreshold && deltaX > 0) ||
        (touchStartX > window.innerWidth - edgeThreshold && deltaX < 0)) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent pull-to-refresh
    if (window.pageYOffset === 0 && deltaY > 0) {
      e.preventDefault();
    }
    
    // Always prevent on canvas
    if (e.target && e.target.tagName === 'CANVAS') {
      e.preventDefault();
    }
  }, { passive: false, capture: true });
}

// =========================================
// OTHER GESTURE PREVENTION
// =========================================
function initializeOtherGesturePrevention() {
  // Prevent pinch zoom
  document.addEventListener('gesturestart', function(e) {
    e.preventDefault();
  });
  
  document.addEventListener('gesturechange', function(e) {
    e.preventDefault();
  });
  
  document.addEventListener('gestureend', function(e) {
    e.preventDefault();
  });
  
  // Prevent double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener('touchend', function(e) {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
  
  // Prevent long-press context menu
  window.oncontextmenu = function(e) {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };
}

// =========================================
// P5.JS GESTURE OVERRIDE HELPERS
// =========================================
function initializeP5TouchOverrides() {
  // Wait for p5 to be ready
  setTimeout(() => {
    if (window._setupDone) {
      overrideP5Touch();
    } else {
      // Try again after setup
      const checkP5 = setInterval(() => {
        if (window._setupDone) {
          overrideP5Touch();
          clearInterval(checkP5);
        }
      }, 100);
    }
  }, 100);
}

function overrideP5Touch() {
  const origTouchStarted = window.touchStarted || function() {};
  const origTouchMoved = window.touchMoved || function() {};
  const origTouchEnded = window.touchEnded || function() {};
  const origMousePressed = window.mousePressed || function() {};
  const origMouseDragged = window.mouseDragged || function() {};
  const origMouseReleased = window.mouseReleased || function() {};
  
  // Ensure all touch functions return false
  window.touchStarted = function(e) {
    origTouchStarted(e);
    return false;
  };
  
  window.touchMoved = function(e) {
    origTouchMoved(e);
    return false;
  };
  
  window.touchEnded = function(e) {
    origTouchEnded(e);
    return false;
  };
  
  window.mousePressed = function(e) {
    origMousePressed(e);
    return false;
  };
  
  window.mouseDragged = function(e) {
    origMouseDragged(e);
    return false;
  };
  
  window.mouseReleased = function(e) {
    origMouseReleased(e);
    return false;
  };
}