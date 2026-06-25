const DATA = window.__VL_DATA__;

const CATS = [
  { key:'MLB',                   icon:'⚾', label:'MLB',                    hint:'Search by team name' },
  { key:'MiLB',                  icon:'🥎', label:'Minor League Baseball',   hint:'Search by team name' },
  { key:'NFL',                   icon:'🏈', label:'NFL',                    hint:'Search by team name' },
  { key:'NBA',                   icon:'🏀', label:'NBA',                    hint:'Search by team name' },
  { key:'NHL',                   icon:'🏒', label:'NHL',                    hint:'Search by team name' },
  { key:'MLS',                   icon:'⚽', label:'MLS',                    hint:'Search by team name' },
  { key:'College Sports',        icon:'🎓', label:'College Sports',          hint:'Search by school or team name' },
  { key:'Music and Performing Arts', icon:'🎵', label:'Music & Performing Arts', hint:'Search by venue or partner name' },
];

let activeCat = null;

// ── Source badge ──────────────────────────────────────────────
function sourceBadge(src) {
  if (!src) return '';
  const s = src.toLowerCase();
  let cls = '', label = src;
  if (s.includes('ticketmaster') || s.includes('tm')) { cls='tm'; label='Ticketmaster'; }
  else if (s.includes('seatgeek'))  { cls='sg'; label='SeatGeek'; }
  else if (s.includes('axs'))       { cls='axs'; label='AXS'; }
  else if (s.includes('livenation') || s.includes('live nation')) { cls='ln'; label='Live Nation'; }
  else if (s.includes('paciolan') || s.includes('evenue') || s.includes('tdc')) { cls='pa'; label='Paciolan'; }
  else if (s.includes('tdc'))       { cls='tdc'; label='TDC'; }
  return `<span class="source-badge ${cls}">${label}</span>`;
}

// ── Normalise a URL ───────────────────────────────────────────
function fixUrl(url) {
  if (!url) return null;
  url = url.trim();
  if (url.startsWith('You would') || url.length < 4) return null;
  if (!url.startsWith('http')) url = 'https://' + url;
  return url;
}

// ── Render category grid ──────────────────────────────────────
function renderCats() {
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = CATS.map(c => {
    const count = DATA[c.key] ? DATA[c.key].length : 0;
    return `<button class="cat-btn" onclick="selectCat('${c.key}')">
      <span class="cat-icon">${c.icon}</span>
      <div class="cat-info">
        <div class="cat-name">${c.label}</div>
        <div class="cat-count">${count.toLocaleString()} entries</div>
      </div>
    </button>`;
  }).join('');
}

// ── Select category ───────────────────────────────────────────
function selectCat(key) {
  activeCat = key;
  const cat = CATS.find(c => c.key === key);
  document.getElementById('cat-panel').style.display = 'none';
  document.getElementById('search-panel').classList.add('visible');
  document.getElementById('active-cat-icon').textContent = cat.icon;
  document.getElementById('active-cat-name').textContent = cat.label;
  document.getElementById('search-hint').textContent = cat.hint;
  document.getElementById('search-input').placeholder = cat.key === 'Music and Performing Arts'
    ? 'Search venues or partners…'
    : 'Search teams…';


  const input = document.getElementById('search-input');
  input.value = '';
  input.focus();
  renderResults('');
}

// ── Back to categories ────────────────────────────────────────
function showCategories() {
  activeCat = null;
  document.getElementById('cat-panel').style.display = '';
  document.getElementById('search-panel').classList.remove('visible');
}

// ── Render a single result card ───────────────────────────────
function renderCard(row, cat) {
  const isMusic = cat === 'Music and Performing Arts';
  let name, sub, links, badgeHtml = '';

  if (isMusic) {
    name = row.Partner || row.Venue || '—';
    const venue = row.Venue || '';
    const type  = row['Ticket Type'] || '';
    const url   = fixUrl(row.Link);
    sub = venue ? `<span class="venue-tag">📍 ${venue}</span>` : '';
    if (type) sub += ` <span class="ticket-type-badge">${type}</span>`;
    links = url ? [{label:'Access Tickets', url}] : [];
  } else {
    name = row.Team || '—';
    const src = row['XFER Source(s)'] || '';
    badgeHtml = sourceBadge(src);
    sub = src ? `<span style="color:var(--slate);font-size:12px;">${src}</span>` : '';
    // Handle multiple links separated by newline
    const rawLinks = (row.Link || '').split('\n').map(u => fixUrl(u)).filter(Boolean);
    links = rawLinks.map((u,i) => ({label: rawLinks.length > 1 ? `Portal ${i+1}` : 'Access Tickets', url: u}));
  }

  const linksHtml = links.map(l =>
    `<a class="card-link-btn" href="${l.url}" target="_blank" rel="noopener">
      ${l.label}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 10L10 2M10 2H5M10 2V7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </a>`
  ).join('');

  const noLinkHtml = links.length === 0
    ? `<span style="font-size:11px;color:var(--slate);max-width:120px;text-align:center;line-height:1.3;">Contact support for tickets</span>`
    : '';

  return `<div class="result-card">
    <div class="card-body">
      <div class="card-name" title="${name}">${name}</div>
      <div class="card-sub">${badgeHtml}${sub}</div>
    </div>
    <div class="card-links">${linksHtml}${noLinkHtml}</div>
  </div>`;
}

// ── Render results ────────────────────────────────────────────
function renderResults(query) {
  const rows = DATA[activeCat] || [];
  const q = query.trim().toLowerCase();
  const isMusic = activeCat === 'Music and Performing Arts';

  let filtered;
  if (!q) {
    filtered = rows.slice(0, isMusic ? 50 : rows.length);
  } else {
    filtered = rows.filter(r => {
      if (isMusic) {
        return (r.Partner||'').toLowerCase().includes(q) ||
               (r.Venue||'').toLowerCase().includes(q);
      } else {
        return (r.Team||'').toLowerCase().includes(q);
      }
    });
    if (isMusic) filtered = filtered.slice(0, 200);
  }

  const grid = document.getElementById('results-grid');
  const countEl = document.getElementById('result-count');

  if (!q && isMusic) {
    countEl.innerHTML = `Showing first 50 of <strong>${rows.length.toLocaleString()}</strong> entries — type to search`;
  } else {
    countEl.innerHTML = `<strong>${filtered.length.toLocaleString()}</strong> result${filtered.length !== 1 ? 's' : ''}${q ? ` for "<strong>${query}</strong>"` : ''}`;
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="21" cy="21" r="14" stroke="currentColor" stroke-width="2.5"/>
        <path d="M31 31L42 42" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <div style="font-size:16px;font-weight:600;color:var(--text);margin-bottom:6px;">No results found</div>
      <div>Try a different search term</div>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(r => renderCard(r, activeCat)).join('');

}

// ── Search listener ───────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', e => {
  renderResults(e.target.value);
});

// ── Logo fallback ──────────────────────────────────────────────
const logoImg = document.querySelector('.logo img');
if (logoImg) {
  logoImg.addEventListener('load', () => { logoImg.style.display = ''; });
  logoImg.addEventListener('error', () => {
    logoImg.style.display = 'none';
    document.querySelector('.logo-text').style.display = '';
  });
}

// ── Init ──────────────────────────────────────────────────────
renderCats();
// ── GLOBAL HERO SEARCH (added) ────────────────────────────────
// Searches every category for a team or venue and injects the search box into
// the hero. Injection (rather than static markup) means it also appears on the
// WordPress build, where the hero is a frozen Elementor HTML widget.

function gEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

let GLOBAL_INDEX = null;
function buildGlobalIndex() {
  if (GLOBAL_INDEX) return GLOBAL_INDEX;
  GLOBAL_INDEX = [];
  CATS.forEach(c => {
    const isMusic = c.key === 'Music and Performing Arts';
    (DATA[c.key] || []).forEach(row => {
      const name = isMusic ? (row.Partner || row.Venue || '') : (row.Team || '');
      if (!name) return;
      const venue = isMusic ? (row.Venue || '') : '';
      GLOBAL_INDEX.push({
        name, venue, cat: c.key, label: c.label, icon: c.icon,
        search: (name + ' ' + venue).toLowerCase()
      });
    });
  });
  return GLOBAL_INDEX;
}

function renderGlobalResults(query) {
  const panel = document.getElementById('global-search-results');
  if (!panel) return;
  const q = query.trim().toLowerCase();
  if (q.length < 2) { panel.classList.remove('visible'); panel.innerHTML = ''; return; }

  const idx = buildGlobalIndex();
  const matches = [];
  for (let i = 0; i < idx.length && matches.length < 60; i++) {
    if (idx[i].search.includes(q)) matches.push(idx[i]);
  }

  if (matches.length === 0) {
    panel.innerHTML = '<div class="gr-empty">No teams or venues match “' + gEsc(query) + '”.</div>';
    panel.classList.add('visible');
    return;
  }

  panel.innerHTML = matches.map(m =>
    '<button type="button" class="global-result-row" data-cat="' + encodeURIComponent(m.cat) +
      '" data-name="' + encodeURIComponent(m.name) + '">' +
      '<span class="gr-icon">' + m.icon + '</span>' +
      '<span class="gr-text">' +
        '<span class="gr-name">' + gEsc(m.name) + '</span>' +
        (m.venue ? '<span class="gr-venue">' + gEsc(m.venue) + '</span>' : '') +
      '</span>' +
      '<span class="gr-cat">' + gEsc(m.label) + '</span>' +
    '</button>'
  ).join('');
  panel.classList.add('visible');
}

function goToGlobalResult(cat, name) {
  if (typeof selectCat === 'function') selectCat(cat);
  const input = document.getElementById('search-input');
  if (input) input.value = name;
  if (typeof renderResults === 'function') renderResults(name);
  const panel = document.getElementById('global-search-results');
  if (panel) panel.classList.remove('visible');
  const sp = document.getElementById('search-panel');
  if (sp && sp.scrollIntoView) sp.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function initGlobalSearch() {
  if (document.getElementById('global-search-input')) return; // already injected

  // Anchor to the hero title ("Find Your Ticket Portal") so it sits right below it.
  let anchor = null;
  const heads = document.querySelectorAll('h1, h2, .elementor-heading-title');
  for (let i = 0; i < heads.length; i++) {
    if (/ticket portal/i.test(heads[i].textContent || '')) { anchor = heads[i]; break; }
  }
  if (!anchor) {
    const hero = document.querySelector('.hero');
    if (hero) anchor = hero.querySelector('h1') || hero.lastElementChild;
  }
  if (!anchor || !anchor.parentNode) return;

  const wrap = document.createElement('div');
  wrap.className = 'hero-search-wrap';
  wrap.innerHTML =
    '<input id="global-search-input" type="text" autocomplete="off" placeholder="Search any team or venue…" />' +
    '<span class="hero-search-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none">' +
      '<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2"/>' +
      '<path d="M12.5 12.5L16 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></span>' +
    '<div id="global-search-results" class="global-results"></div>';

  anchor.parentNode.insertBefore(wrap, anchor.nextSibling);

  document.getElementById('global-search-input')
    .addEventListener('input', e => renderGlobalResults(e.target.value));

  const panel = document.getElementById('global-search-results');
  panel.addEventListener('click', e => {
    const row = e.target.closest('.global-result-row');
    if (!row) return;
    goToGlobalResult(decodeURIComponent(row.dataset.cat), decodeURIComponent(row.dataset.name));
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) panel.classList.remove('visible');
  });
}

initGlobalSearch();

// ── Remove legacy step breadcrumbs (also strips the WordPress build's baked-in markup) ──
(function () {
  var si = document.getElementById('step-indicator');
  if (si) si.remove();
})();
