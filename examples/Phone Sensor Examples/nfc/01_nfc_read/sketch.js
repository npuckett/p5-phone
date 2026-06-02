// NFC Tag Identifier Example
// Scan tags, give each tag an alias, and download the tag list for later sketches.
// Requires Android Chrome 89+ over HTTPS. Not supported on iOS.

let tagsById = {};
let tagList = [];
let currentTag = null;
let scanCount = 0;
let controlPanel;
let aliasInput;
let saveAliasButton;
let downloadButton;

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textWrap(WORD);

  setupAliasControls();
  enableNfcTap('Tap to enable NFC');
}

function draw() {
  background(24, 26, 30);

  drawHeader();

  if (window.nfcEnabled) {
    drawTagState();
  } else {
    drawWaitingState();
  }
}

function drawHeader() {
  fill(245);
  textSize(30);
  text('NFC Tag Identifier', width / 2, 48);

  fill(170);
  textSize(15);
  text('Scans: ' + scanCount + '   Named tags: ' + namedTagCount(), width / 2, 86);
}

function drawWaitingState() {
  textSize(28);
  fill(255);
  text('Waiting for NFC', width / 2, height / 2 - 52);

  textSize(16);
  fill(window.nfcError ? color(255, 190, 130) : color(180));
  text(nfcStatusText(), width / 2, height / 2 + 16, width - 44);
}

function drawTagState() {
  fill(116, 255, 174);
  textSize(17);
  text('NFC scanning active', width / 2, 126);

  if (!currentTag) {
    fill(255);
    textSize(34);
    text('Scan a tag', width / 2, height / 2 - 28);

    fill(170);
    textSize(18);
    text('Hold an NFC tag near your phone', width / 2, height / 2 + 28, width - 44);
    return;
  }

  const centerY = min(height * 0.52, height - 235);
  const tagAlias = currentTag.alias || getNfcTagAlias(currentTag.serialNumber);

  fill(170);
  textSize(16);
  text('Current tag ID', width / 2, centerY - 104);

  fill(255);
  setFittingTextSize(currentTag.serialNumber, width - 38, 34, 18);
  text(currentTag.serialNumber, width / 2, centerY - 58, width - 38);

  fill(tagAlias ? color(116, 255, 174) : color(255, 210, 140));
  textSize(tagAlias ? 34 : 28);
  text(tagAlias || 'Unnamed tag', width / 2, centerY + 14, width - 44);

  fill(170);
  textSize(16);
  text('Seen ' + currentTag.scans + ' time' + pluralSuffix(currentTag.scans), width / 2, centerY + 70);
}

function setupAliasControls() {
  controlPanel = createDiv();
  controlPanel.style('position', 'fixed');
  controlPanel.style('left', '0');
  controlPanel.style('bottom', '0');
  controlPanel.style('width', '100%');
  controlPanel.style('box-sizing', 'border-box');
  controlPanel.style('padding', '14px 16px 18px');
  controlPanel.style('background', 'rgba(10, 12, 16, 0.92)');
  controlPanel.style('border-top', '1px solid rgba(255, 255, 255, 0.18)');
  controlPanel.style('font-family', '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif');

  aliasInput = createInput('', 'text');
  aliasInput.parent(controlPanel);
  aliasInput.attribute('placeholder', 'Alias for this tag');
  aliasInput.attribute('autocomplete', 'off');
  aliasInput.style('width', '100%');
  aliasInput.style('box-sizing', 'border-box');
  aliasInput.style('font-size', '18px');
  aliasInput.style('padding', '12px 14px');
  aliasInput.style('border', '1px solid rgba(255, 255, 255, 0.25)');
  aliasInput.style('border-radius', '6px');
  aliasInput.style('background', '#ffffff');
  aliasInput.style('color', '#111111');

  saveAliasButton = createButton('Save Alias');
  saveAliasButton.parent(controlPanel);
  saveAliasButton.mousePressed(saveAliasForCurrentTag);
  styleControlButton(saveAliasButton, '#74ffae', '#07140d');

  downloadButton = createButton('Download Tag List');
  downloadButton.parent(controlPanel);
  downloadButton.mousePressed(downloadTagList);
  styleControlButton(downloadButton, '#f0c96a', '#171101');
}

function styleControlButton(buttonElement, backgroundColor, textColor) {
  buttonElement.style('width', '100%');
  buttonElement.style('box-sizing', 'border-box');
  buttonElement.style('margin-top', '10px');
  buttonElement.style('font-size', '17px');
  buttonElement.style('font-weight', '700');
  buttonElement.style('padding', '12px 14px');
  buttonElement.style('border', '0');
  buttonElement.style('border-radius', '6px');
  buttonElement.style('background', backgroundColor);
  buttonElement.style('color', textColor);
}

function nfcRead(message, serialNumber) {
  const tag = rememberTag(message, serialNumber);
  currentTag = tag;
  scanCount++;
  aliasInput.value(tag.alias);
}

function rememberTag(message, serialNumber) {
  const tagId = serialNumber || 'unknown-tag';
  const tagKey = tagId.toLowerCase();
  let tag = tagsById[tagKey];

  if (!tag) {
    tag = {
      serialNumber: tagId,
      alias: getNfcTagAlias(tagId),
      scans: 0,
      records: []
    };
    tagsById[tagKey] = tag;
    tagList.push(tag);
  }

  tag.scans++;
  tag.records = message.records || [];
  tag.alias = getNfcTagAlias(tagId) || tag.alias || '';
  return tag;
}

function saveAliasForCurrentTag() {
  if (!currentTag) {
    return;
  }

  const tagAlias = aliasInput.value().trim();
  setNfcTagAlias(currentTag.serialNumber, tagAlias);
  currentTag.alias = getNfcTagAlias(currentTag.serialNumber);
  aliasInput.value(currentTag.alias);
}

function downloadTagList() {
  const fileText = buildTagListText();
  const fileBlob = new Blob([fileText], { type: 'text/plain' });
  const fileUrl = URL.createObjectURL(fileBlob);
  const downloadLink = document.createElement('a');

  downloadLink.href = fileUrl;
  downloadLink.download = 'nfc-tag-names.txt';
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(fileUrl);
}

function buildTagListText() {
  const lines = [
    'NFC tag names',
    'Generated: ' + new Date().toLocaleString(),
    '',
    'Use these aliases in your sketch:',
    'if (isNfcTag("example alias")) {',
    '  // do something',
    '}',
    ''
  ];

  if (tagList.length === 0) {
    lines.push('No tags scanned yet.');
    return lines.join('\n');
  }

  lines.push('Tags:');
  for (const tag of tagList) {
    const tagAlias = tag.alias || getNfcTagAlias(tag.serialNumber) || 'Unnamed tag';
    lines.push('- ' + tagAlias);
    lines.push('  id: ' + tag.serialNumber);
    lines.push('  scans: ' + tag.scans);
  }

  lines.push('');
  lines.push('Paste these lines into setup():');
  for (const tag of tagList) {
    const tagAlias = tag.alias || getNfcTagAlias(tag.serialNumber);
    if (tagAlias) {
      lines.push('setNfcTagAlias(' + jsString(tag.serialNumber) + ', ' + jsString(tagAlias) + ');');
    }
  }

  return lines.join('\n');
}

function jsString(value) {
  return '\'' + String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\'';
}

function namedTagCount() {
  let count = 0;

  for (const tag of tagList) {
    if (tag.alias || getNfcTagAlias(tag.serialNumber)) {
      count++;
    }
  }

  return count;
}

function setFittingTextSize(textValue, maxWidth, maxSize, minSize) {
  let fittedSize = maxSize;
  textSize(fittedSize);

  while (textWidth(textValue) > maxWidth && fittedSize > minSize) {
    fittedSize--;
    textSize(fittedSize);
  }
}

function pluralSuffix(count) {
  return count === 1 ? '' : 's';
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
