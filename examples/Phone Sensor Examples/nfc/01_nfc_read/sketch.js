// NFC Tag Reader Example
// Reads NFC tags and displays their content on screen.
// Requires Android Chrome 89+ — not supported on iOS.

let tagInfo = '';
let scanCount = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textWrap(WORD);

  enableNfcTap('Tap to enable NFC');
}

function draw() {
  background(30);
  fill(255);

  if (!window.nfcEnabled) {
    textSize(24);
    text('Waiting for NFC...', width / 2, height / 2 - 40);

    textSize(14);
    fill(window.nfcError ? color(255, 180, 120) : color(180));
    text(nfcStatusText(), width / 2, height / 2 + 20, width - 40);
    return;
  }

  // Header
  textSize(18);
  fill(100, 255, 100);
  text('NFC Scanning Active', width / 2, 40);

  // Scan count
  textSize(14);
  fill(180);
  text('Tags scanned: ' + scanCount, width / 2, 70);

  if (window.nfcError) {
    textSize(13);
    fill(255, 180, 120);
    text(window.nfcError, width / 2, 100, width - 40);
  }

  // Tag info
  if (tagInfo) {
    textSize(16);
    fill(255);
    text(tagInfo, width / 2, height / 2, width - 40);
  } else {
    textSize(20);
    fill(150);
    text('Hold an NFC tag\nnear your phone', width / 2, height / 2);
  }
}

// Called automatically when an NFC tag is read
function nfcRead(message, serialNumber) {
  scanCount++;
  tagInfo = 'Serial: ' + serialNumber;

  for (let record of message.records) {
    tagInfo += '\n\nType: ' + record.recordType;
    if (record.recordType === 'text' || record.recordType === 'url') {
      tagInfo += '\nData: ' + record.data;
    }
  }
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
