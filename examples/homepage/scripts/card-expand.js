(function() {
  const collapsedQrSize = 132;

  function expandedQrSize() {
    return Math.max(220, Math.min(560, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.62)));
  }

  function renderQr(element, size) {
    if (!element || typeof QRCode === 'undefined') return;
    const text = element.dataset.qrText;
    if (!text) return;

    element.innerHTML = '';
    new QRCode(element, {
      text,
      width: size,
      height: size,
      colorDark: '#171717',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  function setExpanded(card, expanded) {
    const button = card.querySelector('.qr-expand-button');
    const qrCode = card.querySelector('.qr-code');
    card.classList.toggle('qr-expanded', expanded);

    if (button) {
      button.textContent = expanded ? '-' : '+';
      button.setAttribute('aria-expanded', String(expanded));
      button.setAttribute('aria-label', expanded ? 'Collapse QR code' : 'Expand QR code');
    }

    renderQr(qrCode, expanded ? expandedQrSize() : collapsedQrSize);
    document.body.classList.toggle('qr-card-open', Boolean(document.querySelector('.example-card.qr-expanded')));
  }

  function collapseOtherCards(card) {
    document.querySelectorAll('.example-card.qr-expanded').forEach(openCard => {
      if (openCard !== card) setExpanded(openCard, false);
    });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.qr-expand-button');
    if (!button) return;

    const card = button.closest('.example-card');
    if (!card) return;

    const shouldExpand = !card.classList.contains('qr-expanded');
    if (shouldExpand) collapseOtherCards(card);
    setExpanded(card, shouldExpand);
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.example-card.qr-expanded').forEach(card => setExpanded(card, false));
  });

  window.addEventListener('resize', () => {
    document.querySelectorAll('.example-card.qr-expanded .qr-code').forEach(qrCode => {
      renderQr(qrCode, expandedQrSize());
    });
  });
})();