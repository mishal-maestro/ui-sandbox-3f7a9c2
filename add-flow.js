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
  };

  const TYPES = ['hotels', 'flights', 'experiences', 'dining', 'transfers', 'notes'];
  const TLABEL = { hotels: 'Hotels', flights: 'Flights', experiences: 'Experiences', dining: 'Dining', transfers: 'Transfers', notes: 'Notes' };

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
    Object.assign(st, { mode: opts.mode, type: opts.type || null, name: '', collection: opts.collection || '', dest: opts.dest || '', day: opts.day || '', onAdded: opts.onAdded || null });
    if (opts.mode === 'newCollection') renderTypeStep();
    else renderChoice();
    requestAnimationFrame(() => { scrim.classList.add('af-open'); sheet.classList.add('af-open'); });
  }
  function close() { scrim.classList.remove('af-open'); sheet.classList.remove('af-open'); }

  /* ---- Step 1: new collection (name + type) ---- */
  function renderTypeStep() {
    st.step = 'type';
    sheet.classList.remove('af-wide');
    setHead(st.day ? `Add collection to ${st.day}` : 'Add collection to itinerary', 'Name it and pick a type', null);
    bodyEl.innerHTML = `
      <div class="af-section">
        <div class="af-field">
          <label class="af-label">Collection name</label>
          <input class="af-input" id="af-cname" placeholder="e.g. Bangkok Dining">
        </div>
      </div>
      <div class="af-section">
        <div class="af-steplabel">Collection type</div>
        <div class="af-types">
          ${TYPES.map((t) => `<button class="af-type" data-type="${t}">${S(IC[t])}<span>${TLABEL[t]}</span></button>`).join('')}
        </div>
      </div>`;
    footEl.innerHTML = `<button class="af-btn af-btn-ghost" data-cancel>Cancel</button><div class="af-spacer"></div><button class="af-btn af-btn-primary" data-create disabled>Create collection</button>`;

    const nameInput = bodyEl.querySelector('#af-cname');
    const createBtn = footEl.querySelector('[data-create]');
    const sync = () => { createBtn.disabled = !(st.name.trim() && st.type); };
    nameInput.addEventListener('input', () => { st.name = nameInput.value; sync(); });
    bodyEl.querySelectorAll('.af-type').forEach((tile) => {
      tile.addEventListener('click', () => {
        bodyEl.querySelectorAll('.af-type').forEach((x) => x.classList.remove('af-selected'));
        tile.classList.add('af-selected'); st.type = tile.dataset.type; sync();
      });
    });
    footEl.querySelector('[data-cancel]').addEventListener('click', close);
    createBtn.addEventListener('click', () => { st.collection = st.name.trim(); renderChoice(); });
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
            <div class="flex-1 min-w-0"><div class="grid grid-cols-2 gap-1">
              <div><label class="text-[9px] text-maestro-text-tertiary">Check-in</label><input type="date" class="w-full border rounded bg-maestro-card border-maestro-border focus:border-maestro-accent focus:outline-none text-[11px] px-2 py-1"></div>
              <div><label class="text-[9px] text-maestro-text-tertiary">Check-out</label><input type="date" class="w-full border rounded bg-maestro-card border-maestro-border focus:border-maestro-accent focus:outline-none text-[11px] px-2 py-1"></div>
            </div></div>
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
  function aiTasksHTML() {
    const task = (tt, ds, who, init) => `
      <div class="af-task">
        <div class="af-task-top"><span class="af-task-cb"></span><div><div class="af-task-tt">${tt}</div>${ds ? `<div class="af-task-ds">${ds}</div>` : ''}</div></div>
        <div class="af-task-meta">
          <span class="af-task-assignee"><span class="af-task-av">${init}</span>${who} ${S(IC.chevD, 'width="10" height="10"')}</span>
          <span class="af-task-date">${S(IC.cal, 'width="11" height="11"')} No date</span>
        </div>
      </div>`;
    return `<aside class="af-ai-tasks">
      <p class="af-ai-tasks-h">Maestro AI Tasks</p>
      <div class="af-ai-status"><span class="af-tick">${S(IC.check, 'width="14" height="14"')}</span> Analyzing destination insights <span class="af-done">Completed</span></div>
      <div class="af-ai-status">${S(IC.sparkles, 'width="14" height="14"')} Planning experiences &amp; dining</div>
      <div class="af-ai-progress"><i></i></div>
      <p class="af-ai-tasks-h" style="margin-top:14px">Tasks</p>
      ${task("Get John's final approval on dinner choice", '', 'Sunthar', 'SU')}
      ${task('Confirm anniversary surprise setup', 'Call Eden-Roc to discuss private beach dinner setup for anniversary surprise', 'John Doe', 'JD')}
    </aside>`;
  }
  function aiInterviewHTML(prompt) {
    const q = (n, tt, sub, opts, sel) => `
      <div class="af-q">
        <div class="af-q-tt">${n} · ${tt}</div>
        <div class="af-q-sub">${sub}</div>
        <div class="af-q-opts">${opts.map((o, i) => `<button class="af-q-opt ${i === sel ? 'af-on' : ''}" data-opt>${o}</button>`).join('')}</div>
      </div>`;
    return `
      <div class="af-ai-userbubble">${prompt}</div>
      <div class="af-ai-aibubble"><span class="af-ai-dot">${S(IC.sparkles)}</span><span>Got it. Before I search, can you confirm a few things?</span></div>
      ${q('1', 'Budget Cap', 'Max per night for the Harrisons?', ['$1.2k', '$1.6k', '$2k', '$2.5k+'], 1)}
      ${q('2', 'Star Rating', 'Stick with 5★ palace tier?', ['Same vibe', '5★ only', 'Boutique'], 0)}
      ${q('3', 'Location', 'Same arrondissement preference?', ['Same', 'Anywhere', 'Suburb OK'], 0)}
      <div class="af-q-foot"><span>Review and confirm your selections</span><button class="af-btn af-btn-primary" id="af-q-send">Send</button></div>`;
  }
  function renderAI() {
    st.step = 'ai';
    sheet.classList.remove('af-wide');
    sheet.classList.add('af-xwide');
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
      ${aiTasksHTML()}`;
    footEl.innerHTML = '';

    const msgs = bodyEl.querySelector('#af-ai-msgs');
    const input = bodyEl.querySelector('#af-ai-input');
    const go = (prompt) => {
      if (!prompt) return;
      msgs.innerHTML = aiInterviewHTML(prompt);
      msgs.scrollTop = msgs.scrollHeight;
      msgs.querySelectorAll('.af-q').forEach((qq) => {
        qq.querySelectorAll('[data-opt]').forEach((o) => o.addEventListener('click', () => {
          qq.querySelectorAll('[data-opt]').forEach((x) => x.classList.remove('af-on'));
          o.classList.add('af-on');
        }));
      });
      msgs.querySelector('#af-q-send')?.addEventListener('click', () => toast('Searching for options...'));
    };
    bodyEl.querySelectorAll('.af-ai-suggest').forEach((s) => s.addEventListener('click', () => go(s.dataset.prompt)));
    bodyEl.querySelector('#af-ai-send').addEventListener('click', () => go(input.value.trim() || 'Add a hotel similar to Le Bristol for the Harrisons'));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(input.value.trim() || 'Add a hotel similar to Le Bristol for the Harrisons'); });
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

      const onAdded = () => {
        if (!countEl) return;
        const m = (countEl.textContent || '').match(/(\d+)/);
        const n = m ? parseInt(m[1], 10) + 1 : 1;
        countEl.textContent = `${n} options`;
      };

      // replace the two buttons with one consolidated "Add to {name}"
      const single = document.createElement('button');
      single.type = 'button';
      single.className = 'af-add-btn';
      single.title = `Add to ${name}`;
      single.innerHTML = `${S(IC.plus)}<span class="af-add-label">Add to ${name}</span>`;
      single.addEventListener('click', () => open({ mode: 'addOption', type, collection: name, dest: firstWord(name), onAdded }));
      actionRow.replaceChildren(single);
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
      const m = (sec.textContent || '').replace(/\s+/g, '').match(/Day0?(\d+)/i);
      const n = m ? m[1] : '';
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'af-add-collection';
      add.innerHTML = `${S(IC.plus)} Add collection to Day ${n}`;
      add.addEventListener('click', () => open({ mode: 'newCollection', day: `Day ${n}` }));
      sec.appendChild(add);
    });
  }

  function init() { build(); enhance(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
