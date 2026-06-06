(function() {
  const CF = window.P5PHONE_CATALOG_FILTERS;

  function escapeHtml(value) {
    return CF.escapeHtml(value);
  }

  function linkOrMissing(label, href) {
    if (!href) return '<span aria-disabled="true">' + escapeHtml(label) + '</span>';
    return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer">' + escapeHtml(label) + '</a>';
  }

  function normalizeTags(example) {
    return CF.normalizeTags(example);
  }

  function normalizePlatforms(example) {
    return CF.normalizePlatforms(example);
  }

  const API_REFERENCE_RULES = [
    { tags: ['motion'], group: 'p5-phone', label: 'enableSensorTap()', href: '../examples/homepage/#api-motion' },
    { tags: ['orientation'], group: 'External', label: 'rotationX / rotationY / rotationZ', href: 'https://p5js.org/reference/p5/rotationX/' },
    { tags: ['gyroscope'], group: 'External', label: 'p5 rotation rates', href: 'https://p5js.org/reference/p5/rotationX/' },
    { tags: ['accelerometer'], group: 'External', label: 'p5 acceleration values', href: 'https://p5js.org/reference/p5/accelerationX/' },
    { tags: ['deviceShaken'], group: 'External', label: 'deviceShaken()', href: 'https://p5js.org/reference/p5/deviceShaken/' },
    { tags: ['deviceMoved'], group: 'External', label: 'deviceMoved()', href: 'https://p5js.org/reference/p5/deviceMoved/' },
    { tags: ['microphone'], group: 'p5-phone', label: 'enableMicTap()', href: '../examples/homepage/#api-audio' },
    { tags: ['sound'], group: 'p5-phone', label: 'enableSoundTap()', href: '../examples/homepage/#api-audio' },
    { tags: ['nfc'], group: 'p5-phone', label: 'enableNfcTap()', href: '../examples/homepage/#api-nfc' },
    { tags: ['vibration'], group: 'p5-phone', label: 'vibrate()', href: '../examples/homepage/#api-vibration' },
    { tags: ['torch'], group: 'p5-phone', label: 'toggleTorch()', href: '../examples/homepage/#api-torch' },
    { tags: ['camera'], group: 'p5-phone', label: 'createPhoneCamera()', href: '../examples/homepage/#api-camera' },
    { tags: ['color'], group: 'External', label: 'p5 pixels[]', href: 'https://p5js.org/reference/p5/pixels/' },
    { tags: ['ml5'], group: 'External', label: 'ml5.js', href: 'https://docs.ml5js.org/' },
    { tags: ['facemesh'], group: 'External', label: 'ml5.faceMesh()', href: 'https://docs.ml5js.org/#/reference/facemesh' },
    { tags: ['handpose'], group: 'External', label: 'ml5.handPose()', href: 'https://docs.ml5js.org/#/reference/handpose' },
    { tags: ['gaze'], group: 'External', label: 'GazeDetector', href: '../examples/ml5/Gaze_detector_class/' }
  ];

  const FILTER_SCHEMA = {
    search: 'workshop-search',
    platform: 'workshop-platform-filter',
    tag: 'workshop-tag-filter'
  };

  function inferApiReferences(example) {
    if (example.apiReferences) return example.apiReferences;
    const tags = normalizeTags(example);
    const groups = [];

    API_REFERENCE_RULES.forEach(rule => {
      if (!rule.tags.some(tag => tags.includes(tag))) return;
      let group = groups.find(item => item.group === rule.group);
      if (!group) {
        group = { group: rule.group, links: [] };
        groups.push(group);
      }
      if (!group.links.some(link => link.label === rule.label)) {
        group.links.push({ label: rule.label, href: rule.href });
      }
    });

    return groups;
  }

  function renderTagLinks(tags, kind) {
    return CF.renderTagLinks(tags, kind, 'open-first');
  }

  function renderReferenceDrawer(example) {
    const references = inferApiReferences(example).filter(group => group.links && group.links.length);
    if (!references.length) return '';
    return `
      <details class="reference-drawer">
        <summary>API references</summary>
        <div class="reference-body">
          ${references.map(group => `
            <div class="reference-group">
              <strong>${escapeHtml(group.group)}</strong>
              ${group.links.map(link => '<a href="' + escapeHtml(link.href) + '" target="_blank" rel="noreferrer">' + escapeHtml(link.label) + '</a>').join('')}
            </div>
          `).join('')}
        </div>
      </details>
    `;
  }

  function exampleMatches(example, filters) {
    const queryText = [
      example.title,
      example.focus,
      CF.formatPlatformSummary(example),
      example.description,
      normalizePlatforms(example).join(' '),
      normalizeTags(example).join(' ')
    ].join(' ').toLowerCase();

    if (filters.search && !queryText.includes(filters.search)) return false;
    if (filters.platform && !normalizePlatforms(example).includes(filters.platform)) return false;
    if (filters.tag && !normalizeTags(example).includes(filters.tag)) return false;
    return true;
  }

  function readFilters() {
    return CF.readFilterValues(FILTER_SCHEMA);
  }

  function renderCard(example) {
    const tags = renderTagLinks(normalizeTags(example), 'tag');
    const platforms = renderTagLinks(normalizePlatforms(example), 'platform');

    return `
      <article class="example-card workshop-card">
        <button class="qr-expand-button" type="button" aria-label="Expand QR code for ${escapeHtml(example.title)}" aria-expanded="false">+</button>
        <div class="qr-row">
          <div class="qr-code" id="qr-${escapeHtml(example.id)}"></div>
          <span class="example-meta">Scan to open on phone</span>
        </div>
        <h4>${escapeHtml(example.title)}</h4>
        <div class="example-meta"><strong>${escapeHtml(example.focus)}</strong> / ${escapeHtml(CF.formatPlatformSummary(example))}</div>
        <p>${escapeHtml(example.description)}</p>
        <div class="tag-list">${tags}${platforms}</div>
        ${renderReferenceDrawer(example)}
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
    element.dataset.qrText = text;
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
    target.innerHTML = examples.length ? examples.map(renderCard).join('') : '<p>No examples match those filters.</p>';
    examples.forEach(example => makeQr('qr-' + example.id, example.qr || example.link, 132));
  }

  function renderWorkshopExamples() {
    const existing = window.DONOTTOUCH_EXISTING_EXAMPLES || [];
    const fresh = window.DONOTTOUCH_NEW_EXAMPLES || [];
    const filters = readFilters();
    const filteredExisting = existing.filter(example => exampleMatches(example, filters));
    const filteredFresh = fresh.filter(example => exampleMatches(example, filters));
    const status = document.getElementById('workshop-catalog-status');
    const statusPt2 = document.getElementById('workshop-catalog-status-pt2');
    const totalShown = filteredExisting.length + filteredFresh.length;
    const totalAll = existing.length + fresh.length;
    const statusText = totalShown + ' of ' + totalAll + ' workshop examples shown';

    if (status) status.textContent = statusText + ' (' + filteredExisting.length + ' in Pt 1, ' + filteredFresh.length + ' in Pt 2)';
    if (statusPt2) statusPt2.textContent = filteredFresh.length + ' of ' + fresh.length + ' starter sketches shown (filters apply from Pt 1)';
    renderCards('existing-example-grid', filteredExisting);
    renderCards('new-example-grid', filteredFresh);
  }

  function setupWorkshopFilters() {
    const examples = (window.DONOTTOUCH_EXISTING_EXAMPLES || []).concat(window.DONOTTOUCH_NEW_EXAMPLES || []);

    CF.setupCatalogFilters({
      sectionId: 'open-first',
      alternateSectionIds: ['workshop-examples'],
      schema: FILTER_SCHEMA,
      populateSelects: function() {
        CF.renderSelect(document.getElementById('workshop-platform-filter'), CF.uniqueValues(examples.flatMap(normalizePlatforms), item => item), 'platforms');
        CF.renderSelect(document.getElementById('workshop-tag-filter'), CF.uniqueValues(examples.flatMap(normalizeTags), item => item), 'tags');
      },
      onChange: renderWorkshopExamples,
      scrollTargetId: 'open-first'
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    makeQr('workshop-page-qr', window.DONOTTOUCH_PAGE_URL, 184);
    setupWorkshopFilters();
  });
})();
