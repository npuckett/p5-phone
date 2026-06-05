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

  function uniqueValues(items) {
    return Array.from(new Set(items.filter(Boolean))).sort();
  }

  function renderSelect(select, values, label) {
    if (!select) return;
    select.innerHTML = ['<option value="">All ' + escapeHtml(label) + '</option>']
      .concat(values.map(value => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>'))
      .join('');
  }

  const API_REFERENCE_RULES = [
    { tags: ['motion'], group: 'p5-phone', label: 'enableSensorTap()', href: '../examples/homepage/#api-motion' },
    { tags: ['orientation'], group: 'External', label: 'rotationX / rotationY / rotationZ', href: 'https://p5js.org/reference/p5/rotationX/' },
    { tags: ['gyroscope'], group: 'External', label: 'p5 rotation rates', href: 'https://p5js.org/reference/p5/rotationX/' },
    { tags: ['accelerometer'], group: 'External', label: 'p5 acceleration values', href: 'https://p5js.org/reference/p5/accelerationX/' },
    { tags: ['deviceShaken'], group: 'External', label: 'deviceShaken()', href: 'https://p5js.org/reference/p5/deviceShaken/' },
    { tags: ['microphone'], group: 'p5-phone', label: 'enableMicTap()', href: '../examples/homepage/#api-audio' },
    { tags: ['sound'], group: 'p5-phone', label: 'enableSoundTap()', href: '../examples/homepage/#api-audio' },
    { tags: ['nfc'], group: 'p5-phone', label: 'enableNfcTap()', href: '../examples/homepage/#api-nfc' },
    { tags: ['vibration'], group: 'p5-phone', label: 'vibrate()', href: '../examples/homepage/#api-vibration' },
    { tags: ['torch'], group: 'p5-phone', label: 'toggleTorch()', href: '../examples/homepage/#api-torch' },
    { tags: ['camera'], group: 'p5-phone', label: 'createPhoneCamera()', href: '../examples/homepage/#api-camera' },
    { tags: ['color'], group: 'External', label: 'p5 pixels[]', href: 'https://p5js.org/reference/p5/pixels/' },
    { tags: ['ml5'], group: 'External', label: 'ml5.js', href: 'https://docs.ml5js.org/' },
    { tags: ['facemesh'], group: 'External', label: 'ml5.faceMesh()', href: 'https://docs.ml5js.org/#/reference/facemesh' },
    { tags: ['handpose'], group: 'External', label: 'ml5.handPose()', href: 'https://docs.ml5js.org/#/reference/handpose' }
  ];

  function includesAny(text, terms) {
    const value = text.toLowerCase();
    return terms.some(term => value.includes(term));
  }

  function normalizePlatforms(example) {
    if (example.platforms && example.platforms.length) return example.platforms;
    const platform = String(example.platform || 'iOS + Android').toLowerCase();
    if (platform.includes('android chrome') && !platform.includes('iphone')) return ['Android'];
    return ['iOS + Android'];
  }

  function normalizeTags(example) {
    if (example.capabilities && example.capabilities.length) return example.capabilities;
    const source = [example.id, example.title, example.focus, example.description].join(' ');
    const tags = [];
    if (includesAny(source, ['motion', 'tilt', 'orientation', 'shake', 'movement', 'rotation'])) tags.push('motion');
    if (includesAny(source, ['orientation', 'tilt'])) tags.push('orientation');
    if (includesAny(source, ['rotational', 'gyroscope'])) tags.push('gyroscope');
    if (includesAny(source, ['acceleration'])) tags.push('accelerometer');
    if (includesAny(source, ['shake'])) tags.push('deviceShaken');
    if (includesAny(source, ['microphone', 'breath', 'sound range'])) tags.push('microphone');
    if (includesAny(source, ['sound', 'synth', 'pitch', 'volume'])) tags.push('sound');
    if (includesAny(source, ['nfc', 'tag'])) tags.push('nfc');
    if (includesAny(source, ['vibration', 'haptic'])) tags.push('vibration');
    if (includesAny(source, ['torch', 'flashlight'])) tags.push('torch');
    if (includesAny(source, ['camera', 'facemesh', 'handpose', 'gaze', 'tracking'])) tags.push('camera');
    if (includesAny(source, ['ml5', 'facemesh', 'handpose', 'gaze', 'tracking'])) tags.push('ml5');
    if (includesAny(source, ['face', 'facemesh', 'mouth', 'gaze'])) tags.push('facemesh');
    if (includesAny(source, ['hand', 'thumb-index'])) tags.push('handpose');
    if (includesAny(source, ['color'])) tags.push('color');
    if (includesAny(source, ['gif'])) tags.push('gif');
    return uniqueValues(tags);
  }

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

  function tagHref(tag) {
    return '#open-first?tag=' + encodeURIComponent(tag);
  }

  function renderTagLinks(tags, kind) {
    return tags.map(tag => '<a class="tag tag-link" href="' + tagHref(tag) + '" data-workshop-' + kind + '="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</a>').join('');
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
      example.platform,
      example.description,
      normalizePlatforms(example).join(' '),
      normalizeTags(example).join(' ')
    ].join(' ').toLowerCase();

    if (filters.search && !queryText.includes(filters.search)) return false;
    if (filters.platform && !normalizePlatforms(example).includes(filters.platform)) return false;
    if (filters.tag && !normalizeTags(example).includes(filters.tag)) return false;
    return true;
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
        <div class="example-meta"><strong>${escapeHtml(example.focus)}</strong> / ${escapeHtml(example.platform)}</div>
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
    const all = existing.concat(fresh);
    const filters = {
      search: (document.getElementById('workshop-search').value || '').trim().toLowerCase(),
      platform: document.getElementById('workshop-platform-filter').value,
      tag: document.getElementById('workshop-tag-filter').value
    };
    const filteredExisting = existing.filter(example => exampleMatches(example, filters));
    const filteredFresh = fresh.filter(example => exampleMatches(example, filters));
    const status = document.getElementById('workshop-catalog-status');

    if (status) status.textContent = (filteredExisting.length + filteredFresh.length) + ' of ' + all.length + ' workshop examples shown';
    renderCards('existing-example-grid', filteredExisting);
    renderCards('new-example-grid', filteredFresh);
  }

  function setupWorkshopFilters() {
    const examples = (window.DONOTTOUCH_EXISTING_EXAMPLES || []).concat(window.DONOTTOUCH_NEW_EXAMPLES || []);
    const search = document.getElementById('workshop-search');
    const platformFilter = document.getElementById('workshop-platform-filter');
    const tagFilter = document.getElementById('workshop-tag-filter');

    renderSelect(platformFilter, uniqueValues(examples.flatMap(normalizePlatforms)), 'platforms');
    renderSelect(tagFilter, uniqueValues(examples.flatMap(normalizeTags)), 'tags');

    [search, platformFilter, tagFilter].forEach(control => {
      control.addEventListener('input', renderWorkshopExamples);
      control.addEventListener('change', renderWorkshopExamples);
    });

    document.addEventListener('click', event => {
      const platformLink = event.target.closest('[data-workshop-platform]');
      const tagLink = event.target.closest('[data-workshop-tag]');
      if (!platformLink && !tagLink) return;
      event.preventDefault();
      if (platformLink) platformFilter.value = platformLink.dataset.workshopPlatform;
      if (tagLink) tagFilter.value = tagLink.dataset.workshopTag;
      renderWorkshopExamples();
      document.getElementById('open-first').scrollIntoView({ block: 'start' });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    makeQr('workshop-page-qr', window.DONOTTOUCH_PAGE_URL, 184);
    setupWorkshopFilters();
    renderWorkshopExamples();
  });
})();