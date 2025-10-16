// Touch with GIF example
// Demonstrates GIF moving toward touch points with rotation
// Corgi fetches the ball wherever you touch

// Global variables
let corgiGif;
let corgiX;
let corgiY;
let targetX;
let targetY;
let moveSpeed = 0.05; // Speed multiplier for movement (0.0 - 1.0)
let corgiRotation = 0;
let corgiScale = 1.2; // Size multiplier for corgi
let touchCounter = 0;
let backgroundColor;

function preload() 
{
    // Load the corgi swimming GIF
    corgiGif = loadImage('gifs/corgiswimflip.gif');
}

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    backgroundColor = color(200, 255, 200);
    
    // Lock mobile gestures to prevent browser interference
    lockGestures();
    
    textAlign(CENTER, CENTER);
    
    // Start corgi at center
    corgiX = width / 2;
    corgiY = height / 2;
    targetX = corgiX;
    targetY = corgiY;
}

function draw() 
{
    background(backgroundColor);
    
    // Calculate angle to target
    let angleToTarget = atan2(targetY - corgiY, targetX - corgiX);
    
    // Smoothly move corgi toward target position
    corgiX = lerp(corgiX, targetX, moveSpeed);
    corgiY = lerp(corgiY, targetY, moveSpeed);
    
    // Smoothly rotate toward movement direction
    corgiRotation = angleToTarget;
    
    // Display GIF with rotation and scale
    push();
    translate(corgiX, corgiY);
    rotate(corgiRotation);
    imageMode(CENTER);
    image(corgiGif, 0, 0, 200 * corgiScale, 200 * corgiScale);
    pop();
    
    // Draw ball (target point) when different from current position
    let distance = dist(corgiX, corgiY, targetX, targetY);
    if (distance > 5) 
    {
        // Corgi is moving - play the GIF
        corgiGif.play();
        
        // Draw ball
        fill(255, 200, 50);
        stroke(200, 150, 0);
        strokeWeight(3);
        circle(targetX, targetY, 30);
        
        // Add shine to ball
        fill(255, 255, 200, 150);
        noStroke();
        circle(targetX - 5, targetY - 5, 12);
    }
    else
    {
        // Ball caught! Pause the GIF and show celebration
        corgiGif.pause();
        
        fill(100, 255, 100);
        noStroke();
        textSize(32);
        text("BALL CAUGHT!", width/2, 100);
    }
    
    // Display information
    fill(50);
    textSize(24);
    text("Fetches: " + touchCounter, width/2, 40);
    
    // Instructions
    textSize(20);
    fill(100);
    text("Touch to throw the ball!", width/2, height - 30);
}

function touchStarted() 
{
    touchCounter = touchCounter + 1;
    
    // Set new target position
    if (touches.length > 0) 
    {
        targetX = touches[0].x;
        targetY = touches[0].y;
    }
    
    // Start playing the GIF when new target is set
    corgiGif.play();
    
    return false;
}

function touchMoved() 
{
    // Update target as touch moves
    if (touches.length > 0) 
    {
        targetX = touches[0].x;
        targetY = touches[0].y;
    }
    
    return false;
}

function touchEnded() 
{
    return false;
}

function windowResized() 
{
    resizeCanvas(windowWidth, windowHeight);
}