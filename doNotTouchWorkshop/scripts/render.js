(function() {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function linkOrMissing(label, href) {
    if (!href) return '<span aria-disabled="true">' + escapeHtml(label) + '</span>';
    return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer">' + escapeHtml(label) + '</a>';
  }

  function renderCard(example) {
    return `
      <article class="example-card workshop-card">
        <div class="qr-row">
          <div class="qr-code" id="qr-${escapeHtml(example.id)}"></div>
          <span class="example-meta">Scan to open on phone</span>
        </div>
        <h4>${escapeHtml(example.title)}</h4>
        <div class="example-meta"><strong>${escapeHtml(example.focus)}</strong> / ${escapeHtml(example.platform)}</div>
        <p>${escapeHtml(example.description)}</p>
        <div class="card-actions">
          ${linkOrMissing('Open', example.link)}
          ${linkOrMissing('Web Editor', example.webEditor || '')}
        </div>
      </article>
    `;
  }

  function makeQr(id, text, size) {
    const element = document.getElementById(id);
    if (!element || typeof QRCode === 'undefined') return;
    element.innerHTML = '';
    new QRCode(element, {
      text: text,
      width: size,
      height: size,
      colorDark: '#171717',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  }

  function renderCards(targetId, examples) {
    const target = document.getElementById(targetId);
    if (!target) return;
    target.innerHTML = examples.map(renderCard).join('');
    examples.forEach(example => makeQr('qr-' + example.id, example.qr || example.link, 132));
  }

  document.addEventListener('DOMContentLoaded', function() {
    makeQr('workshop-page-qr', window.DONOTTOUCH_PAGE_URL, 184);
    renderCards('existing-example-grid', window.DONOTTOUCH_EXISTING_EXAMPLES || []);
    renderCards('new-example-grid', window.DONOTTOUCH_NEW_EXAMPLES || []);
  });
})();