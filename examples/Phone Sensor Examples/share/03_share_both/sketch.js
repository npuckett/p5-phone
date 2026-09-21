// Share Both — shared scoreboard + per-player cursors + shareEmit('pulse').
// Deploy YOUR worker: companion/P5PhoneShare → wrangler deploy → set SHARE_HOST.
// Invite others with showDesktopQr() / the address-bar join link.

const SHARE_HOST = 'https://YOUR_SUBDOMAIN.workers.dev'; // ← your wrangler deploy URL (or use ?shareHost=)

let pulses = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');

  shareSetup({
    host: SHARE_HOST,
    room: 'demo-both',
    app: 'share-both',
    shared: { score: 0 },
    me: {
      x: 0.5,
      y: 0.5,
      color: '#' + floor(random(0x1000000)).toString(16).padStart(6, '0')
    }
  });

  enableShareTap({ label: 'Tap to join' });
  showDesktopQr();
  showDebug();
}

function draw() {
  background(15, 18, 28);

  for (let i = pulses.length - 1; i >= 0; i--) {
    const p = pulses[i];
    p.r += 4;
    p.a -= 4;
    noFill();
    stroke(255, 200, 80, p.a);
    strokeWeight(3);
    circle(p.x * width, p.y * height, p.r);
    if (p.a <= 0) pulses.splice(i, 1);
  }

  if (!shareConnected) {
    fill(240);
    noStroke();
    textSize(min(width * 0.045, 20));
    text(shareStatusText(), width / 2, height * 0.42, width * 0.85);
    return;
  }

  noStroke();
  for (let i = 0; i < guests.length; i++) {
    drawDot(guests[i]);
  }
  drawDot(me);

  fill(255);
  textSize(min(width * 0.05, 22));
  text('Score ' + (shared.score ?? 0), width / 2, height * 0.08);
  textSize(min(width * 0.035, 15));
  fill(180);
  text('Drag to move · Top: +1 · Bottom: pulse', width / 2, height * 0.92, width * 0.9);
}

function drawDot(p) {
  if (!p) return;
  fill(p.color || '#7dd3fc');
  circle((p.x ?? 0.5) * width, (p.y ?? 0.5) * height, 40);
}

function mouseDragged() {
  if (!shareConnected) return false;
  me.x = constrain(mouseX / width, 0, 1);
  me.y = constrain(mouseY / height, 0, 1);
  return false;
}

function mousePressed() {
  if (!shareConnected) return false;

  if (mouseY > height * 0.85) {
    shareEmit('pulse', { x: me.x, y: me.y });
    pulses.push({ x: me.x, y: me.y, r: 10, a: 200 });
  } else if (mouseY < height * 0.2) {
    shared.score = (shared.score || 0) + 1;
  } else {
    me.x = constrain(mouseX / width, 0, 1);
    me.y = constrain(mouseY / height, 0, 1);
  }
  return false;
}

function shareEvent(name, data) {
  if (name === 'pulse' && data) {
    pulses.push({ x: data.x ?? 0.5, y: data.y ?? 0.5, r: 10, a: 200 });
  }
}

function shareReady() {
  debug('shareReady both-mode');
}

function shareStatusText() {
  if (window.shareError) return window.shareError;
  const hostMissing =
    (!SHARE_HOST || SHARE_HOST.includes('YOUR_SUBDOMAIN')) &&
    !(typeof location !== 'undefined' && location.search && location.search.indexOf('shareHost=') !== -1);
  if (hostMissing) {
    return 'Set SHARE_HOST in sketch.js, or open a link with ?shareHost=…&room=demo-both';
  }
  return 'Tap to join. Scan the desktop QR or open the shared link.';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
