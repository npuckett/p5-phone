// GPS Watch + Distance Example
// Shows your live position and how far you have moved from the first fix.
// Works on iOS Safari and Android Chrome over HTTPS.
//
// The first GPS fix can take 5-30 seconds (cold start) — watch the status text.

let origin = null;       // first position fix, becomes the distance reference
let traveled = 0;        // meters traveled from origin (straight-line)
let readings = 0;        // how many position updates we have received
let lastUpdate = 0;      // ms timestamp of the most recent reading

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textWrap(WORD);

  // Real GPS (~5-10m outdoors). Comment this line out for the coarse,
  // battery-friendly default (~50-100m, faster fix).
  setGeoOptions({ enableHighAccuracy: true });

  enableGeoTap('Tap to enable GPS');
}

function draw() {
  background(22, 24, 30);

  drawHeader();
  drawBody();
}

function drawHeader() {
  fill(245);
  textSize(28);
  text('GPS Watch', width / 2, 50);

  fill(170);
  textSize(15);
  const subline = readings > 0
    ? 'Readings: ' + readings + '   Updated: ' + ageText(lastUpdate) + ' ago'
    : 'Waiting for the first fix…';
  text(subline, width / 2, 84);
}

function drawBody() {
  const pos = window.lastGeoPosition;

  if (window.geoStatus === 'requesting-permission') {
    fill(255);
    textSize(26);
    text('Acquiring GPS…', width / 2, height / 2 - 24);

    fill(180);
    textSize(15);
    text('Cold start can take 5-30s. If prompted, tap Allow.', width / 2, height / 2 + 20, width - 44);
    return;
  }

  if (window.geoError && !pos) {
    fill(255, 150, 150);
    textSize(18);
    text(window.geoError, width / 2, height / 2, width - 44);
    return;
  }

  if (!pos) {
    fill(200);
    textSize(20);
    text('Tap the screen to enable GPS', width / 2, height / 2);
    return;
  }

  // Live position block
  const centerY = height / 2;

  fill(116, 255, 174);
  textSize(16);
  text('Your position', width / 2, centerY - 96);

  fill(255);
  textSize(30);
  text(pos.latitude.toFixed(5), width / 2, centerY - 60);
  text(pos.longitude.toFixed(5), width / 2, centerY - 24);

  fill(170);
  textSize(16);
  text('±' + Math.round(pos.accuracy) + ' m accuracy', width / 2, centerY + 12);

  // Distance traveled
  fill(116, 255, 174);
  textSize(16);
  text('Distance from start', width / 2, centerY + 56);

  fill(255);
  textSize(34);
  text(formatDistance(traveled), width / 2, centerY + 96);
}

// p5-phone calls this whenever a new position arrives.
function geoRead(position) {
  if (!origin) {
    origin = position;          // lock in the first fix as the origin
  } else {
    traveled = geoDistance(
      origin.latitude, origin.longitude,
      position.latitude, position.longitude, 'm'
    );
  }
  readings++;
  lastUpdate = millis();
}

// Optional: stream errors (timeouts while indoors, transient losses).
function onGeoError(error) {
  // error.code: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
  // Timeouts (3) are common during cold start or indoors and are usually
  // transient — p5-phone keeps the watch alive and does not clear a
  // previous good position on a timeout.
}

function formatDistance(meters) {
  if (meters < 1000) {
    return meters.toFixed(1) + ' m';
  }
  return (meters / 1000).toFixed(2) + ' km';
}

function ageText(timestamp) {
  if (!timestamp) return '—';
  const delta = Math.round((millis() - timestamp) / 1000);
  if (delta < 60) return delta + 's';
  return Math.floor(delta / 60) + 'm ' + (delta % 60) + 's';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
