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

  // Update step indicator
  document.getElementById('step1').classList.remove('active'); document.getElementById('step1').classList.add('done');
  document.getElementById('step2').classList.add('active');
  document.getElementById('step3').classList.remove('active');

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
  document.getElementById('step1').classList.add('active'); document.getElementById('step1').classList.remove('done');
  document.getElementById('step2').classList.remove('active');
  document.getElementById('step3').classList.remove('active');
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

  // Update step 3
  if (q || !isMusic) {
    document.getElementById('step3').classList.add('active');
  }
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