# Overview (do not print this part)
I am teaching a 1.5 hour workshop using p5-phone. The idea is to introduce the library and have people quickly build some fun interfaces using their phone + simple materials to make simple, fun interactions. 

It is a workshop for ITP camp, so call the folder: doNotTouchWorkshop

I want to create a seperate website folder within this repo to use as a workshop guide

- Use the same styling as the main docs page for simplicity

# Workshop: Do Not Touch : Phones for Creative Interaction
Generate a QR code for the page on github pages


We all know that our phones steal our time, data, democracy, water…but we still have them in our pocket! In this session you will make a first step in understanding your phone as a creative computer equipped with inputs and outputs that can be used to develop creative interactions.

We will do this by combining P5 Phone, a library that simplifies accessing your phone hardware in the browser, with advanced materials like paper, string, tape, and fabric. The only rule : No touch input. Sound, speech, motion, NFC, vibration, or body tracking will be used to make simple, delightful new interactions that help you see your phone in a new light.

The workshop is BYOP (Bring Your Own Phone) and works with either iPhone or Android (there are few things that are Android only). It will be a hands-on session that assumes a basic knowledge of p5.js and programming concepts but is aimed at all skill levels.

## Introduction - Me
Hi, I'm Nick
Associate Professor, Digital Futures
Co-Director, Social Body Lab
OCADU, Toronto

See more about my work here: https://puckettrand.com/

## The Library P5-Phone
Link for full documentation - https://npuckett.github.io/p5-phone/examples/homepage/#start

## Why does P5-Phone exist?
- Phones are full of delightful hardware
Input
- - Touch Screen
- - Gyroscope
- - Accelerometer
- - Magnetometer
- - Microphone
- - Multiple Cameras
- - NFC reader
Output
- - Fancy Screen
- - Speakers
- - Vibration Motors
### Browsers for experimentation

- Browsers have gotten more powerful, but constantly change how to gain access to hardware **in the browser**. P5 does a great job of simplifying reading the data, P5-phone works with *access*
- App stores are not designed for experimentation, but the browser is.

## Interaction Scenarios
Using this hardware creates an opportunity to generate interface values in new ways
- Events 
- - Shaking / Moving your phone
- - Creating simple thresholds of position / movement
ie 
if the velocity of my phone is above XX , play a sound
if the angle of my phone in Z is between X and Y, play a video
if the volume from my microphone is below XXX, draw a happy face
if you read the nfc tag on my cat's collar, play a song
if my mouth is open, shoot particles out of it
if my nose goes in the bottom half of the screen, vibrate the phone

- Value ranges (fancy sliders)
map the rotation in X, Y, Z to color
map the rotation in Z to control the speed of a gif
map the speed in X to the volume of a sound
map the angle between my thumb and index finger to opacity

# A few Examples
- More here: https://npuckett.github.io/p5-phone/examples/homepage/#examples
- Use existing cards styles

## Data Examples 1 
- Orientation
- Rotational Velocity
- Acceleration
- Device Shaken
- Device Moved
- Device Orientation
- Microphone
- Two Tag Effects (Android Only)
- Vibration (Android Only)

Focus on the type of data being produced and where it is stored in the code

# Camera
Uses ML5, but adds methods to adapt it to phone
Think about how which camera you use changes the experience

- PHONE FaceMesh Two Points
- PHONE BodyPose Two Points
- PHONE HandPose Two Points
- Gaze Detector Class


## Workflow - Code on your computer, Interact on your phone
- Your code has to be hosted on a publicly accessible server
- - Can be any server (not localhost)
- - P5 Web editor is the easiest

### Web Editor Workflow
- Use Chrome or Edge 
- Make sure you are logged in (create a free account if you need)
- Start with an existing web editor file such as: https://editor.p5js.org/npuckett/sketches/-_pUgcYmW

1. Save the file so it is associated with your account
2. Get the fullscreen link: File - > Share
Click the Arrow icon under 'Share Sketch As View-Only' to open it in a new tab
3. Generate a QR Code, so you can open the link on your phone
Google Chrome has a built-in QR Code generator. Below are instructions on how to generate a QR Code within the Google Chrome browser. 
Click the 3 dots on the top right corner of the Google Chrome browser 
Scroll down and click Cast, Save, and Share
Click Create QR Code
4. Use your phone to scan the QR code and open the page
5. Change the code in the web editor
6. Press Save in the editor
7. Refresh your phone to see the update



- If you start with a blank file, include the library as a script tag
<script
  src="https://cdn.jsdelivr.net/npm/p5-phone@1.12.1/dist/p5-phone.min.js">
</script>
and follow Quick Start: https://npuckett.github.io/p5-phone/examples/homepage/#quick-start

## A few simple examples
- Motion Synth
- Phone and GIF Roll
- *New* if my mouth is open, shoot particles out of it
- map the angle between my thumb and index finger to opacity of image from internet archive https://dn710708.ca.archive.org/0/items/AILS_AC89-0437-6/AC89-0437-6.jpg

Other fun NASA images https://archive.org/details/nasa?page=3&and%5B%5D=mediatype%3A%22image%22


# Now Let's build something
- Come grab some supplies
- Start with a simple interaction or mapping of values
- Use the materials to guide the interaction

# Library questions
- Full documentation : https://npuckett.github.io/p5-phone/examples/homepage/#start

- If you are using Ai/Chat for code help
- - Download the library Skill.md file (use githubio link examples/SKILL.zip)
- - Add it to your chat of choice as context
