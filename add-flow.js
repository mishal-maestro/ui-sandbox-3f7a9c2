/* ============================================================
   Add-to-collection flow  (Sunthar call, Jun 1 2026)
   Injected on top of the Conductor dev-build snapshot.

   Two entry points, per the call:
   1. Per-collection "Add to {collection}"  -> choose Manual or Maestro AI
      (consolidates the old "Maestro AI" + "Add option" buttons into one)
   2. Itinerary-level "Add collection to itinerary"
      -> name + type (Create) -> choose Manual or Maestro AI
   Manual = type-aware side-sheet form (Figma frame 08).
   AI     = stub (full Maestro AI chat is a separate slice).
   ============================================================ */
(function () {
  'use strict';

  /* ---- icons ---- */
  const S = (p, o = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${o}>${p}</svg>`;
  const IC = {
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    hotels: '<path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16"/><path d="M19 21V11a1 1 0 0 0-1-1h-2"/><path d="M9 7h.01M9 11h.01M9 15h.01M13 7h.01M13 11h.01M13 15h.01"/>',
    flights: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 5.3 3.5c.4.3.8.2 1.3 0l.5-.3c.4-.2.6-.6.5-1.1z"/>',
    experiences: '<path d="M9.9 15.5A2 2 0 0 0 8.5 14.1l-6.1-1.6a.5.5 0 0 1 0-1L8.5 9.9A2 2 0 0 0 9.9 8.5l1.6-6.1a.5.5 0 0 1 1 0L14.1 8.5A2 2 0 0 0 15.5 9.9l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z"/>',
    dining: '<path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    transfers: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    notes: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/><path d="M8 13h8M8 17h8M8 9h2"/>',
    bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2M20 14h2M15 13v2M9 13v2"/>',
    sparkles: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/><path d="M20 2v4"/><path d="M22 4h-4"/><circle cx="4" cy="20" r="2"/>',
    pencil: '<path d="M21.2 6.8a2 2 0 0 0-3-3L4 18l-1 4 4-1Z"/><path d="m15 5 3 3"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6M14 11v6"/>',
    pencilSm: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    arrowUp: '<path d="m5 12 7-7 7 7"/><path d="M12 19V5"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    cal: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    medal: '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
    compare: '<path d="m16 3 4 4-4 4"/><path d="M20 7H4"/><path d="m8 21-4-4 4-4"/><path d="M4 17h16"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  };

  const TYPES = ['hotels', 'flights', 'experiences', 'dining', 'transfers', 'notes'];
  const TLABEL = { hotels: 'Hotels', flights: 'Flights', experiences: 'Experiences', dining: 'Dining', transfers: 'Transfers', notes: 'Notes' };

  /* ---- Members (for assignee dropdown) ---- */
  const MEMBERS = [
    { id: 'ai', name: 'Maestro AI', initials: 'AI', color: 'var(--color-maestro-accent)' },
    { id: 'sd', name: 'Scott DuBois', initials: 'SD', color: '#6366f1' },
    { id: 'su', name: 'Sunthar P.', initials: 'SU', color: '#8b5cf6' },
    { id: 'ac', name: 'Andy Cantu', initials: 'AC', color: '#14b8a6' },
    { id: 'kr', name: 'Kenny R.', initials: 'KR', color: '#f59e0b' },
  ];
  const UNASSIGNED = { id: 'unassigned', name: 'Unassigned', initials: '?', color: 'transparent' };

  function memberAvatar(m, size = '16') {
    const bg = m.id === 'unassigned' ? 'transparent' : m.color;
    const border = m.id === 'unassigned' ? `border: 1.5px dashed var(--color-maestro-border);` : '';
    const txtColor = m.id === 'unassigned' ? 'var(--color-maestro-text-tertiary)' : '#fff';
    return `<span class="af-avatar" style="display:inline-flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};${border}font-size:${Math.floor(size * 0.45)}px;font-weight:600;color:${txtColor};flex-shrink:0;">${m.initials}</span>`;
  }

  let openAssigneeMenu = null;
  function closeAssigneeMenu() {
    if (openAssigneeMenu) {
      openAssigneeMenu.remove();
      openAssigneeMenu = null;
    }
  }

  function showAssigneeMenu(anchor, currentId, onSelect) {
    closeAssigneeMenu();
    const menu = document.createElement('div');
    menu.className = 'af-assignee-menu';
    const all = [UNASSIGNED, ...MEMBERS];
    menu.innerHTML = all.map((m) => {
      const sel = m.id === currentId ? 'af-selected' : '';
      return `<button type="button" class="af-assignee-item ${sel}" data-id="${m.id}">${memberAvatar(m, 20)}<span>${m.name}</span></button>`;
    }).join('');
    document.body.appendChild(menu);
    openAssigneeMenu = menu;

    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${rect.left}px`;

    requestAnimationFrame(() => menu.classList.add('af-open'));

    menu.querySelectorAll('.af-assignee-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.dataset.id;
        onSelect(id);
        closeAssigneeMenu();
      });
    });

    const closeOut = (e) => {
      if (!menu.contains(e.target) && !anchor.contains(e.target)) {
        closeAssigneeMenu();
        document.removeEventListener('click', closeOut);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOut), 50);
  }

  function assigneeChip(assigneeId, onClick) {
    const m = MEMBERS.find((x) => x.id === assigneeId) || UNASSIGNED;
    if (m.id === 'unassigned') {
      return `<button type="button" class="af-assignee-chip af-unassigned">${memberAvatar(m, 16)}<span>Assign</span>${S(IC.chevD, 'width="11" height="11"')}</button>`;
    }
    return `<button type="button" class="af-assignee-chip">${memberAvatar(m, 16)}<span>${m.name}</span>${S(IC.chevD, 'width="11" height="11"')}</button>`;
  }

  /* ---- per-type form schema (Figma 08: fields vary by type) ---- */
  function fieldsFor(type, ctx) {
    const dest = ctx.dest || '';
    const day = ctx.day || 'Day 1';
    const titleCfg = {
      hotels: ['Hotel name', 'e.g. The Siam Hotel'],
      flights: ['Flight / route', 'e.g. BKK to CNX'],
      experiences: ['Title', 'e.g. Private longtail boat tour'],
      dining: ['Restaurant', 'e.g. Sorn'],
      transfers: ['Transfer', 'e.g. Airport to hotel, private car'],
      notes: ['Title', 'e.g. Visa reminder'],
    }[type];
    const top = `
      <div class="af-field">
        <label class="af-label">${titleCfg[0]}</label>
        <input class="af-input" data-req placeholder="${titleCfg[1]}">
      </div>
      <div class="af-row">
        <div class="af-field"><label class="af-label">Destination</label><input class="af-input" value="${dest}" placeholder="Bangkok"></div>
        <div class="af-field"><label class="af-label">Add to day</label>
          <select class="af-select"><option>${day}</option><option>Day 2</option><option>Day 3</option><option>Day 4</option></select></div>
      </div>`;
    const mid = {
      hotels: `
        <div class="af-row">
          <div class="af-field"><label class="af-label">Check-in</label><input class="af-input" placeholder="May 24, 2024"></div>
          <div class="af-field"><label class="af-label">Nights</label><input class="af-input" placeholder="2"></div>
        </div>
        <div class="af-row">
          <div class="af-field"><label class="af-label">Room</label><input class="af-input" placeholder="Deluxe suite"></div>
          <div class="af-field"><label class="af-label">Price / night</label><input class="af-input" placeholder="$700"></div>
        </div>
        <div class="af-field"><label class="af-label">Supplier</label><input class="af-input" placeholder="Direct / LiteAPI"></div>`,
      flights: `
        <div class="af-row">
          <div class="af-field"><label class="af-label">Date</label><input class="af-input" placeholder="May 24, 2024"></div>
          <div class="af-field"><label class="af-label">Cabin</label><input class="af-input" placeholder="Business"></div>
        </div>
        <div class="af-row">
          <div class="af-field"><label class="af-label">Carrier</label><input class="af-input" placeholder="Thai Airways"></div>
          <div class="af-field"><label class="af-label">Price</label><input class="af-input" placeholder="$420"></div>
        </div>`,
      experiences: `
        <div class="af-row">
          <div class="af-field"><label class="af-label">Date</label><input class="af-input" placeholder="May 24, 2024"></div>
          <div class="af-field"><label class="af-label">Start time</label><input class="af-input" placeholder="10:00"></div>
          <div class="af-field"><label class="af-label">Duration</label><input class="af-input" placeholder="90 min"></div>
        </div>
        <div class="af-row">
          <div class="af-field"><label class="af-label">Price / person</label><input class="af-input" placeholder="$120"></div>
          <div class="af-field"><label class="af-label">Supplier / vendor</label><input class="af-input" placeholder="Local operator"></div>
        </div>`,
      dining: `
        <div class="af-row">
          <div class="af-field"><label class="af-label">Date</label><input class="af-input" placeholder="May 24, 2024"></div>
          <div class="af-field"><label class="af-label">Time</label><input class="af-input" placeholder="19:30"></div>
        </div>
        <div class="af-row">
          <div class="af-field"><label class="af-label">Cuisine</label><input class="af-input" placeholder="Thai fine dining"></div>
          <div class="af-field"><label class="af-label">Price / person</label><input class="af-input" placeholder="$180"></div>
        </div>
        <div class="af-field"><label class="af-label">Reservation ref</label><input class="af-input" placeholder="Held under Harrison"></div>`,
      transfers: `
        <div class="af-row">
          <div class="af-field"><label class="af-label">Date</label><input class="af-input" placeholder="May 24, 2024"></div>
          <div class="af-field"><label class="af-label">Pickup time</label><input class="af-input" placeholder="08:00"></div>
        </div>
        <div class="af-row">
          <div class="af-field"><label class="af-label">Vehicle</label><input class="af-input" placeholder="Private SUV"></div>
          <div class="af-field"><label class="af-label">Price</label><input class="af-input" placeholder="$90"></div>
        </div>`,
      notes: ``,
    }[type];
    const desc = `<div class="af-field"><label class="af-label">${type === 'notes' ? 'Note' : 'Description'}</label><textarea class="af-textarea" placeholder="${type === 'notes' ? 'Anything the traveler should know...' : 'Notes / description for the client...'}"></textarea></div>`;
    const toggles = type === 'notes' ? '' : `
      <div class="af-toggle"><div class="af-toggle-tx"><div class="af-toggle-tt">Booking required</div><div class="af-toggle-ds">Track this in Booking Operations</div></div><div class="af-switch" data-toggle></div></div>
      <div class="af-toggle"><div class="af-toggle-tx"><div class="af-toggle-tt">Set as recommended</div><div class="af-toggle-ds">Show as the chosen option for this collection</div></div><div class="af-switch" data-toggle></div></div>`;
    return top + mid + desc + toggles;
  }

  function inferType(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('hotel') || n.includes('stay')) return 'hotels';
    if (n.includes('experience') || n.includes('activit')) return 'experiences';
    if (n.includes('dining') || n.includes('restaurant') || n.includes('food')) return 'dining';
    if (n.includes('flight')) return 'flights';
    if (n.includes('transfer') || n.includes('transport')) return 'transfers';
    if (n.includes('note')) return 'notes';
    return 'experiences';
  }
  function firstWord(name) { return (name || '').split(/[,\s]/)[0] || ''; }

  /* ---- dates (date model from the Jun 2 Sunthar/Scott huddle) ---- */
  const GEN_TYPES = ['hotels', 'flights', 'dining', 'experiences', 'transfers'];
  function toYMD(s) { const d = new Date(s); if (isNaN(d)) return ''; const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${d.getFullYear()}-${m}-${dd}`; }
  function fromYMD(ymd) { if (!ymd) return ''; const p = ymd.split('-').map(Number); const dt = new Date(p[0], p[1] - 1, p[2]); return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  function dayName(s) { const d = new Date(s); if (isNaN(d)) return ''; return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }); }
  function rangeLabel(a, b) { if (!a) return ''; const s = fromYMD(a); return (!b || b === a) ? s : `${s} - ${fromYMD(b)}`; }
  let tripDateEl = null;
  function computeTrip() {
    let min = null, max = null;
    document.querySelectorAll('.af-coll-date').forEach((el) => {
      const s = el.dataset.start, e = el.dataset.end || el.dataset.start;
      if (s && (!min || s < min)) min = s;
      if (e && (!max || e > max)) max = e;
    });
    if (tripDateEl && min && max) tripDateEl.textContent = `${fromYMD(min)} - ${fromYMD(max)}`;
  }

  /* ---- DOM scaffold ---- */
  let scrim, sheet, headEl, bodyEl, footEl, toastEl, toastT;
  const st = { mode: null, step: null, type: null, name: '', collection: '', dest: '', onAdded: null };

  function build() {
    scrim = document.createElement('div');
    scrim.className = 'af-scrim';
    scrim.addEventListener('click', close);

    sheet = document.createElement('aside');
    sheet.className = 'af-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.innerHTML = `<div class="af-head"></div><div class="af-body"></div><div class="af-foot"></div>`;
    headEl = sheet.querySelector('.af-head');
    bodyEl = sheet.querySelector('.af-body');
    footEl = sheet.querySelector('.af-foot');

    toastEl = document.createElement('div');
    toastEl.className = 'af-toast';

    document.body.append(scrim, sheet, toastEl);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function setHead(title, sub, back) {
    sheet.classList.remove('af-xwide');
    bodyEl.classList.remove('af-flat');
    headEl.innerHTML = `
      <div>
        ${back ? `<button class="af-back" data-back>${S(IC.chevL)} Back</button>` : ''}
        <div class="af-head-title">${title}</div>
        ${sub ? `<div class="af-head-sub">${sub}</div>` : ''}
      </div>
      <button class="af-x" aria-label="Close" data-close>${S(IC.x)}</button>`;
    headEl.querySelector('[data-close]').addEventListener('click', close);
    const b = headEl.querySelector('[data-back]');
    if (b) b.addEventListener('click', back);
  }

  function open(opts) {
    Object.assign(st, { mode: opts.mode, type: opts.type || null, name: '', collection: opts.collection || '', dest: opts.dest || '', day: opts.day || '', dayDate: opts.dayDate || '', start: opts.start || '', end: opts.end || '', dateEl: opts.dateEl || null, genTypes: new Set(), onAdded: opts.onAdded || null });
    if (opts.mode === 'newCollection') renderTypeStep();
    else if (opts.mode === 'editCollection') renderEditCollection();
    else renderChoice();
    requestAnimationFrame(() => { scrim.classList.add('af-open'); sheet.classList.add('af-open'); });
  }
  function close() { scrim.classList.remove('af-open'); sheet.classList.remove('af-open'); }

  /* ---- Step 1: new collection (name + type) ---- */
  function renderTypeStep() {
    st.step = 'type';
    sheet.classList.remove('af-wide');
    st.genTypes = new Set();
    const defStart = toYMD(st.dayDate) || '';
    st.start = defStart; st.end = defStart;
    setHead(st.day ? `Add Collection to ${st.day}` : 'Add Collection to itinerary',
      st.dayDate ? `${dayName(st.dayDate)} - generate or add curated options for this day` : '', null);
    bodyEl.innerHTML = `
      <div class="af-section">
        <label class="af-caps">Collection Name</label>
        <input class="af-input" id="af-cname" maxlength="120" placeholder='e.g. "Paris Hotels"'>
      </div>
      <div class="af-section">
        <label class="af-caps">Include in this generation</label>
        <div class="af-gentypes">
          ${GEN_TYPES.map((t) => `<button type="button" class="af-gentype" data-type="${t}" aria-pressed="false">${S(IC[t], 'width="18" height="18"')}<span>${TLABEL[t]}</span></button>`).join('')}
        </div>
      </div>
      <div class="af-section">
        <label class="af-caps">Dates</label>
        <div class="af-row">
          <div class="af-field"><label class="af-label">Start date</label><input type="date" class="af-input af-date" id="af-cstart" value="${defStart}"></div>
          <div class="af-field"><label class="af-label">End date</label><input type="date" class="af-input af-date" id="af-cend" value="${defStart}"></div>
        </div>
        <p class="af-subnote" style="margin:6px 0 0">Components added to this collection inherit these dates.</p>
      </div>`;
    footEl.innerHTML = `<button class="af-btn af-btn-ghost" data-cancel>Cancel</button><div class="af-spacer"></div><button class="af-btn af-btn-primary" data-create disabled title="Name this collection to continue">Create Collection</button>`;

    const nameInput = bodyEl.querySelector('#af-cname');
    const startInput = bodyEl.querySelector('#af-cstart');
    const endInput = bodyEl.querySelector('#af-cend');
    const createBtn = footEl.querySelector('[data-create]');
    const sync = () => { createBtn.disabled = !nameInput.value.trim(); };
    nameInput.addEventListener('input', () => { st.name = nameInput.value; sync(); });
    startInput.addEventListener('change', () => { st.start = startInput.value; if (endInput.value && endInput.value < startInput.value) endInput.value = startInput.value; st.end = endInput.value; });
    endInput.addEventListener('change', () => { st.end = endInput.value; });
    bodyEl.querySelectorAll('.af-gentype').forEach((tile) => {
      tile.addEventListener('click', () => {
        const on = tile.getAttribute('aria-pressed') === 'true';
        tile.setAttribute('aria-pressed', on ? 'false' : 'true');
        tile.classList.toggle('af-on', !on);
        if (on) st.genTypes.delete(tile.dataset.type); else st.genTypes.add(tile.dataset.type);
      });
    });
    footEl.querySelector('[data-cancel]').addEventListener('click', close);
    createBtn.addEventListener('click', () => {
      st.collection = st.name.trim();
      st.start = startInput.value; st.end = endInput.value || startInput.value;
      st.type = [...st.genTypes][0] || 'experiences';
      renderChoice();
    });
  }

  /* ---- Edit Collection (dates moved only at the collection level) ---- */
  function renderEditCollection() {
    st.step = 'editCollection';
    sheet.classList.remove('af-wide', 'af-xwide');
    bodyEl.classList.remove('af-flat');
    setHead('Edit Collection', st.collection || '', null);
    bodyEl.innerHTML = `
      <div class="af-section">
        <label class="af-caps">Collection Name</label>
        <input class="af-input" id="af-ename" maxlength="120" value="${st.collection || ''}">
      </div>
      <div class="af-section">
        <label class="af-caps">Dates</label>
        <div class="af-row">
          <div class="af-field"><label class="af-label">Start date</label><input type="date" class="af-input af-date" id="af-estart" value="${st.start || ''}"></div>
          <div class="af-field"><label class="af-label">End date</label><input type="date" class="af-input af-date" id="af-eend" value="${st.end || st.start || ''}"></div>
        </div>
        <p class="af-subnote" style="margin:6px 0 0">Changing dates moves the whole collection, and its components, to the new dates. The trip dates update automatically.</p>
      </div>`;
    footEl.innerHTML = `<button class="af-btn af-btn-ghost" data-cancel>Cancel</button><div class="af-spacer"></div><button class="af-btn af-btn-primary" data-save>Save changes</button>`;
    footEl.querySelector('[data-cancel]').addEventListener('click', close);
    footEl.querySelector('[data-save]').addEventListener('click', () => {
      const s = bodyEl.querySelector('#af-estart').value;
      const e = bodyEl.querySelector('#af-eend').value || s;
      if (st.dateEl) {
        st.dateEl.dataset.start = s; st.dateEl.dataset.end = e;
        st.dateEl.innerHTML = `${S(IC.cal, 'width="11" height="11"')} ${rangeLabel(s, e)}`;
      }
      computeTrip();
      toast(`Moved ${st.collection} to ${rangeLabel(s, e)}`);
      close();
    });
  }

  /* ---- Step 2: choice (manual vs AI) ---- */
  function ctxLabel() {
    return st.collection || st.day || 'itinerary';
  }
  function renderChoice() {
    st.step = 'choice';
    sheet.classList.remove('af-wide');
    const back = st.mode === 'newCollection' ? renderTypeStep : null;
    setHead(`Add to ${ctxLabel()}`, 'Generate or add a curated option', back);
    bodyEl.innerHTML = `
      <div class="af-choices">
        <button class="af-choice" data-go="manual">
          ${S(IC.plus, 'class="af-choice-ic-sm"')}
          <span class="af-choice-tt">Add Manually</span>
          <span class="af-choice-ds">Enter the details yourself</span>
        </button>
        <button class="af-choice af-ai" data-go="ai">
          ${S(IC.sparkles, 'class="af-choice-ic-sm"')}
          <span class="af-choice-tt">Add with AI</span>
          <span class="af-choice-ds">Generate options from a prompt</span>
        </button>
      </div>`;
    footEl.innerHTML = '';
    bodyEl.querySelector('[data-go="manual"]').addEventListener('click', () => renderManual());
    bodyEl.querySelector('[data-go="ai"]').addEventListener('click', () => renderAI());
  }

  /* ---- Step 3a: manual form ---- */
  function renderManual() {
    st.step = 'manual';
    const type = st.type || 'experiences';
    if (type === 'hotels') return renderHotelDetails();
    sheet.classList.add('af-wide');
    setHead(`Add to ${ctxLabel()}`, `${TLABEL[type]} details`, renderChoice);
    bodyEl.innerHTML = fieldsFor(type, { dest: st.dest || firstWord(st.collection), day: 'Day 1' }) + `
      <div class="af-aihint">${S(IC.bot)}<span>Prefer AI? Generate ${TLABEL[type].toLowerCase()} options instead of typing.</span><button data-switch-ai>Use AI</button></div>`;
    footEl.innerHTML = `
      <button class="af-btn af-btn-ghost" data-cancel>Cancel</button>
      <div class="af-spacer"></div>
      <button class="af-btn af-btn-outline" data-save-another>Save &amp; add another</button>
      <button class="af-btn af-btn-primary" data-add disabled>Add to itinerary</button>`;

    bodyEl.querySelectorAll('[data-toggle]').forEach((sw) => sw.addEventListener('click', () => sw.classList.toggle('af-on')));
    bodyEl.querySelector('[data-switch-ai]').addEventListener('click', () => renderAI());
    const addBtn = footEl.querySelector('[data-add]');
    const req = bodyEl.querySelector('[data-req]');
    const sync = () => { addBtn.disabled = !req.value.trim(); };
    req.addEventListener('input', sync); sync();
    footEl.querySelector('[data-cancel]').addEventListener('click', close);
    footEl.querySelector('[data-save-another]').addEventListener('click', () => { if (req.value.trim()) { commitAdd(req.value.trim()); renderManual(); } });
    addBtn.addEventListener('click', () => { commitAdd(req.value.trim()); close(); });
  }

  /* ---- Step 3a (hotels): rich Hotel Details editor (matches dev build) ---- */
  function renderHotelDetails() {
    st.step = 'hotelDetails';
    setHead('Hotel Details', `${ctxLabel()} · Draft`, renderChoice);
    sheet.classList.add('af-xwide');
    bodyEl.classList.add('af-flat');
    const edit = (label, ph) => `
      <button type="button" class="w-full text-left group rounded-md px-2 py-1 -mx-2 hover:bg-maestro-surface/60 transition-colors">
        <div class="text-[9px] text-maestro-text-tertiary mb-0.5">${label}</div>
        <div class="flex items-center gap-1.5"><span class="flex-1 min-w-0 text-maestro-text-muted italic">${ph}</span>
          ${S(IC.pencilSm, 'class="text-maestro-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" width="12" height="12"')}</div>
      </button>`;
    bodyEl.innerHTML = `
      <div class="af-pane">
        <div class="rounded-2xl bg-maestro-card border border-maestro-border shadow-soft-1">
          <div class="flex items-center gap-2 px-3 py-2.5 border-b border-maestro-border/50">
            <div class="p-1.5 bg-maestro-surface rounded-md shrink-0">${S(IC.hotels, 'class="text-maestro-text-tertiary" width="14" height="14"')}</div>
            <div class="flex-1 min-w-0">
              <div class="text-[9px] text-maestro-text-tertiary">Stay dates</div>
              <div class="flex items-center gap-1.5 text-[12px] font-medium text-maestro-text-secondary">${S(IC.lock, 'width="11" height="11" class="text-maestro-text-tertiary"')}<span>${rangeLabel(st.start, st.end) || (st.dayDate ? fromYMD(toYMD(st.dayDate)) : 'May 24, 2024')}</span></div>
              <div class="text-[9px] text-maestro-text-tertiary mt-0.5 italic">Inherited from collection. Edit on the collection to move.</div>
            </div>
          </div>
          <div class="px-3 pt-2.5"><label class="text-[10px] text-maestro-text-tertiary">Property Name</label><input class="w-full border rounded bg-maestro-card border-maestro-border focus:border-maestro-accent focus:outline-none px-2 py-1 text-sm font-semibold" placeholder="e.g. Four Seasons Florence"></div>
          <div class="px-3 pt-2"><button type="button" class="w-full aspect-[3/2] rounded-lg overflow-hidden relative border-2 border-dashed border-maestro-border hover:border-maestro-accent cursor-pointer transition-colors"><img alt="" class="w-full h-full object-cover opacity-40" src="https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=800&auto=format&fit=crop"><div class="absolute inset-0 flex flex-col items-center justify-center gap-1.5">${S(IC.plus, 'class="text-maestro-text-muted" width="24" height="24"')}<span class="text-xs font-medium text-maestro-text-muted">Add images</span></div></button></div>
          <div class="px-3 pt-3"><div class="text-[9px] text-maestro-text-tertiary mb-0.5">Advisor Note</div><div class="text-maestro-text-muted text-sm italic leading-relaxed border-l-2 border-maestro-accent pl-3">Click to add advisor note</div></div>
          <div class="px-3 pt-3">
            <p class="text-xs font-bold uppercase tracking-wide text-maestro-text-secondary mb-2">Property Details</p>
            <div class="space-y-2">
              <div><label class="text-[10px] text-maestro-text-tertiary">Location search</label><input placeholder="Search hotel address..." class="w-full text-sm bg-maestro-surface border border-maestro-border rounded-md px-2.5 py-1.5 text-maestro-text-primary placeholder:text-maestro-text-tertiary focus:outline-none focus:border-maestro-accent"></div>
              ${edit('Address line 1', 'Click to add address')}
              ${edit('Address line 2', 'Suite, floor, building…')}
              <div class="grid grid-cols-2 gap-1.5">${edit('City', '—')}${edit('State / Province', '—')}</div>
              <div class="grid grid-cols-2 gap-1.5">${edit('Postal code', '—')}${edit('Country', '—')}</div>
              ${edit('Phone', 'Click to add phone')}
              ${edit('Website', 'Click to add website')}
              <div class="grid grid-cols-2 gap-1.5 pt-1">
                <div><label class="text-[10px] text-maestro-text-tertiary">Style</label><select class="w-full border border-maestro-border rounded-md px-2 py-1.5 bg-maestro-card focus:outline-none focus:border-maestro-accent text-xs"><option value="">—</option><option>Boutique</option><option>Chain</option><option>Resort</option><option>Villa</option><option>5-Star</option><option>Historic</option><option>Design</option></select></div>
                <div><label class="text-[10px] text-maestro-text-tertiary">Star rating</label><input type="number" min="0" max="5" step="1" placeholder="0–5" class="w-full border rounded bg-maestro-card border-maestro-border focus:border-maestro-accent focus:outline-none text-[11px] px-2 py-1"></div>
              </div>
              ${edit('Loyalty program', 'Click to add loyalty program')}
              ${edit('Amenities (one per line)', 'Click to add amenities')}
            </div>
          </div>
          <div class="px-3 pt-3">
            <p class="text-xs font-bold uppercase tracking-wide text-maestro-text-secondary mb-2">Selected Rate</p>
            <div class="rounded-lg border border-maestro-accent/20 bg-maestro-accent/[0.03] p-3">
              <div class="flex items-start justify-between gap-2"><div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">${S(IC.check, 'class="text-maestro-success shrink-0" width="14" height="14"')}<span class="text-sm font-semibold text-maestro-text">Standard Room</span></div>
                <button type="button" class="mt-0.5 text-[11px] text-maestro-accent inline-flex items-center gap-1">${S(IC.search, 'width="12" height="12"')}Find Rates</button>
              </div><div class="text-right shrink-0"><div class="text-sm font-bold text-maestro-text">—<span class="text-xs font-normal text-maestro-text-muted">/night</span></div></div></div>
            </div>
            <button type="button" class="mt-2 flex items-center gap-1.5 text-[11px] text-maestro-text-muted hover:text-maestro-accent">${S(IC.pencilSm, 'width="12" height="12"')}Enter rate manually</button>
          </div>
          <div class="px-3 py-2.5 space-y-2.5">
            <label class="flex items-center gap-2 text-[11px] text-maestro-text-secondary cursor-pointer select-none"><span class="size-3.5 rounded-[4px] border border-maestro-border inline-block"></span>Customer booked (exclude from pricing)</label>
            <div class="rounded-md border border-dashed border-maestro-accent/40 bg-maestro-accent-light/20 px-3 py-2 flex items-center gap-3">${S(IC.shield, 'class="text-maestro-accent shrink-0" width="14" height="14"')}<div class="flex-1 min-w-0"><div class="text-[11px] font-semibold text-maestro-text-primary">Not booked yet</div><div class="text-[10px] text-maestro-text-tertiary">Charge a card to confirm, or toggle "Customer booked" if the client handled it.</div></div><button type="button" class="shrink-0 inline-flex items-center gap-1 rounded-md bg-maestro-accent text-maestro-on-accent px-2.5 py-1 text-xs font-medium">${S(IC.card, 'width="11" height="11"')}Book</button></div>
            <div><div class="flex items-center justify-between mb-1.5"><p class="text-[11px] font-semibold uppercase tracking-wide text-maestro-text-tertiary">Attachments</p><button type="button" class="flex items-center gap-1 text-[11px] text-maestro-text-secondary border border-maestro-border rounded-md px-2 py-0.5 hover:bg-maestro-surface">Add file</button></div><p class="text-[11px] text-maestro-text-tertiary italic">No files attached. Upload confirmation PDFs, vouchers, or scans.</p></div>
            <div class="pt-1.5 border-t border-maestro-border/50 flex items-center justify-between">
              <span class="inline-flex items-center font-medium rounded-full gap-1 bg-maestro-surface text-maestro-text-secondary px-1.5 py-0.5 text-[10px]">Draft</span>
              <div class="flex items-center gap-1">
                <button type="button" class="inline-flex items-center gap-1 rounded-md text-maestro-text-secondary border border-maestro-border px-2.5 py-1 text-xs hover:bg-maestro-surface">${S(IC.transfers, 'width="12" height="12"')}Transfer here</button>
                <button type="button" class="inline-flex items-center gap-1 rounded-md text-maestro-text-secondary border border-maestro-border px-2.5 py-1 text-xs hover:bg-maestro-surface">${S(IC.transfers, 'width="12" height="12"')}Transfer from</button>
                <button type="button" aria-label="Delete" class="inline-flex items-center rounded-md text-maestro-danger px-2.5 py-1 text-xs hover:bg-maestro-danger-light">${S(IC.trash, 'width="12" height="12"')}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <aside class="w-[280px] shrink-0 border-l border-maestro-border bg-maestro-bg/40 flex flex-col">
        <div class="flex items-center justify-between px-3 pt-3 pb-2"><div class="flex items-baseline gap-2"><span class="text-xs font-semibold uppercase tracking-wider text-maestro-text-secondary">Item tasks</span><span class="text-[10px] text-maestro-text-tertiary">0 open · 0 total</span></div><button type="button" class="flex items-center gap-1 text-[11px] text-maestro-accent">${S(IC.plus, 'width="12" height="12"')}Add</button></div>
        <div class="flex-1 overflow-y-auto px-2 pb-2"><div class="px-2 py-4 text-[11px] text-maestro-text-tertiary text-center">No tasks yet. Add one to get started.</div></div>
      </aside>`;
    footEl.innerHTML = `<button class="af-btn af-btn-ghost" data-cancel>Cancel</button><div class="af-spacer"></div><button class="af-btn af-btn-primary" data-add>Add to itinerary</button>`;
    footEl.querySelector('[data-cancel]').addEventListener('click', close);
    footEl.querySelector('[data-add]').addEventListener('click', () => { commitAdd('Hotel'); close(); });
  }

  /* ---- Step 3b: Maestro AI modal (Figma 270-15414 / 17687 / 20009) ---- */
  function aiEmptyHTML() {
    const sug = (icon, label) => `<button class="af-ai-suggest" data-prompt="${label}">${S(icon)}<span>${label}</span><span class="af-ar">${S(IC.chevR)}</span></button>`;
    return `<div class="af-ai-empty">
      <div class="af-ai-empty-ic">${S(IC.sparkles)}</div>
      <h4>I'm ready to help with this trip.</h4>
      <p>I can help you compare options, improve the recommendation, find better perks, or generate new alternatives.</p>
      <div class="af-ai-suggests">
        ${sug(IC.medal, 'Find a stronger recommendation')}
        ${sug(IC.compare, 'Compare current options')}
        ${sug(IC.coins, 'Look for points opportunities')}
      </div>
    </div>`;
  }
  function aiSidebarHTML() {
    const tick = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-check shrink-0 text-maestro-success"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>`;
    const sparkle = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles text-maestro-accent"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path><path d="M20 2v4"></path><path d="M22 4h-4"></path><circle cx="4" cy="20" r="2"></circle></svg>`;
    const checkBtn = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"></path></svg>`;
    const xBtn = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>`;
    const sugTask = (o) => {
      const prCls = { High: 'af-pr-high', Medium: 'af-pr-med', Low: 'af-pr-low' }[o.priority] || 'af-pr-med';
      const sig = o.signals ? `<span class="af-tc-sig" title="Signal retriggered ${o.signals} times">${o.signals} signals</span>` : '';
      const assigneeId = o.assignee || 'unassigned';
      return `
      <li class="af-task-card af-task-card2 ${prCls}" data-task-title="${(o.title||'').replace(/"/g, '&quot;')}" data-task-desc="${(o.desc||'').replace(/"/g, '&quot;')}" data-task-priority="${o.priority}" data-task-signals="${o.signals || ''}" data-task-assignee="${assigneeId}" tabindex="0">
        <div class="af-tc-meta">
          <span class="af-tc-pr"><span class="af-tc-dot"></span>${o.priority}</span>
          <span class="af-tc-type" title="Orchestration tier">Assist</span>
          ${sig}
          <span class="af-tc-status">${o.status || 'Open'}</span>
        </div>
        <p class="af-tc-title">${o.title}</p>
        <p class="af-tc-desc">${o.desc}</p>
        <div class="af-tc-footer">
          ${assigneeChip(assigneeId)}
          <div class="af-tc-acts">
            <button type="button" class="af-tc-act af-tc-approve" aria-label="Approve">${checkBtn}</button>
            <button type="button" class="af-tc-act af-tc-dismiss" aria-label="Dismiss">${xBtn}</button>
          </div>
        </div>
      </li>`;
    };
    return `<aside class="w-80 shrink-0 border-l border-maestro-border/70 lg:block">
      <div class="flex h-full flex-col gap-5 overflow-y-auto p-4">
        <section>
          <h3 class="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-maestro-text-tertiary">${sparkle}Maestro AI Tasks</h3>
          <div class="my-2 max-w-[88%] space-y-1.5 rounded-xl border border-maestro-border/50 bg-maestro-surface/40 p-2.5">
            <div class="flex items-center gap-2 text-xs animate-slide-up">${tick}<span class="text-maestro-text-secondary">suggest collection options</span><span class="text-maestro-text-tertiary">· 3 options</span></div>
            <div class="flex items-center gap-2 text-xs animate-slide-up">${tick}<span class="text-maestro-text-secondary">Fact-checking the answer</span><span class="text-maestro-text-tertiary">· important</span></div>
            <div class="flex items-center gap-2 text-xs animate-slide-up">${tick}<span class="text-maestro-text-secondary">Checking it answered your ask</span><span class="text-maestro-text-tertiary">· important</span></div>
          </div>
        </section>
        <div data-testid="suggested-ops-tasks">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-maestro-text-tertiary">${sparkle}Suggested tasks</h3>
            <div class="flex items-center gap-1">
              <button type="button" class="group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-maestro-accent/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 text-maestro-text-tertiary hover:text-maestro-text-secondary hover:bg-maestro-surface active:bg-maestro-surface-raised px-2 py-0.5 text-[11px] gap-1">Approve all</button>
              <button type="button" class="group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-maestro-accent/30 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 text-maestro-text-tertiary hover:text-maestro-text-secondary hover:bg-maestro-surface active:bg-maestro-surface-raised px-2 py-0.5 text-[11px] gap-1">Dismiss all</button>
            </div>
          </div>
          <ul class="space-y-1.5 pb-2">
            ${sugTask({ title: 'Request written booking confirmation from the venue', desc: 'Confirmation prevents itinerary confusion and supports smooth client delivery.', type: 'Booking', priority: 'High', signals: 3, assignee: 'sd' })}
            ${sugTask({ title: 'Add reservation details to the Jakarta itinerary', desc: 'Client needs the dining name, date, and confirmation in the 1-night Jakarta plan.', type: 'Itinerary', priority: 'Medium', assignee: 'unassigned' })}
            ${sugTask({ title: 'Confirm party size and dining time with the client', desc: 'Trip file shows 1 traveller but intent reads as a couple; verify covers and timing.', type: 'Confirm', priority: 'Medium', assignee: 'ai' })}
            ${sugTask({ title: 'Verify halal suitability and no-pork offering', desc: 'Advisor asked for halal, no-pork venues; confirm directly for each restaurant.', type: 'Verify', priority: 'High', assignee: 'unassigned' })}
            ${sugTask({ title: 'Request written confirmation and key booking details', desc: 'Confirmation, address, and reservation name avoid errors on a one-night stop.', type: 'Booking', priority: 'Medium', assignee: 'su' })}
            ${sugTask({ title: 'Send the dining details to the client itinerary', desc: 'Client needs the confirmed name, date, time, and notes for a smooth meal.', type: 'Share', priority: 'Low', assignee: 'unassigned' })}
            ${sugTask({ title: 'Request a dinner reservation for 2026-06-06', desc: 'One-night Jakarta stay, so securing the exact date is necessary to fit this in.', type: 'Reserve', priority: 'High', assignee: 'ac' })}
            ${sugTask({ title: 'Confirm halal-friendly and no-pork suitability', desc: 'Advisor asked for halal, no-pork venues; verify against the requirement first.', type: 'Verify', priority: 'High', assignee: 'kr' })}
          </ul>
        </div>
        <section>
          <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-maestro-text-tertiary">Tasks</h3>
          <ul class="space-y-1.5 pb-2">
            <li class="flex items-center gap-2 rounded-lg border border-maestro-border/60 bg-maestro-surface/50 px-3 py-2 af-task-row cursor-pointer hover:bg-maestro-surface transition-colors" data-task-title="Reserve Al Nafoura for 2026-06-06"><span class="flex-1 truncate text-xs text-maestro-text-primary">Reserve Al Nafoura for 2026-06-06</span><span class="inline-flex items-center font-medium rounded-full gap-1 bg-maestro-surface text-maestro-text-secondary px-1.5 py-0.5 text-[10px]">Open</span></li>
            <li class="flex items-center gap-2 rounded-lg border border-maestro-border/60 bg-maestro-surface/50 px-3 py-2 af-task-row cursor-pointer hover:bg-maestro-surface transition-colors" data-task-title="Share dining details and halal note with the client"><span class="flex-1 truncate text-xs text-maestro-text-primary">Share dining details and halal note with the client</span><span class="inline-flex items-center font-medium rounded-full gap-1 bg-maestro-surface text-maestro-text-secondary px-1.5 py-0.5 text-[10px]">Open</span></li>
            <li class="flex items-center gap-2 rounded-lg border border-maestro-border/60 bg-maestro-surface/50 px-3 py-2 af-task-row cursor-pointer hover:bg-maestro-surface transition-colors" data-task-title="Verify halal suitability and no-pork compliance"><span class="flex-1 truncate text-xs text-maestro-text-primary">Verify halal suitability and no-pork compliance</span><span class="inline-flex items-center font-medium rounded-full gap-1 bg-maestro-surface text-maestro-text-secondary px-1.5 py-0.5 text-[10px]">Open</span></li>
            <li class="flex items-center gap-2 rounded-lg border border-maestro-border/60 bg-maestro-surface/50 px-3 py-2 af-task-row cursor-pointer hover:bg-maestro-surface transition-colors" data-task-title="Confirm reservation for Turkuaz on 2026-06-06"><span class="flex-1 truncate text-xs text-maestro-text-primary">Confirm reservation for Turkuaz on 2026-06-06</span><span class="inline-flex items-center font-medium rounded-full gap-1 bg-maestro-surface text-maestro-text-secondary px-1.5 py-0.5 text-[10px]">Open</span></li>
          </ul>
        </section>
      </div>
    </aside>`;
  }
  function aiOptionsHTML(prompt) {
    const opt = (name, cuisine, price, rec) => `
      <div class="af-ai-optcard">
        <div class="af-ai-optcard-h">
          <input type="checkbox" class="af-ai-opt-cb" ${rec ? 'checked' : ''}>
          <div class="af-ai-opt-name">${name}${rec ? ` <span class="af-ai-rec-badge">Recommended</span>` : ''}</div>
        </div>
        <div class="af-ai-opt-meta">${cuisine} · ${price}</div>
      </div>`;
    return `
      <div class="af-ai-userbubble">${prompt}</div>
      <div class="af-ai-aibubble"><span class="af-ai-dot">${S(IC.sparkles)}</span><span>Here are 3 halal-friendly Jakarta dining options that don't serve pork:</span></div>
      <div class="af-ai-optcards">
        ${opt('Turkuaz', 'Turkish', '$60-90/person', true)}
        ${opt('Al Nafoura Lebanese Restaurant', 'Lebanese', '$55-85/person', false)}
        ${opt('Plataran Menteng', 'Indonesian', '$45-75/person', false)}
      </div>
      <button class="af-btn af-btn-primary af-ai-add-sel" id="af-ai-add-sel">Add selected (2)</button>
      <div class="af-ai-summary">Added 3 halal-friendly Jakarta dining options to the collection.</div>
      <div class="af-ai-findings">
        <button class="af-finding-chip" data-finding="factless">${S(IC.shield, 'width="12" height="12"')} 1 coverage check</button>
        <button class="af-finding-chip" data-finding="factlinked">${S(IC.shield, 'width="12" height="12"')} Client exclusion rule</button>
      </div>`;
  }
  function renderAI() {
    st.step = 'ai';
    sheet.classList.remove('af-wide', 'af-xwide');
    sheet.classList.add('af-xxwide');
    bodyEl.classList.add('af-flat');
    headEl.innerHTML = `
      <button class="af-back" data-back style="margin-right:4px">${S(IC.chevL)}</button>
      <div class="af-ai-logo">${S(IC.sparkles)}</div>
      <span class="af-ai-name">Maestro AI</span>
      <span class="af-ctx-label">CONTEXT</span>
      <span class="af-chip">${st.collection || 'Trip'} <span class="af-chip-x" data-ctx-x>${S(IC.x, 'width="11" height="11"')}</span></span>
      <span class="af-chip af-chip-add" data-ctx-add>${S(IC.plus, 'width="11" height="11"')} Add</span>
      <button class="af-x" data-close style="margin-left:auto">${S(IC.x)}</button>`;
    headEl.querySelector('[data-back]').addEventListener('click', renderChoice);
    headEl.querySelector('[data-close]').addEventListener('click', close);
    headEl.querySelector('[data-ctx-add]').addEventListener('click', () => toast('Context picker: search collections, hotels, trips, people'));
    bodyEl.innerHTML = `
      <div class="af-ai-chat">
        <div class="af-ai-msgs" id="af-ai-msgs">${aiEmptyHTML()}</div>
        <div class="af-ai-inputbar">
          <button class="af-ai-plus">${S(IC.plus)}</button>
          <input class="af-ai-input" id="af-ai-input" placeholder="Ask Maestro AI anything about ${st.collection || 'this trip'}">
          <button class="af-ai-send" id="af-ai-send">${S(IC.arrowUp)}</button>
        </div>
      </div>
      ${aiSidebarHTML()}`;
    footEl.innerHTML = '';

    const msgs = bodyEl.querySelector('#af-ai-msgs');
    const input = bodyEl.querySelector('#af-ai-input');
    const go = (prompt) => {
      if (!prompt) return;
      msgs.innerHTML = aiOptionsHTML(prompt);
      msgs.scrollTop = msgs.scrollHeight;

      // Wire finding chips to open popovers
      msgs.querySelectorAll('[data-finding]').forEach((chip) => {
        chip.addEventListener('click', () => {
          const type = chip.dataset.finding;
          openFindingPopover(type, chip);
        });
      });
    };
    bodyEl.querySelectorAll('.af-ai-suggest').forEach((s) => s.addEventListener('click', () => go(s.dataset.prompt)));
    bodyEl.querySelector('#af-ai-send').addEventListener('click', () => go(input.value.trim() || 'i want to add some halal options as well. places that dont serve pork'));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(input.value.trim() || 'i want to add some halal options as well. places that dont serve pork'); });

    // Wire task cards and task rows to open the drawer
    bodyEl.querySelectorAll('.af-task-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        // Don't open drawer if clicking assignee chip or action buttons
        if (e.target.closest('.af-assignee-chip') || e.target.closest('.af-tc-acts')) return;
        openTaskDrawer(card.dataset.taskTitle || 'Task', card.dataset.taskDesc, card.dataset.taskPriority, card.dataset.taskSignals, card.dataset.taskAssignee);
      });
      const assigneeChipEl = card.querySelector('.af-assignee-chip');
      if (assigneeChipEl) {
        assigneeChipEl.addEventListener('click', (e) => {
          e.stopPropagation();
          showAssigneeMenu(assigneeChipEl, card.dataset.taskAssignee || 'unassigned', (newId) => {
            card.dataset.taskAssignee = newId;
            const m = MEMBERS.find((x) => x.id === newId) || UNASSIGNED;
            if (m.id === 'unassigned') {
              assigneeChipEl.innerHTML = `${memberAvatar(m, 16)}<span>Assign</span>${S(IC.chevD, 'width="11" height="11"')}`;
              assigneeChipEl.classList.add('af-unassigned');
            } else {
              assigneeChipEl.innerHTML = `${memberAvatar(m, 16)}<span>${m.name}</span>${S(IC.chevD, 'width="11" height="11"')}`;
              assigneeChipEl.classList.remove('af-unassigned');
            }
          });
        });
      }
      const ap = card.querySelector('.af-tc-approve');
      const di = card.querySelector('.af-tc-dismiss');
      if (ap) ap.addEventListener('click', (e) => { e.stopPropagation(); toast('Task approved'); card.style.display = 'none'; });
      if (di) di.addEventListener('click', (e) => { e.stopPropagation(); toast('Task dismissed'); card.style.display = 'none'; });
    });
    bodyEl.querySelectorAll('.af-task-row').forEach((row) => {
      row.addEventListener('click', () => {
        const title = row.dataset.taskTitle || 'Task';
        openTaskDrawer(title);
      });
    });
  }

  /* ---- Helper finding popover + memory flow ---- */
  function openFindingPopover(type, anchor) {
    const existing = document.getElementById('af-finding-popover');
    if (existing) existing.remove();

    const popover = document.createElement('div');
    popover.id = 'af-finding-popover';
    popover.className = 'af-finding-popover';

    if (type === 'factless') {
      popover.innerHTML = `
        <div class="af-finding-hd">${S(IC.shield, 'width="14" height="14"')} Coverage Check</div>
        <div class="af-finding-body">It addresses the halal/no-pork request but adds an unasked romantic anniversary framing and doesn't verify the venues truly don't serve pork.</div>
        <div class="af-finding-q">Was this flag helpful?</div>
        <div class="af-finding-acts">
          <button class="af-btn af-btn-ghost af-btn-sm" data-dismiss>Dismiss</button>
          <button class="af-btn af-btn-outline af-btn-sm" data-keep>Keep</button>
        </div>`;
    } else {
      popover.innerHTML = `
        <div class="af-finding-hd">${S(IC.shield, 'width="14" height="14"')} Client Exclusion Rule</div>
        <div class="af-finding-body">Client rule: no <strong>Maybourne</strong> properties. One of the returned options conflicts with this preference.</div>
        <div class="af-finding-q">Was this flag helpful?</div>
        <div class="af-finding-acts">
          <button class="af-btn af-btn-ghost af-btn-sm" data-dismiss-linked>Dismiss</button>
          <button class="af-btn af-btn-outline af-btn-sm" data-keep>Keep</button>
        </div>`;
    }

    document.body.appendChild(popover);

    // Position near the anchor
    const rect = anchor.getBoundingClientRect();
    popover.style.top = `${rect.bottom + 8}px`;
    popover.style.left = `${Math.max(16, rect.left - 100)}px`;

    requestAnimationFrame(() => popover.classList.add('af-open'));

    // Wire actions
    popover.querySelector('[data-keep]')?.addEventListener('click', () => {
      popover.remove();
      toast('Flag kept for review');
    });

    popover.querySelector('[data-dismiss]')?.addEventListener('click', () => {
      popover.remove();
      toast('Thanks, noted');
    });

    popover.querySelector('[data-dismiss-linked]')?.addEventListener('click', () => {
      popover.remove();
      openMemoryModal();
    });

    // Click outside to close
    const closeOut = (e) => {
      if (!popover.contains(e.target) && !anchor.contains(e.target)) {
        popover.remove();
        document.removeEventListener('click', closeOut);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOut), 50);
  }

  function openMemoryModal() {
    const existing = document.getElementById('af-memory-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'af-memory-modal';
    modal.className = 'af-memory-modal';
    modal.innerHTML = `
      <div class="af-memory-card">
        <div class="af-memory-hd">
          <div class="af-memory-title">Update this rule?</div>
          <button class="af-memory-x">${S(IC.x, 'width="14" height="14"')}</button>
        </div>
        <div class="af-memory-body">
          <div class="af-memory-rule">Client preference: no <strong>Maybourne</strong> properties</div>
          <div class="af-memory-q">What should we do with this rule going forward?</div>
          <div class="af-memory-opts">
            <button class="af-memory-opt" data-action="remove">
              <div class="af-memory-opt-tt">Stop applying it</div>
              <div class="af-memory-opt-ds">Remove this rule entirely. It won't be checked on future recommendations.</div>
            </button>
            <button class="af-memory-opt" data-action="stale">
              <div class="af-memory-opt-tt">Pause for review</div>
              <div class="af-memory-opt-ds">Mark this rule as stale. It stays on file but won't be enforced until reviewed.</div>
            </button>
            <button class="af-memory-opt" data-action="keep">
              <div class="af-memory-opt-tt">Just this once</div>
              <div class="af-memory-opt-ds">Keep the rule active, but allow this exception. The rule will apply to future searches.</div>
            </button>
          </div>
        </div>
        <div class="af-memory-foot">
          <button class="af-btn af-btn-ghost" data-cancel>Cancel</button>
          <button class="af-btn af-btn-primary" data-confirm disabled>Confirm selection</button>
        </div>
      </div>`;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('af-open'));

    const confirmBtn = modal.querySelector('[data-confirm]');
    let selected = null;

    modal.querySelectorAll('.af-memory-opt').forEach((opt) => {
      opt.addEventListener('click', () => {
        modal.querySelectorAll('.af-memory-opt').forEach((o) => o.classList.remove('af-selected'));
        opt.classList.add('af-selected');
        selected = opt.dataset.action;
        confirmBtn.disabled = false;
      });
    });

    modal.querySelector('[data-cancel]').addEventListener('click', () => modal.remove());
    modal.querySelector('.af-memory-x').addEventListener('click', () => modal.remove());
    confirmBtn.addEventListener('click', () => {
      modal.remove();
      const label = { remove: 'Rule removed', stale: 'Rule paused for review', keep: 'Exception noted, rule stays active' }[selected];
      toast(label);
    });
  }

  /* ---- Task detail drawer ---- */
  function openTaskDrawer(title, desc, priority, signals, assigneeId) {
    desc = desc || 'No additional detail provided.';
    priority = priority || 'High';
    signals = signals ? parseInt(signals, 10) : 0;
    assigneeId = assigneeId || 'unassigned';
    const existing = document.getElementById('af-task-drawer');
    if (existing) existing.remove();

    const drawer = document.createElement('div');
    drawer.id = 'af-task-drawer';
    drawer.className = 'af-task-drawer';
    const m = MEMBERS.find((x) => x.id === assigneeId) || UNASSIGNED;
    drawer.innerHTML = `
      <div class="af-drawer-content">
        <div class="flex items-center justify-between gap-3 px-5 py-3 border-b border-maestro-border">
        <div class="flex items-center gap-2 min-w-0">
          <span class="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-maestro-warning-light text-maestro-warning border border-maestro-warning/30">Assist</span>
          <span class="inline-flex items-center gap-1.5 rounded-full border border-maestro-border/60 bg-maestro-surface px-2 py-0.5 text-[11px] text-maestro-text-secondary">
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock text-maestro-text-tertiary"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v6l4 2"></path></svg>
            Scheduled query
          </span>
          <span class="text-[12px] text-maestro-text-tertiary truncate">trip prep · day-of-departure</span>
        </div>
        <button type="button" class="af-drawer-close shrink-0 rounded p-1 text-maestro-text-tertiary hover:text-maestro-text-primary hover:bg-maestro-surface">
          ${S(IC.x, 'width="16" height="16"')}
        </button>
      </div>
      <div class="flex-1 overflow-y-auto px-5 pt-2 pb-5 space-y-4">
        <div class="space-y-2">
          <div class="flex items-start gap-2">
            <h2 class="text-lg font-semibold text-maestro-text-primary leading-tight flex-1 min-w-0">${title}</h2>
            ${signals ? `<span class="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-maestro-warning/10 text-maestro-warning">${signals} signals merged</span>` : ''}
          </div>
          <div class="flex items-center gap-2 text-[12px] flex-wrap">
            <span class="text-maestro-text-tertiary">·</span>
            <span class="shrink-0"><span class="text-maestro-text-tertiary">Priority: </span><span class="text-maestro-text-primary">${priority}</span></span>
            <span class="text-maestro-text-tertiary">·</span>
            <span class="text-maestro-text-tertiary">Status: </span><span class="text-maestro-text-primary">Open</span>
            <span class="text-maestro-text-tertiary">·</span>
            <span class="shrink-0 inline-flex items-center gap-1.5"><span class="text-maestro-text-tertiary">Assignee: </span>${assigneeChip(assigneeId)}</span>
          </div>
        </div>
        <div class="rounded-lg border border-maestro-warning/50 bg-maestro-warning/[0.04] p-4 space-y-3">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lightbulb text-maestro-warning"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"></path><path d="M9 18h6"></path><path d="M10 22h4"></path></svg>
            <span class="text-[11px] font-semibold text-maestro-text-primary uppercase tracking-wide">Review</span>
            <span class="text-[10px] text-maestro-text-tertiary uppercase tracking-wide">AI flagged this — accept or drop</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="af-drawer-approve inline-flex items-center gap-1 bg-maestro-text-primary text-maestro-on-primary hover:opacity-90 px-2.5 py-1 rounded-md text-xs font-medium">
              ${S(IC.check, 'width="12" height="12"')}Approve
            </button>
            <button type="button" class="af-drawer-dismiss inline-flex items-center gap-1 text-maestro-danger hover:bg-maestro-surface px-2.5 py-1 rounded-md text-xs font-medium">Dismiss</button>
          </div>
          <p class="text-[11px] text-maestro-text-tertiary leading-relaxed">Approving keeps the task in the active list. Dismissing removes it from default queues but the audit trail is preserved.</p>
        </div>
        <div class="rounded-lg border border-maestro-border/60 bg-maestro-surface/30 p-4 space-y-2">
          <div class="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map text-maestro-accent"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"></path><path d="M15 5.764v15"></path><path d="M9 3.236v15"></path></svg>
            <span class="text-[10px] font-semibold text-maestro-text-tertiary uppercase tracking-wide">Trip-prep step</span>
          </div>
          <p class="text-[13px] text-maestro-text-primary font-mono">day-of-departure</p>
        </div>
        <div class="rounded-lg border border-maestro-border/60 bg-maestro-surface/30 p-4 space-y-3">
          <div class="flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info text-maestro-accent"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
            <span class="text-[10px] font-semibold text-maestro-text-tertiary uppercase tracking-wide">Rationale</span>
          </div>
          <p class="text-[13px] text-maestro-text-primary leading-relaxed">${desc}</p>
        </div>
        <div>
          <p class="text-xs font-semibold text-maestro-text-primary mb-2">Notes</p>
          <textarea class="w-full border rounded-lg px-3 py-2.5 bg-maestro-card border-maestro-border focus:border-maestro-accent focus:outline-none text-[13px] resize-none min-h-[72px]" placeholder="Add notes..." rows="3"></textarea>
        </div>
      </div>
    </div>`;

    document.body.appendChild(drawer);
    requestAnimationFrame(() => drawer.classList.add('af-open'));

    const drawerAssigneeChip = drawer.querySelector('.af-assignee-chip');
    if (drawerAssigneeChip) {
      drawerAssigneeChip.addEventListener('click', (e) => {
        e.stopPropagation();
        showAssigneeMenu(drawerAssigneeChip, assigneeId, (newId) => {
          assigneeId = newId;
          const newM = MEMBERS.find((x) => x.id === newId) || UNASSIGNED;
          if (newM.id === 'unassigned') {
            drawerAssigneeChip.innerHTML = `${memberAvatar(newM, 16)}<span>Assign</span>${S(IC.chevD, 'width="11" height="11"')}`;
            drawerAssigneeChip.classList.add('af-unassigned');
          } else {
            drawerAssigneeChip.innerHTML = `${memberAvatar(newM, 16)}<span>${newM.name}</span>${S(IC.chevD, 'width="11" height="11"')}`;
            drawerAssigneeChip.classList.remove('af-unassigned');
          }
        });
      });
    }

    drawer.querySelector('.af-drawer-close').addEventListener('click', () => {
      drawer.classList.remove('af-open');
      setTimeout(() => drawer.remove(), 200);
    });

    drawer.querySelector('.af-drawer-approve').addEventListener('click', () => {
      toast('Task approved');
      drawer.classList.remove('af-open');
      setTimeout(() => drawer.remove(), 200);
    });

    drawer.querySelector('.af-drawer-dismiss').addEventListener('click', () => {
      toast('Task dismissed');
      drawer.classList.remove('af-open');
      setTimeout(() => drawer.remove(), 200);
    });
  }

  function commitAdd(title) {
    if (typeof st.onAdded === 'function') st.onAdded();
    toast(`Added to ${st.collection || 'itinerary'}`);
  }

  function toast(msg) {
    toastEl.innerHTML = `${S(IC.check)}<span>${msg}</span>`;
    toastEl.classList.add('af-open');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('af-open'), 2400);
  }

  /* ---- Enhance the snapshot ---- */
  function enhance() {
    const btns = [...document.querySelectorAll('button')];
    const txt = (b) => (b.textContent || '').trim().replace(/\s+/g, ' ');
    const addOptionBtns = btns.filter((b) => txt(b) === 'Add option' || txt(b).includes('Add option'));
    const cards = [];

    addOptionBtns.forEach((ao) => {
      const actionRow = ao.parentElement;                       // holds Maestro AI + Add option
      const header = actionRow.parentElement;                   // justify-between row
      const titleEl = header.querySelector('span');             // collection title
      const countEl = titleEl && titleEl.nextElementSibling;    // "N options"
      const name = titleEl ? txt(titleEl) : 'collection';
      const type = inferType(name);

      // remember the collection card (for placing the new-collection button)
      let card = header;
      for (let i = 0; i < 6 && card; i++) { if (/rounded-xl/.test(card.className) && /warm-surface|maestro-card/.test(card.className)) break; card = card.parentElement; }
      if (card && !cards.includes(card)) cards.push(card);

      // collection dates = its day's date; components inherit, edited only at collection level
      const daySec = header.closest('section');
      const dDate = daySec ? ((daySec.textContent || '').match(/([A-Z][a-z]+ \d{1,2}, \d{4})/) || [])[1] : '';
      const startYMD = toYMD(dDate) || '';
      let dateEl = null;
      if (startYMD && countEl) {
        dateEl = document.createElement('span');
        dateEl.className = 'af-coll-date';
        dateEl.dataset.start = startYMD; dateEl.dataset.end = startYMD;
        dateEl.innerHTML = `${S(IC.cal, 'width="11" height="11"')} ${rangeLabel(startYMD, startYMD)}`;
        countEl.insertAdjacentElement('afterend', dateEl);
      }

      const onAdded = () => {
        if (!countEl) return;
        const m = (countEl.textContent || '').match(/(\d+)/);
        const n = m ? parseInt(m[1], 10) + 1 : 1;
        countEl.textContent = `${n} options`;
      };

      // consolidate the two buttons into "Add to {name}" + an Edit Collection button
      const single = document.createElement('button');
      single.type = 'button';
      single.className = 'af-add-btn';
      single.title = `Add to ${name}`;
      single.innerHTML = `${S(IC.plus)}<span class="af-add-label">Add to ${name}</span>`;
      single.addEventListener('click', () => open({ mode: 'addOption', type, collection: name, dest: firstWord(name), start: dateEl ? dateEl.dataset.start : '', end: dateEl ? dateEl.dataset.end : '', onAdded }));
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'af-edit-coll';
      editBtn.title = `Edit ${name} (move dates)`;
      editBtn.innerHTML = S(IC.pencilSm, 'width="13" height="13"');
      editBtn.addEventListener('click', () => open({ mode: 'editCollection', type, collection: name, start: dateEl ? dateEl.dataset.start : '', end: dateEl ? dateEl.dataset.end : '', dateEl }));
      actionRow.replaceChildren(single, editBtn);
    });

    // Replace the hover "+" insert dividers with one clear button per day.
    // Sunthar, call ~22:22: a clear button (Juan's "Add Day 1" style) is
    // "more clear than hovering over to see a plus button", and it adds a collection.
    document.querySelectorAll('[aria-label="Add item here"]').forEach((b) => {
      const wrap = b.closest('[class*="group/insert"]') || b.parentElement;
      if (wrap) wrap.style.display = 'none';
    });

    const daySections = [...document.querySelectorAll('section')]
      .filter((s) => /^Day\s*0?\d/i.test((s.textContent || '').replace(/\s+/g, '')));
    daySections.forEach((sec) => {
      const t = sec.textContent || '';
      const n = (t.replace(/\s+/g, '').match(/Day0?(\d+)/i) || [])[1] || '';
      const dayDate = (t.match(/([A-Z][a-z]+ \d{1,2}, \d{4})/) || [])[1] || '';
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'af-add-collection';
      add.innerHTML = `${S(IC.plus)} Add collection to Day ${n}`;
      add.addEventListener('click', () => open({ mode: 'newCollection', day: `Day ${n}`, dayDate }));
      sec.appendChild(add);
    });

    // trip header date range = min/max of collection dates; recompute now and on edit
    tripDateEl = [...document.querySelectorAll('span')].find((s) => /^[A-Z][a-z]+ \d{1,2}, \d{4}\s*[—–-]\s*[A-Z][a-z]+ \d{1,2}, \d{4}$/.test((s.textContent || '').trim().replace(/\s+/g, ' ')));
    computeTrip();
  }

  function init() { build(); enhance(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
