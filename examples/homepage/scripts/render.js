(function() {
  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function uniqueValues(items, getter) {
    return Array.from(new Set(items.map(getter).filter(Boolean))).sort();
  }

  function renderSelect(select, values, label) {
    if (!select) return;
    select.innerHTML = ['<option value="">All ' + escapeHtml(label) + '</option>']
      .concat(values.map(value => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>'))
      .join('');
  }

  const API_REFERENCE_RULES = [
    { tags: ['setup'], group: 'p5-phone', label: 'lockGestures()', href: '#api-core' },
    { tags: ['lockGestures'], group: 'p5-phone', label: 'lockGestures()', href: '#api-core' },
    { tags: ['combined permissions'], group: 'p5-phone', label: 'enablePermissionsTap()', href: '#api-core' },
    { tags: ['motion'], group: 'p5-phone', label: 'enableSensorTap()', href: '#api-motion' },
    { tags: ['orientation'], group: 'External', label: 'rotationX / rotationY / rotationZ', href: 'https://p5js.org/reference/p5/rotationX/' },
    { tags: ['gyroscope'], group: 'External', label: 'p5 rotation rates', href: 'https://p5js.org/reference/p5/rotationX/' },
    { tags: ['accelerometer'], group: 'External', label: 'p5 acceleration values', href: 'https://p5js.org/reference/p5/accelerationX/' },
    { tags: ['deviceShaken'], group: 'External', label: 'deviceShaken()', href: 'https://p5js.org/reference/p5/deviceShaken/' },
    { tags: ['deviceMoved'], group: 'External', label: 'deviceMoved()', href: 'https://p5js.org/reference/p5/deviceMoved/' },
    { tags: ['deviceOrientation'], group: 'External', label: 'deviceOrientation', href: 'https://p5js.org/reference/p5/deviceOrientation/' },
    { tags: ['threshold'], group: 'External', label: 'setMoveThreshold()', href: 'https://p5js.org/reference/p5/setMoveThreshold/' },
    { tags: ['microphone'], group: 'p5-phone', label: 'enableMicTap()', href: '#api-audio' },
    { tags: ['p5.sound'], group: 'External', label: 'p5.sound', href: 'https://p5js.org/reference/#/libraries/p5.sound' },
    { tags: ['speech'], group: 'p5-phone', label: 'enableSpeechTap()', href: '#api-audio' },
    { tags: ['speech'], group: 'External', label: 'Web Speech API', href: 'https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API' },
    { tags: ['nfc'], group: 'p5-phone', label: 'enableNfcTap()', href: '#api-nfc' },
    { tags: ['aliases'], group: 'p5-phone', label: 'isNfcTag()', href: '#api-nfc' },
    { tags: ['sound'], group: 'p5-phone', label: 'enableSoundTap()', href: '#api-audio' },
    { tags: ['vibration'], group: 'p5-phone', label: 'enableVibrationTap()', href: '#api-vibration' },
    { tags: ['vibration'], group: 'p5-phone', label: 'vibrate()', href: '#api-vibration' },
    { tags: ['torch'], group: 'p5-phone', label: 'enableTorchTap()', href: '#api-torch' },
    { tags: ['torch'], group: 'p5-phone', label: 'toggleTorch()', href: '#api-torch' },
    { tags: ['camera'], group: 'p5-phone', label: 'createPhoneCamera()', href: '#api-camera' },
    { tags: ['camera'], group: 'p5-phone', label: 'PhoneCamera', href: '#api-camera' },
    { tags: ['color'], group: 'External', label: 'p5 pixels[]', href: 'https://p5js.org/reference/p5/pixels/' },
    { tags: ['ml5'], group: 'External', label: 'ml5.js', href: 'https://docs.ml5js.org/' },
    { tags: ['facemesh'], group: 'External', label: 'ml5.faceMesh()', href: 'https://docs.ml5js.org/#/reference/facemesh' },
    { tags: ['handpose'], group: 'External', label: 'ml5.handPose()', href: 'https://docs.ml5js.org/#/reference/handpose' },
    { tags: ['bodypose'], group: 'External', label: 'ml5.bodyPose()', href: 'https://docs.ml5js.org/#/reference/bodypose' }
  ];

  function normalizeTags(example) {
    return (example.capabilities || []).filter(Boolean);
  }

  function normalizePlatforms(example) {
    if (example.platforms && example.platforms.length) return example.platforms;
    const tags = normalizeTags(example).map(tag => tag.toLowerCase());
    if (tags.includes('nfc')) return ['Android'];
    if (tags.includes('vibration')) return ['Android'];
    return ['iOS + Android'];
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
    return '#examples?tag=' + encodeURIComponent(tag);
  }

  function renderTagLinks(tags, kind) {
    return tags.map(tag => '<a class="tag tag-link" href="' + tagHref(tag) + '" data-filter-' + kind + '="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</a>').join('');
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

  function renderPermissionMatrix() {
    const matrix = window.P5PHONE_PERMISSION_MATRIX || [];
    const target = document.getElementById('permission-matrix');
    if (!target || matrix.length === 0) return;

    const rows = matrix.map(item => `
      <tr>
        <td><strong>${escapeHtml(item.capability)}</strong><br><code>${escapeHtml(item.status)}</code></td>
        <td><code>${escapeHtml(item.tap)}</code></td>
        <td><code>${escapeHtml(item.button)}</code></td>
        <td><code>${escapeHtml(item.canvas)}</code></td>
        <td><code>${escapeHtml(item.banner)}</code></td>
        <td><code>${escapeHtml(item.custom)}</code></td>
        <td>${escapeHtml(item.notes)}</td>
      </tr>
    `).join('');

    target.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Capability</th><th>Tap</th><th>Button</th><th>Canvas</th><th>Banner</th><th>Custom</th><th>Notes</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function renderRelatedApis(apis) {
    if (!apis || apis.length === 0) return '';

    return `
      <div class="related-api-panel">
        <h4>Related p5 APIs</h4>
        <div class="related-api-list">
          ${apis.map(api => `
            <a href="${escapeHtml(api.href)}" target="_blank" rel="noreferrer">
              <code>${escapeHtml(api.label)}</code>
              <span>${escapeHtml(api.summary)}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderApi() {
    const sections = window.P5PHONE_API_SECTIONS || [];
    const target = document.getElementById('api-sections');
    if (!target) return;

    target.innerHTML = sections.map(section => {
      const cards = section.items.map(item => `
        <article class="api-card">
          <h4>${escapeHtml(item.name)}</h4>
          <div class="api-signature"><code>${escapeHtml(item.signature)}</code></div>
          <p>${escapeHtml(item.summary)}</p>
          <div class="tag-list">${(item.tags || []).map(tag => '<span class="tag">' + escapeHtml(tag) + '</span>').join('')}</div>
        </article>
      `).join('');

      return `
        <section class="api-section" id="api-${escapeHtml(section.id)}">
          <div class="api-section-header">
            <h3>${escapeHtml(section.title)}</h3>
            <p>${escapeHtml(section.description)}</p>
          </div>
          ${renderRelatedApis(section.relatedApis)}
          <div class="api-grid">${cards}</div>
        </section>
      `;
    }).join('');
  }

  function exampleMatches(example, filters) {
    const queryText = [
      example.title,
      example.description,
      example.category,
      example.subcategory,
      example.family,
      example.level,
      example.p5,
      normalizePlatforms(example).join(' '),
      normalizeTags(example).join(' ')
    ].join(' ').toLowerCase();

    if (filters.search && !queryText.includes(filters.search)) return false;
    if (filters.category && example.subcategory !== filters.category) return false;
    if (filters.level && example.level !== filters.level) return false;
    if (filters.version && example.p5 !== filters.version) return false;
    if (filters.platform && !normalizePlatforms(example).includes(filters.platform)) return false;
    if (filters.tag && !normalizeTags(example).includes(filters.tag)) return false;
    return true;
  }

  function linkOrMissing(label, href) {
    if (!href) return '<span aria-disabled="true">' + escapeHtml(label) + '</span>';
    return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer">' + escapeHtml(label) + '</a>';
  }

  function pageHref(path) {
    return '../' + path;
  }

  function renderExampleCard(example) {
    const qrId = 'qr-' + example.id;
    const capabilities = renderTagLinks(normalizeTags(example), 'tag');
    const platforms = renderTagLinks(normalizePlatforms(example), 'platform');
    const githubBase = window.P5PHONE_GITHUB_BASE_URL || '';

    return `
      <article class="example-card">
        <button class="qr-expand-button" type="button" aria-label="Expand QR code for ${escapeHtml(example.title)}" aria-expanded="false">+</button>
        <div class="qr-row">
          <div class="qr-code" id="${escapeHtml(qrId)}"></div>
          <span class="example-meta">Scan to open on phone</span>
        </div>
        <h4>${escapeHtml(example.title)}</h4>
        <div class="example-meta">${escapeHtml(example.subcategory)} / ${escapeHtml(example.level)} / ${escapeHtml(example.p5)}</div>
        <p>${escapeHtml(example.description)}</p>
        <div class="tag-list">${capabilities}${platforms}</div>
        ${renderReferenceDrawer(example)}
        <div class="card-actions">
          ${linkOrMissing('Link', pageHref(example.path))}
          ${linkOrMissing('Minimal', example.minimalPath ? pageHref(example.minimalPath) : '')}
          ${linkOrMissing('Web Editor', example.webEditor || '')}
          ${linkOrMissing('Source', githubBase + example.sourcePath)}
        </div>
      </article>
    `;
  }

  function groupExamples(examples) {
    return examples.reduce((groups, example) => {
      const category = example.category || 'Other';
      const subcategory = example.subcategory || category;
      if (!groups[category]) groups[category] = {};
      if (!groups[category][subcategory]) groups[category][subcategory] = [];
      groups[category][subcategory].push(example);
      return groups;
    }, {});
  }

  function slug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function exampleGroupId(category, subcategory) {
    const base = 'examples-' + slug(category);
    return subcategory ? base + '-' + slug(subcategory) : base;
  }

  function exampleFamilyId(category, subcategory, family) {
    return exampleGroupId(category, subcategory) + '-' + slug(family);
  }

  function renderExampleFamily(category, subcategory, family, examples) {
    return `
      <section class="example-family" id="${escapeHtml(exampleFamilyId(category, subcategory, family))}">
        <h5>${escapeHtml(family)}</h5>
        <div class="example-grid">${examples.map(renderExampleCard).join('')}</div>
      </section>
    `;
  }

  function renderSubgroupExamples(category, subcategory, examples) {
    if (!examples.some(example => example.family)) {
      return '<div class="example-grid">' + examples.map(renderExampleCard).join('') + '</div>';
    }

    const preferredFamilies = ['Camera Basics', 'PhoneCamera + ML5 Examples', 'Three.js + ML5 Examples'];
    const groupedFamilies = examples.reduce((groups, example) => {
      const family = example.family || 'Other Examples';
      if (!groups[family]) groups[family] = [];
      groups[family].push(example);
      return groups;
    }, {});
    const availableFamilies = Object.keys(groupedFamilies);
    const orderedFamilies = preferredFamilies
      .filter(family => availableFamilies.includes(family))
      .concat(availableFamilies.filter(family => !preferredFamilies.includes(family)).sort());

    return orderedFamilies
      .map(family => renderExampleFamily(category, subcategory, family, groupedFamilies[family]))
      .join('');
  }

  function orderedSubcategories(category, groupedCategory) {
    const preferredOrder = {
      Start: ['Starter'],
      Input: ['Touch', 'Movement', 'Microphone', 'Speech', 'NFC', 'Camera'],
      Output: ['Sound', 'Vibration', 'Torch'],
      Reference: ['UI Styles', 'Phone and GIF', 'UX Compare']
    };
    const available = Object.keys(groupedCategory || {});
    const preferred = preferredOrder[category] || [];
    return preferred
      .filter(subcategory => available.includes(subcategory))
      .concat(available.filter(subcategory => !preferred.includes(subcategory)).sort());
  }

  function renderExamples() {
    const examples = window.P5PHONE_EXAMPLES || [];
    const target = document.getElementById('example-results');
    const status = document.getElementById('catalog-status');
    if (!target || !status) return;

    const filters = {
      search: (document.getElementById('example-search').value || '').trim().toLowerCase(),
      category: document.getElementById('category-filter').value,
      level: document.getElementById('level-filter').value,
      version: document.getElementById('version-filter').value,
      platform: document.getElementById('platform-filter').value,
      tag: document.getElementById('tag-filter').value
    };

    const filtered = examples.filter(example => exampleMatches(example, filters));
    const grouped = groupExamples(filtered);
    const categoryOrder = ['Start', 'Input', 'Output', 'Reference'];
    const groupsHtml = categoryOrder
      .filter(category => grouped[category])
      .map(category => {
        const subgroups = orderedSubcategories(category, grouped[category]).map(subcategory => `
          <section class="example-subgroup" id="${escapeHtml(exampleGroupId(category, subcategory))}">
            <h4>${escapeHtml(category === 'Start' && subcategory === 'Starter' ? 'Start' : subcategory)}</h4>
            ${renderSubgroupExamples(category, subcategory, grouped[category][subcategory])}
          </section>
        `).join('');

        return `
          <section class="example-group" id="${escapeHtml(exampleGroupId(category))}">
            <h3>${escapeHtml(category)}</h3>
            ${subgroups}
          </section>
        `;
      }).join('');

    status.textContent = filtered.length + ' of ' + examples.length + ' examples shown';
    target.innerHTML = groupsHtml || '<p>No examples match those filters.</p>';
    renderQrCodes(filtered);
  }

  function renderQrCodes(examples) {
    if (typeof QRCode === 'undefined') return;
    const baseUrl = window.P5PHONE_EXAMPLES_BASE_URL || '';
    const qrSize = 132;

    examples.forEach(example => {
      const element = document.getElementById('qr-' + example.id);
      if (!element) return;
      const qrText = baseUrl + example.path;
      element.dataset.qrText = qrText;
      element.innerHTML = '';
      new QRCode(element, {
        text: qrText,
        width: qrSize,
        height: qrSize,
        colorDark: '#171717',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.M
      });
    });
  }

  function setupFilters() {
    const examples = window.P5PHONE_EXAMPLES || [];
    const categoryFilter = document.getElementById('category-filter');
    const levelFilter = document.getElementById('level-filter');
    const versionFilter = document.getElementById('version-filter');
    const platformFilter = document.getElementById('platform-filter');
    const tagFilter = document.getElementById('tag-filter');
    const search = document.getElementById('example-search');

    renderSelect(categoryFilter, uniqueValues(examples, item => item.subcategory), 'types');
    renderSelect(levelFilter, uniqueValues(examples, item => item.level), 'levels');
    renderSelect(versionFilter, uniqueValues(examples, item => item.p5), 'versions');
    renderSelect(platformFilter, uniqueValues(examples.flatMap(normalizePlatforms), item => item), 'platforms');
    renderSelect(tagFilter, uniqueValues(examples.flatMap(normalizeTags), item => item), 'tags');

    [categoryFilter, levelFilter, versionFilter, platformFilter, tagFilter, search].forEach(control => {
      control.addEventListener('input', renderExamples);
      control.addEventListener('change', renderExamples);
    });

    document.addEventListener('click', event => {
      const platformLink = event.target.closest('[data-filter-platform]');
      const tagLink = event.target.closest('[data-filter-tag]');
      if (!platformLink && !tagLink) return;
      event.preventDefault();
      if (platformLink) platformFilter.value = platformLink.dataset.filterPlatform;
      if (tagLink) tagFilter.value = tagLink.dataset.filterTag;
      renderExamples();
      document.getElementById('examples').scrollIntoView({ block: 'start' });
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    renderPermissionMatrix();
    renderApi();
    setupFilters();
    renderExamples();
  });
})();