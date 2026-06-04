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
    select.innerHTML = ['<option value="">All ' + escapeHtml(label) + '</option>']
      .concat(values.map(value => '<option value="' + escapeHtml(value) + '">' + escapeHtml(value) + '</option>'))
      .join('');
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
      (example.capabilities || []).join(' ')
    ].join(' ').toLowerCase();

    if (filters.search && !queryText.includes(filters.search)) return false;
    if (filters.category && example.subcategory !== filters.category) return false;
    if (filters.level && example.level !== filters.level) return false;
    if (filters.version && example.p5 !== filters.version) return false;
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
    const capabilities = (example.capabilities || []).map(tag => '<span class="tag">' + escapeHtml(tag) + '</span>').join('');
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
        <div class="tag-list">${capabilities}</div>
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
      version: document.getElementById('version-filter').value
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
    const search = document.getElementById('example-search');

    renderSelect(categoryFilter, uniqueValues(examples, item => item.subcategory), 'types');
    renderSelect(levelFilter, uniqueValues(examples, item => item.level), 'levels');
    renderSelect(versionFilter, uniqueValues(examples, item => item.p5), 'versions');

    [categoryFilter, levelFilter, versionFilter, search].forEach(control => {
      control.addEventListener('input', renderExamples);
      control.addEventListener('change', renderExamples);
    });
  }

  document.addEventListener('DOMContentLoaded', function() {
    renderPermissionMatrix();
    renderApi();
    setupFilters();
    renderExamples();
  });
})();