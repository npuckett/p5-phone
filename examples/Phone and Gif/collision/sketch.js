// Touch Collision Detection with Multiple Objects
// Demonstrates using collidePointRect() to detect touches on multiple moving objects
// Each space person can be touched independently!

// Global variables
let spaceSuitImg;
let spacePeople = []; // Array to hold multiple space person objects
let totalTouches = 0;
let backgroundColor;

// Simple SpacePerson class
class SpacePerson
{
    constructor(x, y)
    {
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 120;
        this.speedX = random(-2, 2);
        this.speedY = random(-2, 2);
        this.isTouched = false;
        this.celebrationTimer = 0;
        this.touchCount = 0;
    }
    
    update()
    {
        // Move the space person
        this.x = this.x + this.speedX;
        this.y = this.y + this.speedY;
        
        // Bounce off edges
        if (this.x - this.width/2 < 0 || this.x + this.width/2 > width)
        {
            this.speedX = this.speedX * -1;
        }
        if (this.y - this.height/2 < 0 || this.y + this.height/2 > height)
        {
            this.speedY = this.speedY * -1;
        }
        
        // Update celebration timer
        if (this.celebrationTimer > 0)
        {
            this.celebrationTimer = this.celebrationTimer - 1;
        }
    }
    
    display()
    {
        // Draw border (green if touched, white otherwise)
        if (this.isTouched || this.celebrationTimer > 0)
        {
            stroke(100, 255, 100);
            strokeWeight(6);
        }
        else
        {
            stroke(255);
            strokeWeight(2);
        }
        
        fill(255, 255, 255, 0);
        rectMode(CORNER);
        rect(this.x - this.width/2, this.y - this.height/2, this.width, this.height);
        
        // Display the space suit image (or placeholder if not loaded)
        noStroke();
        imageMode(CENTER);
        if (spaceSuitImg.width > 0)
        {
            image(spaceSuitImg, this.x, this.y, this.width, this.height);
        }
        else
        {
            // Placeholder: draw a simple astronaut shape
            fill(220);
            circle(this.x, this.y - 15, 40); // helmet
            fill(180);
            rect(this.x - 20, this.y, 40, 50); // body
            fill(220);
            rect(this.x - 25, this.y + 10, 10, 30); // left arm
            rect(this.x + 15, this.y + 10, 10, 30); // right arm
            fill(100, 150, 255);
            circle(this.x, this.y - 15, 25); // visor
        }
        
        // Show touch count for this space person
        fill(255);
        stroke(0);
        strokeWeight(3);
        textSize(20);
        textAlign(CENTER, CENTER);
        text(this.touchCount, this.x, this.y - this.height/2 - 20);
        
        // Reset touched state
        this.isTouched = false;
    }
    
    checkTouch(touchX, touchY)
    {
        // Calculate the top-left corner for collidePointRect
        let rectX = this.x - this.width/2;
        let rectY = this.y - this.height/2;
        
        // Use collidePointRect to check if touch is inside bounds
        if (collidePointRect(touchX, touchY, rectX, rectY, this.width, this.height))
        {
            this.isTouched = true;
            this.touchCount = this.touchCount + 1;
            this.celebrationTimer = 20;
            return true;
        }
        return false;
    }
}

function preload() 
{
    // Load the space suit image
    spaceSuitImg = loadImage('gifs/spaceSuit2.png');
}

function setup() 
{
    createCanvas(windowWidth, windowHeight);
    backgroundColor = color(20, 20, 40);
    
    // Lock mobile gestures to prevent browser interference
    lockGestures();
    
    // Create 5 space people at random positions
    for (let i = 0; i < 5; i = i + 1)
    {
        let x = random(100, width - 100);
        let y = random(100, height - 100);
        spacePeople.push(new SpacePerson(x, y));
    }
}

function draw() 
{
    background(backgroundColor);
    
    // Update and display all space people
    for (let i = 0; i < spacePeople.length; i = i + 1)
    {
        spacePeople[i].update();
        spacePeople[i].display();
    }
    
    // Display total touch counter
    fill(255);
    stroke(0);
    strokeWeight(4);
    textSize(32);
    textAlign(CENTER, CENTER);
    text("Total Touches: " + totalTouches, width/2, 40);
    
    // Instructions
    textSize(20);
    text("Touch the space people!", width/2, height - 50);
    
    // Show collision detection info
    textSize(16);
    fill(200);
    text("Using collidePointRect() - each object detects touches independently", width/2, height - 20);
}

function touchStarted() 
{
    // Check all touch points
    for (let i = 0; i < touches.length; i = i + 1)
    {
        let touchX = touches[i].x;
        let touchY = touches[i].y;
        
        // Check each space person for collision with this touch
        for (let j = 0; j < spacePeople.length; j = j + 1)
        {
            if (spacePeople[j].checkTouch(touchX, touchY))
            {
                totalTouches = totalTouches + 1;
                // Flash the background
                backgroundColor = color(50, 50, 100);
            }
        }
    }
    
    // Prevent default touch behavior and unwanted gestures
    return false;
}

function touchMoved() 
{
    // Check touches during movement too
    for (let i = 0; i < touches.length; i = i + 1)
    {
        let touchX = touches[i].x;
        let touchY = touches[i].y;
        
        // Check each space person
        for (let j = 0; j < spacePeople.length; j = j + 1)
        {
            spacePeople[j].checkTouch(touchX, touchY);
        }
    }
    
    // Prevent default touch behavior and unwanted gestures
    return false;
}

function touchEnded() 
{
    // Reset background color when touch ends
    backgroundColor = color(20, 20, 40);
    
    // Prevent default touch behavior and unwanted gestures
    return false;
}

function windowResized() 
{
    resizeCanvas(windowWidth, windowHeight);
}
