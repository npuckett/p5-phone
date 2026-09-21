// Share Presence — each phone has its own me cursor; guests[] shows everyone else.
// Deploy YOUR worker: companion/P5PhoneShare → wrangler deploy → set SHARE_HOST.
// Friends: scan showDesktopQr() / open the address-bar join link (no deploy needed).

const SHARE_HOST = 'https://YOUR_SUBDOMAIN.workers.dev'; // ← your wrangler deploy URL (or use ?shareHost=)

function randomHue() {
  return floor(random(360));
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  colorMode(HSB, 360, 100, 100, 100);
  textAlign(CENTER, CENTER);
  textFont('system-ui');

  shareSetup({
    host: SHARE_HOST,
    room: 'demo-presence',
    app: 'share-presence',
    me: {
      x: 0.5,
      y: 0.5,
      hue: randomHue(),
      name: 'p' + floor(random(100, 999))
    }
  });

  enableShareTap({ label: 'Tap to join presence room' });
  showDesktopQr();
  showDebug();
}

function draw() {
  background(220, 12, 12);

  if (!shareConnected) {
    fill(0, 0, 95);
    textSize(min(width * 0.045, 20));
    text(shareStatusText(), width / 2, height * 0.42, width * 0.85);
    return;
  }

  for (let i = 0; i < guests.length; i++) {
    drawPlayer(guests[i], false);
  }
  drawPlayer(me, true);

  fill(0, 0, 90);
  textSize(min(width * 0.038, 16));
  text('Drag to move · ' + (guests.length + 1) + ' online', width / 2, height * 0.06);
}

function drawPlayer(p, isSelf) {
  if (!p) return;
  const x = (p.x ?? 0.5) * width;
  const y = (p.y ?? 0.5) * height;
  const hue = p.hue ?? 200;
  noStroke();
  fill(hue, 80, 90, isSelf ? 100 : 75);
  circle(x, y, isSelf ? 56 : 44);
  fill(0, 0, 100);
  textSize(12);
  text(p.name || '?', x, y);
}

function mouseDragged() {
  if (!shareConnected) return false;
  me.x = constrain(mouseX / width, 0, 1);
  me.y = constrain(mouseY / height, 0, 1);
  return false;
}

function mousePressed() {
  if (!shareConnected) return false;
  me.x = constrain(mouseX / width, 0, 1);
  me.y = constrain(mouseY / height, 0, 1);
  return false;
}

function shareReady() {
  debug('shareReady as ' + me.name);
}

function shareStatusText() {
  if (window.shareError) return window.shareError;
  const hostMissing =
    (!SHARE_HOST || SHARE_HOST.includes('YOUR_SUBDOMAIN')) &&
    !(typeof location !== 'undefined' && location.search && location.search.indexOf('shareHost=') !== -1);
  if (hostMissing) {
    return 'Set SHARE_HOST in sketch.js, or open a link with ?shareHost=…&room=demo-presence';
  }
  return 'Tap to join. Scan the desktop QR or open the shared link.';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
