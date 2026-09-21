// Share Shared — mutate a room-wide shared object across phones.
// YOUR PROJECT SERVER (once):
//   cd companion/P5PhoneShare && npm install && npx wrangler login && npx wrangler deploy
//   → paste the printed https://….workers.dev into SHARE_HOST below
// INVITE FRIENDS: open this sketch on desktop → showDesktopQr() / copy the address bar
//   (join link already has ?shareHost=&room= — friends do not deploy)

const SHARE_HOST = 'https://YOUR_SUBDOMAIN.workers.dev'; // ← your wrangler deploy URL (or use ?shareHost=)

const COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  lockGestures();
  textAlign(CENTER, CENTER);
  textFont('system-ui');

  // host/room from URL (?shareHost=&room=) override these defaults when present
  shareSetup({
    host: SHARE_HOST,
    room: 'demo-shared',
    app: 'share-shared',
    shared: { score: 0, color: COLORS[0] }
  });

  enableShareTap({ label: 'Tap to join shared room' });
  showDesktopQr(); // desktop: QR + address bar carry join params for other phones
  showDebug();
}

function draw() {
  const bg = shareConnected && shared.color ? shared.color : '#111827';
  background(bg);

  fill(255);
  textSize(min(width * 0.045, 20));

  if (!shareConnected) {
    text(shareStatusText(), width / 2, height * 0.42, width * 0.85);
    return;
  }

  text('Room score (shared by all phones)', width / 2, height * 0.14);
  textSize(min(width * 0.18, 72));
  text(String(shared.score ?? 0), width / 2, height * 0.38);

  textSize(min(width * 0.04, 18));
  text('Tap: +1    Lower half: change color', width / 2, height * 0.58, width * 0.85);
  text(shareIsHost ? 'You are host' : 'Guest', width / 2, height * 0.72);
  text('room: ' + shareRoom, width / 2, height * 0.82);
}

function mousePressed() {
  if (!shareConnected) return false;

  if (mouseY < height * 0.5) {
    shared.score = (shared.score || 0) + 1;
  } else {
    const next = COLORS[floor(random(COLORS.length))];
    shared.color = next;
  }
  return false;
}

function shareReady() {
  debug('shareReady — connected as ' + (shareIsHost ? 'host' : 'guest'));
}

function shareClosed() {
  debug('shareClosed');
}

function shareStatusText() {
  if (window.shareError) return window.shareError;
  if (window.shareStatus === 'unsupported') {
    return 'WebSocket is not available in this browser.';
  }
  const hostMissing =
    (!SHARE_HOST || SHARE_HOST.includes('YOUR_SUBDOMAIN')) &&
    !(typeof location !== 'undefined' && location.search && location.search.indexOf('shareHost=') !== -1);
  if (hostMissing) {
    return 'Set SHARE_HOST in sketch.js, or open a link with ?shareHost=…&room=demo-shared';
  }
  return 'Tap to join. On desktop, scan the QR (or share the address bar link).';
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
