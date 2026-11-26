let opportunities = [];

const list = document.querySelector('#result-list');
const count = document.querySelector('#result-count');
const query = document.querySelector('#keyword');
const categorySelect = document.querySelector('#category');
const locationSelect = document.querySelector('#location');
const areaSelect = document.querySelector('#area');
const sortSelect = document.querySelector('#sort');
const checks = [...document.querySelectorAll('[data-filter]')];
const matchForm = document.querySelector('#match-form');
const matchStatus = document.querySelector('#match-status');
const savedToggle = document.querySelector('#saved-toggle');
const savedCount = document.querySelector('#saved-count');
const hoursForm = document.querySelector('#hours-form');
const hoursList = document.querySelector('#hours-list');
const hoursTotal = document.querySelector('#hours-total');
const hoursStatus = document.querySelector('#hours-status');
const hoursOptions = document.querySelector('#hours-options');
let savedOnly = false;

// Per-browser storage. Wrapped in try/catch because storage can be blocked.
function readStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the feature still works for this visit */
  }
}

let savedIds = new Set(readStore('vbi_saved', []));
let hoursLog = readStore('vbi_hours', []);

function toggleSaved(id) {
  if (savedIds.has(id)) savedIds.delete(id);
  else savedIds.add(id);
  writeStore('vbi_saved', [...savedIds]);
  renderResults();
}

function updateSavedToggle() {
  savedCount.textContent = String(savedIds.size);
  savedToggle.setAttribute('aria-pressed', String(savedOnly));
  savedToggle.classList.toggle('active', savedOnly);
}

function renderHours() {
  const total = hoursLog.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
  hoursTotal.textContent = `${total} ${total === 1 ? 'hour' : 'hours'} logged`;
  hoursList.innerHTML = hoursLog.length
    ? hoursLog.map((entry, index) => `
        <li>
          <span><strong>${escapeHtml(entry.hours)} h</strong> · ${escapeHtml(entry.opportunity)} <small>${escapeHtml(entry.date)}</small></span>
          <button type="button" class="hours-remove" data-hours-index="${index}" aria-label="Remove this entry">Remove</button>
        </li>`).join('')
    : '<li class="hours-empty">No hours logged yet.</li>';
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[character]);

function safeExternalUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function getSelectedFilters() {
  return [...new Set(checks.filter(c => c.checked).map(c => c.dataset.filter))];
}

function syncQuickButtons() {
  const active = getSelectedFilters();
  document.querySelectorAll('[data-quick]').forEach(button => {
    const selected = active.includes(button.dataset.quick);
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function sortResults(results) {
  const mode = sortSelect?.value || 'recommended';
  if (mode === 'city') return [...results].sort((a, b) => a.city.localeCompare(b.city) || a.title.localeCompare(b.title));
  if (mode === 'title') return [...results].sort((a, b) => a.title.localeCompare(b.title));
  return [...results].sort((a, b) => recommendationScore(b) - recommendationScore(a));
}

function recommendationScore(item) {
  const tags = item.tags || [];
  return (tags.includes('Students welcome') ? 8 : 0)
    + (tags.includes('Middle school') || tags.includes('High school') ? 5 : 0)
    + (tags.includes('No experience') ? 3 : 0)
    + (tags.includes('Quick signup (1–3 days)') ? 2 : 0)
    - (tags.includes('18+') ? 12 : 0);
}

function populateCategories() {
  const categories = [...new Set(opportunities.map(item => item.category).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  categorySelect.replaceChildren(
    new Option('All categories', ''),
    ...categories.map(category => new Option(category, category))
  );

  const cities = [...new Set(opportunities.map(item => item.city).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  locationSelect.replaceChildren(
    new Option('All locations', ''),
    ...cities.map(city => new Option(city, city))
  );

  const areas = [...new Set(opportunities.map(item => item.area).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  areaSelect.replaceChildren(
    new Option('Any area', ''),
    ...areas.map(area => new Option(area, area))
  );

  const tags = new Set(opportunities.flatMap(item => item.tags || []));
  checks.forEach(check => {
    const available = tags.has(check.dataset.filter);
    check.closest('label').hidden = !available;
    check.disabled = !available;
  });
  document.querySelectorAll('[data-quick]').forEach(button => {
    button.hidden = !tags.has(button.dataset.quick);
  });
  document.querySelectorAll('.filter-section').forEach(section => {
    if (!section.querySelector('input[type="checkbox"]')) return;
    section.hidden = !section.querySelector('input[type="checkbox"]:not(:disabled)');
  });
}

function iconMarkup(item) {
  const opportunityPhotos = {
    'foodbank-sovereign-shores-distribution': {
      file: 'food-volunteers.jpg',
      alt: 'Volunteers sorting and packing food donations',
      credit: 'Illustrative photo · Unsplash'
    },
    'lynnhaven-native-plantings': {
      file: 'native-planting.jpg',
      alt: 'Hands planting a young native plant',
      credit: 'Illustrative photo · Unsplash'
    },
    'forkids-youth-mentor': {
      file: 'youth-learning.jpg',
      alt: 'A young student working on schoolwork',
      credit: 'Illustrative photo · Unsplash'
    }
  };
  const photo = opportunityPhotos[item.id];
  if (photo) {
    const source = photo.file === 'beach-cleanup-volunteers.jpg'
      ? 'https://commons.wikimedia.org/wiki/File:Oregon-beach-cleanup-ocean-blue-project-volunteers.jpg'
      : 'https://unsplash.com/license';
    return `<img src="${photo.file}" alt="${photo.alt}" loading="lazy" decoding="async"><figcaption><a href="${source}" target="_blank" rel="noopener">${photo.credit}</a></figcaption>`;
  }
  return `<span class="result-graphic-fallback" aria-hidden="true">${escapeHtml(item.graphic || '✦')}</span>`;
}

function renderResults() {
  const terms = query.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filters = getSelectedFilters();
  const category = categorySelect.value;
  const place = locationSelect.value;
  const area = areaSelect.value;

  const results = sortResults(opportunities.filter(item => {
    const tags = item.tags || [];
    const haystack = `${item.title} ${item.org} ${item.category || ''} ${item.city} ${item.area || ''} ${item.hours} ${tags.join(' ')} ${item.description} ${item.ageRequirement || ''} ${item.requirements || ''} ${item.contactEmail || ''}`.toLowerCase();
    const textMatch = !terms.length || terms.every(term => haystack.includes(term));
    const categoryMatch = !category || item.category === category;
    const placeMatch = !place || item.city === place;
    const areaMatch = !area || item.area === area;
    const filterMatch = !filters.length || filters.every(filter => tags.includes(filter));
    const savedMatch = !savedOnly || savedIds.has(item.id);
    return textMatch && categoryMatch && placeMatch && areaMatch && filterMatch && savedMatch;
  }));

  syncQuickButtons();
  updateSavedToggle();
  count.textContent = `${results.length} ${results.length === 1 ? 'opportunity' : 'opportunities'}`;

  const chips = [...filters, ...(category ? [category] : []), ...(place ? [place] : []), ...(area ? [area] : [])];
  document.querySelector('#active-filters').innerHTML = chips
    .map(filter => `<span class="filter-chip">${escapeHtml(filter)}<button type="button" aria-label="Remove ${escapeHtml(filter)}" data-remove="${escapeHtml(filter)}">×</button></span>`)
    .join('');

  if (!results.length) {
    list.innerHTML = `
      <div class="empty">
        No listings match those filters yet.<br>
        Broaden your search or send a match request below.
        <button type="button" id="empty-clear">Clear filters</button>
        <button type="button" id="jump-failsafe" style="margin-left:8px;background:var(--ink)">Send a request</button>
      </div>`;
  } else {
    list.innerHTML = results.map(item => {
      const href = safeExternalUrl(item.applyUrl) || '#failsafe';
      const external = href !== '#failsafe';
      const applyLabel = item.applyMode === 'events' ? 'View current events' : 'View details';
      const tags = (item.tags || [])
        .filter(tag => !/^(Middle school|High school|Adults? \(18\+\)|18\+|Students welcome|Weekday|Weekday afternoons|Weekend|Weekends|School breaks|Recurring|One-time|Weekly|A day each month|A few hours|Flexible|Flexible \/ varies|It depends|Application required|Orientation required|Animals & nature|Community care|Kids & education|Arts & culture|Environment|Animals|Food access|Youth|Housing)$/i.test(tag))
        .slice(0, 4);
      const color = ['animals', 'food', 'youth', 'environment', 'arts'].includes(item.color) ? item.color : '';
      return `
        <article class="result-card">
          <figure class="result-graphic ${color}">${iconMarkup(item)}</figure>
          <div class="result-main">
            <div class="result-meta">
              <span class="category">${escapeHtml(item.category || 'General')}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p class="org-name">${escapeHtml(item.org || '')}</p>
            ${item.description ? `<p class="result-description">${escapeHtml(item.description)}</p>` : ''}
            <div class="listing-facts">
              <div><span>Where &amp; when</span><p>${escapeHtml(item.city)}${item.area ? ` · ${escapeHtml(item.area)}` : ''}<br>${escapeHtml(item.hours)}</p></div>
              <div><span>Age</span><p>${escapeHtml(item.ageRequirement || 'Confirm with the organization.')}</p></div>
            </div>
            ${item.requirements ? `<div class="guidelines"><strong>Before you apply</strong><p>${escapeHtml(item.requirements)}</p></div>` : ''}
            ${tags.length ? `<div class="tag-group" aria-label="Other opportunity details"><span class="tag-label">Also useful</span><div class="tags">${tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div>` : ''}
            ${item.applicationSteps?.length ? `<details class="application-steps"><summary>How to get started</summary><ol>${item.applicationSteps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol></details>` : ''}
            ${item.contactEmail ? `<p class="contact-email"><span>Questions?</span> <a href="mailto:${escapeHtml(item.contactEmail)}">${escapeHtml(item.contactEmail)}</a></p>` : ''}
          </div>
          <div class="result-links">
            <span class="start-status ${item.startType === 'Quick signup (1–3 days)' ? 'quick' : 'application'}">${escapeHtml(item.startType || 'Application required')}</span>
            <a class="details-link" href="${escapeHtml(href)}" ${external ? 'target="_blank" rel="noopener"' : ''}>${applyLabel} <span>→</span></a>
            <button type="button" class="save-button${savedIds.has(item.id) ? ' saved' : ''}" data-save="${escapeHtml(item.id)}" aria-pressed="${savedIds.has(item.id)}">${savedIds.has(item.id) ? 'Saved ✓' : 'Save'}</button>
            ${safeExternalUrl(item.sourceUrl) && item.sourceUrl !== item.applyUrl ? `<a class="source-link" href="${escapeHtml(safeExternalUrl(item.sourceUrl))}" target="_blank" rel="noopener">Official information</a>` : ''}
          </div>
        </article>
      `;
    }).join('');
  }

  document.querySelectorAll('[data-remove]').forEach(button => {
    button.addEventListener('click', () => {
      const value = button.dataset.remove;
      if (value === categorySelect.value) categorySelect.value = '';
      else if (value === locationSelect.value) locationSelect.value = '';
      else if (value === areaSelect.value) areaSelect.value = '';
      else checks.filter(c => c.dataset.filter === value).forEach(check => { check.checked = false; });
      renderResults();
    });
  });

  document.querySelector('#empty-clear')?.addEventListener('click', clear);
  document.querySelector('#jump-failsafe')?.addEventListener('click', () => {
    document.querySelector('#failsafe')?.scrollIntoView({ behavior: 'smooth' });
  });
}

function clear() {
  query.value = '';
  categorySelect.value = '';
  locationSelect.value = '';
  areaSelect.value = '';
  checks.forEach(c => { c.checked = false; });
  renderResults();
}

checks.forEach(check => check.addEventListener('change', renderResults));
categorySelect.addEventListener('change', renderResults);
locationSelect.addEventListener('change', renderResults);
areaSelect.addEventListener('change', renderResults);
query.addEventListener('input', renderResults);
sortSelect?.addEventListener('change', renderResults);
document.querySelector('#clear').addEventListener('click', clear);

document.querySelectorAll('[data-quick]').forEach(button => {
  button.addEventListener('click', () => {
    const matches = checks.filter(c => c.dataset.filter === button.dataset.quick);
    if (!matches.length) return;
    const turnOn = matches.some(c => !c.checked);
    matches.forEach(check => { check.checked = turnOn; });
    renderResults();
  });
});

document.querySelectorAll('.filter-title').forEach((button, index) => {
  const content = button.nextElementSibling;
  const contentId = `filter-content-${index + 1}`;
  content.id = contentId;
  button.setAttribute('aria-controls', contentId);
  button.addEventListener('click', () => {
    const closed = button.closest('.filter-section').classList.toggle('closed');
    button.setAttribute('aria-expanded', String(!closed));
  });
});

const filtersToggle = document.querySelector('#filters-toggle');
const filtersPanel = document.querySelector('.filters');
const setFiltersOpen = open => {
  filtersPanel.classList.toggle('filters-open', open);
  filtersToggle.setAttribute('aria-expanded', String(open));
  filtersToggle.textContent = open ? 'Hide filters' : 'Show filters';
};

filtersToggle?.addEventListener('click', () => {
  setFiltersOpen(!filtersPanel.classList.contains('filters-open'));
});

document.querySelector('#show-all-filters')?.addEventListener('click', event => {
  if (!window.matchMedia('(max-width: 750px)').matches) return;
  event.preventDefault();
  setFiltersOpen(true);
  filtersPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  filtersToggle.focus({ preventScroll: true });
});

matchForm?.addEventListener('submit', async event => {
  event.preventDefault();
  matchStatus.textContent = 'Sending…';
  matchStatus.classList.remove('error');
  const payload = {
    name: document.querySelector('#match-name').value.trim(),
    email: document.querySelector('#match-email').value.trim(),
    phone: document.querySelector('#match-phone').value.trim(),
    age: document.querySelector('#match-age').value.trim(),
    interests: document.querySelector('#match-interests').value.trim(),
    constraints: document.querySelector('#match-constraints').value.trim()
  };
  try {
    const response = await fetch('/api/match-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('failed');
    matchForm.reset();
    matchStatus.textContent = 'Your email app should open with this request addressed to info@vbimpact.org. Send it from there to finish.';
  } catch {
    matchStatus.textContent = 'Something went wrong. Please try again.';
    matchStatus.classList.add('error');
  }
});

list.addEventListener('click', event => {
  const button = event.target.closest('[data-save]');
  if (button) toggleSaved(button.dataset.save);
});

savedToggle.addEventListener('click', () => {
  savedOnly = !savedOnly;
  renderResults();
});

hoursForm.addEventListener('submit', event => {
  event.preventDefault();
  const date = document.querySelector('#hours-date').value;
  const hours = Number(document.querySelector('#hours-hours').value);
  const opportunity = document.querySelector('#hours-opportunity').value.trim();
  if (!date || !(hours > 0) || !opportunity) {
    hoursStatus.textContent = 'Add a date, hours, and an opportunity.';
    return;
  }
  hoursLog.push({ date, hours, opportunity });
  writeStore('vbi_hours', hoursLog);
  hoursForm.reset();
  hoursStatus.textContent = 'Added.';
  renderHours();
});

hoursList.addEventListener('click', event => {
  const button = event.target.closest('[data-hours-index]');
  if (!button) return;
  hoursLog.splice(Number(button.dataset.hoursIndex), 1);
  writeStore('vbi_hours', hoursLog);
  renderHours();
});

renderHours();

async function loadOpportunities() {
  try {
    opportunities = await fetch('/api/opportunities').then(r => {
      if (!r.ok) throw new Error('Failed to load');
      return r.json();
    });
  } catch {
    opportunities = [];
    count.textContent = 'Couldn’t load opportunities';
    list.innerHTML = `<div class="empty">We couldn’t reach the opportunities database.<br>Make sure the VBImpact server is running at http://localhost:3000</div>`;
    return;
  }
  populateCategories();
  hoursOptions.replaceChildren(...opportunities.map(item => new Option(item.title)));
  renderResults();
}

loadOpportunities();
