// NFC Two Tag Effects Example
// Paste two tag IDs from the NFC Tag Identifier example, then use aliases in if statements.
// Requires Android Chrome 89+ over HTTPS. Not supported on iOS.

const tagIds = {
  shirt: '', // Paste the serial number for your shirt tag here.
  table: ''  // Paste the serial number for your table tag here.
};

let scanCount = 0;
let shirtReads = 0;
let tableReads = 0;
let lastTagLabel = 'No tag scanned yet';
let lastScanTime = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  rectMode(CENTER);
  textWrap(WORD);

  setupTagAliases();
  enableNfcTap('Tap to enable NFC');
}

function setupTagAliases() {
  setAliasIfPresent(tagIds.shirt, 'shirt');
  setAliasIfPresent(tagIds.table, 'table');
}

function setAliasIfPresent(serialNumber, alias) {
  const tagId = String(serialNumber).trim();

  if (tagId !== '') {
    setNfcTagAlias(tagId, alias);
  }
}

function draw() {
  background(24, 26, 30);

  if (window.nfcEnabled) {
    if (isNfcTag('shirt')) {
      drawShirtEffect();
    } else if (isNfcTag('table')) {
      drawTableEffect();
    } else {
      drawReadyState();
    }
  } else {
    drawWaitingState();
  }

  drawStatusBar();
}

function nfcRead(message, serialNumber) {
  scanCount++;
  lastScanTime = millis();
  lastTagLabel = message.alias || serialNumber || 'Unknown tag';

  if (isNfcTag('shirt', serialNumber)) {
    shirtReads++;
  }

  if (isNfcTag('table', serialNumber)) {
    tableReads++;
  }
}

function drawWaitingState() {
  fill(255);
  textSize(32);
  text('Waiting for NFC', width / 2, height / 2 - 38);

  fill(window.nfcError ? color(255, 190, 130) : color(180));
  textSize(16);
  text(nfcStatusText(), width / 2, height / 2 + 28, width - 44);
}

function drawReadyState() {
  fill(116, 255, 174);
  textSize(20);
  text('NFC scanning active', width / 2, 86);

  fill(255);
  textSize(34);
  text('Scan shirt or table', width / 2, height / 2 - 30, width - 44);

  fill(170);
  textSize(18);
  text(setupHintText(), width / 2, height / 2 + 44, width - 56);
}

function drawShirtEffect() {
  background(220, 72, 92);
  const pulse = 1 + sin((millis() - lastScanTime) * 0.01) * 0.08;

  fill(255, 235);
  noStroke();
  push();
  translate(width / 2, height / 2 - 30);
  scale(pulse);
  drawShirtShape(0, 0, min(width * 0.46, 210));
  pop();

  fill(255);
  textSize(42);
  text('shirt', width / 2, height / 2 + 150);
}

function drawTableEffect() {
  background(48, 96, 176);
  const lift = sin((millis() - lastScanTime) * 0.008) * 8;

  fill(255, 235);
  noStroke();
  push();
  translate(width / 2, height / 2 + lift);
  drawTableShape(0, 0, min(width * 0.62, 260));
  pop();

  fill(255);
  textSize(42);
  text('table', width / 2, height / 2 + 150);
}

function drawShirtShape(x, y, size) {
  const half = size / 2;
  beginShape();
  vertex(x - half * 0.9, y - half * 0.45);
  vertex(x - half * 0.42, y - half * 0.8);
  vertex(x - half * 0.22, y - half * 0.45);
  vertex(x + half * 0.22, y - half * 0.45);
  vertex(x + half * 0.42, y - half * 0.8);
  vertex(x + half * 0.9, y - half * 0.45);
  vertex(x + half * 0.55, y + half * 0.05);
  vertex(x + half * 0.38, y - half * 0.08);
  vertex(x + half * 0.38, y + half * 0.85);
  vertex(x - half * 0.38, y + half * 0.85);
  vertex(x - half * 0.38, y - half * 0.08);
  vertex(x - half * 0.55, y + half * 0.05);
  endShape(CLOSE);
}

function drawTableShape(x, y, size) {
  const topWidth = size;
  const topHeight = size * 0.18;
  const legHeight = size * 0.56;
  const legWidth = size * 0.12;

  rect(x, y - legHeight * 0.35, topWidth, topHeight, 8);
  rect(x - topWidth * 0.34, y + legHeight * 0.18, legWidth, legHeight, 6);
  rect(x + topWidth * 0.34, y + legHeight * 0.18, legWidth, legHeight, 6);
}

function drawStatusBar() {
  noStroke();
  fill(0, 0, 0, 150);
  rect(width / 2, height - 46, width, 92);

  fill(255);
  textSize(16);
  text('Last tag: ' + lastTagLabel, width / 2, height - 65, width - 36);

  fill(190);
  textSize(13);
  text('Scans: ' + scanCount + '   shirt: ' + shirtReads + '   table: ' + tableReads, width / 2, height - 30);
}

function setupHintText() {
  const missingAliases = [];

  if (String(tagIds.shirt).trim() === '') {
    missingAliases.push('shirt');
  }

  if (String(tagIds.table).trim() === '') {
    missingAliases.push('table');
  }

  if (missingAliases.length > 0) {
    return 'Paste tag IDs into tagIds for: ' + missingAliases.join(', ');
  }

  return 'Hold one of your named tags near the phone.';
}

function nfcStatusText() {
  if (window.nfcError) {
    return window.nfcError;
  }

  if (window.nfcStatus === 'starting' || window.nfcStatus === 'requesting-permission') {
    return 'Starting NFC. If Chrome asks, tap Allow.';
  }

  if (window.nfcStatus === 'unsupported') {
    return 'Use Android Chrome 89+ on an HTTPS page.';
  }

  return 'Tap the screen to start NFC scanning.';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}