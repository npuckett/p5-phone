(function(global) {
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

  function parseFilterHash(hash) {
    const raw = String(hash || location.hash || '').replace(/^#/, '');
    const questionIndex = raw.indexOf('?');
    const sectionId = questionIndex === -1 ? raw : raw.slice(0, questionIndex);
    const params = {};

    if (questionIndex !== -1) {
      new URLSearchParams(raw.slice(questionIndex + 1)).forEach((value, key) => {
        if (value) params[key] = value;
      });
    }

    return { sectionId, params };
  }

  function buildFilterHash(sectionId, params) {
    const entries = Object.entries(params || {}).filter(([, value]) => value);
    if (!entries.length) return sectionId ? '#' + sectionId : '';
    return '#' + sectionId + '?' + new URLSearchParams(Object.fromEntries(entries)).toString();
  }

  function sectionIdFromHref(href) {
    return parseFilterHash(href).sectionId;
  }

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

  function formatPlatformSummary(example) {
    if (example.platformSummary) return example.platformSummary;
    const platforms = normalizePlatforms(example);
    if (platforms.length === 1 && platforms[0] === 'Android') return 'Android Chrome';
    return 'iOS + Android';
  }

  function getControls(schema) {
    const controls = {};
    Object.entries(schema).forEach(([key, id]) => {
      controls[key] = document.getElementById(id);
    });
    return controls;
  }

  function readFilterValues(schema) {
    const values = {};
    Object.entries(schema).forEach(([key, id]) => {
      const control = document.getElementById(id);
      values[key] = control ? control.value : '';
    });
    const search = values.search;
    if (typeof search === 'string') values.search = search.trim().toLowerCase();
    return values;
  }

  function applyParamsToControls(schema, params) {
    Object.entries(schema).forEach(([key, id]) => {
      if (!(key in params)) return;
      const control = document.getElementById(id);
      if (control) control.value = params[key];
    });
  }

  function hashParamsFromFilters(schema, filters) {
    const params = {};
    Object.keys(schema).forEach(key => {
      if (key === 'search') return;
      if (filters[key]) params[key] = filters[key];
    });
    return params;
  }

  function renderTagLinks(tags, kind, sectionId) {
    return tags.map(tag => {
      const href = buildFilterHash(sectionId, { tag });
      return '<a class="tag tag-link" href="' + escapeHtml(href) + '" data-filter-' + kind + '="' + escapeHtml(tag) + '">' + escapeHtml(tag) + '</a>';
    }).join('');
  }

  function setupCatalogFilters(options) {
    const {
      sectionId,
      schema,
      alternateSectionIds = [],
      populateSelects,
      onChange,
      scrollTargetId
    } = options;
    const sectionIds = [sectionId].concat(alternateSectionIds);
    const controls = getControls(schema);
    const controlList = Object.keys(schema).map(key => controls[key]).filter(Boolean);

    populateSelects();

    function renderFromControls(options) {
      const filters = readFilterValues(schema);
      if (!options || options.updateHash !== false) {
        const nextHash = buildFilterHash(sectionId, hashParamsFromFilters(schema, filters));
        if (location.hash !== nextHash) {
          history.replaceState(null, '', nextHash || (window.location.pathname + window.location.search));
        }
      }
      onChange(filters);
    }

    controlList.forEach(control => {
      control.addEventListener('input', () => renderFromControls());
      control.addEventListener('change', () => renderFromControls());
    });

    document.addEventListener('click', event => {
      const platformLink = event.target.closest('[data-filter-platform]');
      const tagLink = event.target.closest('[data-filter-tag]');
      if (!platformLink && !tagLink) return;
      event.preventDefault();
      if (platformLink && controls.platform) controls.platform.value = platformLink.dataset.filterPlatform;
      if (tagLink && controls.tag) controls.tag.value = tagLink.dataset.filterTag;
      renderFromControls();
      const targetId = scrollTargetId || sectionId;
      document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
    });

    function applyHash(options) {
      const { sectionId: hashSection, params } = parseFilterHash(location.hash);
      if (!hashSection || sectionIds.includes(hashSection)) {
        applyParamsToControls(schema, params);
      }
      renderFromControls({ updateHash: false });
      if (hashSection && options && options.scroll !== false) {
        document.getElementById(hashSection)?.scrollIntoView({ block: 'start' });
      }
      return true;
    }

    window.addEventListener('hashchange', () => applyHash({ scroll: true }));

    applyHash({ scroll: false });

    return { applyHash, renderFromControls };
  }

  global.P5PHONE_CATALOG_FILTERS = {
    escapeHtml,
    uniqueValues,
    renderSelect,
    parseFilterHash,
    buildFilterHash,
    sectionIdFromHref,
    normalizeTags,
    normalizePlatforms,
    formatPlatformSummary,
    readFilterValues,
    applyParamsToControls,
    hashParamsFromFilters,
    renderTagLinks,
    setupCatalogFilters
  };
})(window);
