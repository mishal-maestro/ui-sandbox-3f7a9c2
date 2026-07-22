/* ============================================================
   DMC bookings prototype  (Dustin handoff, Jul 8 2026 - DSN-32 / CON-1688)
   Injected on top of the Conductor trip-view snapshot (dmc-trip.html,
   Stockholm & Croatia, July 2026).

   Demonstrates:
   1. DMC group visualization - components linked under a DMC across days,
      teal rail + vendor chip, group header card at the start of the span.
   2. Bundle pricing - one package price on the group; "Included in package"
      on components; Member preview toggle shows what the client sees.
   3. Tie manual components - New/Edit DMC side sheet with a link-components
      checklist.
   4. PDF upload + parse (stubbed) - staged progress, review list of canned
      components, accepted rows land in the itinerary under the DMC.

   All DMC data is fictional demo data.
   ============================================================ */
(function () {
  'use strict';

  /* ---- icons ---- */
  const S = (p, o = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${o}>${p}</svg>`;
  const IC = {
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    eye: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v5h5"/>',
    sparkles: '<path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/>',
    car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    utensils: '<path d="M3 2v7c0 1.1.9 2 2 2a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    pencil: '<path d="M21.2 6.8a2 2 0 0 0-3-3L4 18l-1 4 4-1Z"/><path d="m15 5 3 3"/>',
    cal: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  };
  const TYPE_IC = { transfer: IC.car, dining: IC.utensils, experience: IC.ticket, guide: IC.user };

  /* ---- fictional demo data ---- */
  const DMC_DEFAULT = {
    vendor: 'Adriatic Compass',
    destination: 'Split & Dubrovnik, Croatia',
    start: 'Jul 30, 2026',
    end: 'Aug 9, 2026',
    currency: 'EUR',
    price: 14800,
    confirmation: 'AC-2026-0847',
    notes: 'Full Croatia ground program via Ivana at Adriatic Compass. Package covers guides, drivers, private boat charter and all entry fees.',
  };
  const DEFAULT_LINKED = [
    'Transfer from Split Airport to Dubrovnik',
    'Dubrovnik Tour',
    'Boat Transfer from Dubrovnik to Split',
    'Split Island Hopping',
  ];

  const PARSED_ITEMS = [
    { type: 'transfer',   title: 'Private transfer · Split Airport → hotel', date: 'July 30, 2026',  price: '€240', included: false },
    { type: 'dining',     title: 'Konoba Dubrava · private dinner in the hills',  date: 'July 31, 2026',  price: null,        included: true },
    { type: 'guide',      title: 'Split Old Town · private guide (half day)',     date: 'August 1, 2026', price: null,        included: true },
    { type: 'transfer',   title: 'Return transfer · hotel → Split Airport',  date: 'August 9, 2026', price: '€260', included: false },
  ];

  /* ---- state ---- */
  const state = {
    dmc: Object.assign({}, DMC_DEFAULT),
    linked: new Set(),          // collection ids
    parsedAdded: false,
    memberPreview: false,
  };

  /* ---- registry of itinerary collections ---- */
  let itinCol = null;           // the day-sections column
  let registry = [];            // {id, title, dateText, dayNum, section, cardEl, titleRow}

  function fmtMoney() {
    const sym = { EUR: '€', USD: '$', GBP: '£' }[state.dmc.currency] || '';
    return sym + Number(state.dmc.price).toLocaleString('en-US');
  }

  function scan() {
    itinCol = [...document.querySelectorAll('div')].find(
      (d) => [...d.children].filter((k) => k.tagName === 'SECTION').length >= 5
    );
    if (!itinCol) return;
    registry = [];
    [...itinCol.children].forEach((sec, si) => {
      if (sec.tagName !== 'SECTION') return;
      const dayNum = sec.querySelector('span[class*="font-serif"]')?.textContent?.trim() || '';
      const dateText =
        [...sec.querySelectorAll('span')].map((s) => s.textContent.trim()).find((t) => /2026/.test(t)) || '';
      [...sec.querySelectorAll('button[title="Click to rename"]')].forEach((titleBtn) => {
        const card = titleBtn.closest('div[class*="sm:rounded-xl"]');
        const title = titleBtn.childNodes[0].textContent.trim();
        if (!card || !title) return;
        const titleRow = titleBtn.closest('div');
        registry.push({ id: si + '|' + title, title, dateText, dayNum, section: sec, cardEl: card, titleRow });
      });
    });
  }

  function sectionByDate(dateText) {
    if (!itinCol) return null;
    return [...itinCol.children].find(
      (sec) =>
        sec.tagName === 'SECTION' &&
        [...sec.querySelectorAll('span')].some((s) => s.textContent.trim() === dateText)
    );
  }

  /* ---- decorations ---- */
  function chipEl() {
    const chip = document.createElement('span');
    chip.className = 'dmc-chip';
    chip.innerHTML =
      S(IC.compass) +
      `<span class="dmc-chip-internal">${state.dmc.vendor} · DMC</span>` +
      `<span class="dmc-chip-member">Arranged by ${state.dmc.vendor}</span>`;
    return chip;
  }

  function stripEl() {
    const el = document.createElement('div');
    el.className = 'dmc-included-strip';
    el.innerHTML = S(IC.check) + `<span>Included in the ${state.dmc.vendor} package · no separate charge</span>`;
    return el;
  }

  function decorate() {
    // clear previous decorations
    document.querySelectorAll('.dmc-chip, .dmc-included-strip, .dmc-group').forEach((e) => e.remove());
    document.querySelectorAll('.dmc-linked').forEach((e) => e.classList.remove('dmc-linked'));

    if (!state.dmc.saved) { updateFabs(); return; }

    let count = 0;
    registry.forEach((r) => {
      if (!state.linked.has(r.id)) return;
      count++;
      r.cardEl.classList.add('dmc-linked');
      r.titleRow && r.titleRow.appendChild(chipEl());
      r.cardEl.appendChild(stripEl());
    });
    document.querySelectorAll('.dmc-parsed-card').forEach((card) => {
      count++;
      card.querySelector('.dmc-parsed-sub')?.appendChild
        ? null : null;
      if (!card.querySelector('.dmc-included-strip')) card.appendChild(stripEl());
    });

    // group header card before the first day of the span
    const anchor = sectionByDate('July 30, 2026');
    if (anchor) {
      const g = document.createElement('div');
      g.className = 'dmc-group';
      g.innerHTML = `
        <div class="dmc-group-top">
          <div class="dmc-group-id">
            <div class="dmc-group-badge">${S(IC.compass)}</div>
            <div class="dmc-group-titles">
              <div class="dmc-group-kicker">DMC package</div>
              <div class="dmc-group-name">${state.dmc.vendor}</div>
              <div class="dmc-group-sub">${state.dmc.destination} · ${state.dmc.start} – ${state.dmc.end}</div>
            </div>
          </div>
          <div class="dmc-group-actions dmc-internal-only">
            <button class="dmc-btn" data-dmc="upload">${S(IC.upload)}Upload DMC PDF</button>
            <button class="dmc-btn" data-dmc="edit">${S(IC.link)}Link components</button>
          </div>
        </div>
        <div class="dmc-group-meta dmc-internal-only">
          <span>Package price <b class="dmc-price-big">${fmtMoney()}</b></span>
          <span class="dmc-meta-dot">•</span>
          <span><b>${count}</b> component${count === 1 ? '' : 's'} linked</span>
          <span class="dmc-meta-dot">•</span>
          <span>Confirmation <b>${state.dmc.confirmation}</b></span>
        </div>
        <div class="dmc-group-meta dmc-member-only dmc-group-member-row">
          <span>Your time in Croatia is fully arranged by <b>${state.dmc.vendor}</b> — guides, drivers and experiences below are part of one package.</span>
          <span class="dmc-meta-dot">•</span>
          <span>Package total <b class="dmc-price-big">${fmtMoney()}</b></span>
        </div>`;
      anchor.parentElement.insertBefore(g, anchor);
      g.querySelector('[data-dmc="upload"]')?.addEventListener('click', openPdfModal);
      g.querySelector('[data-dmc="edit"]')?.addEventListener('click', () => openSheet(true));
    }
    updateFabs();
  }

  /* ---- parsed component cards ---- */
  function insertParsedCards() {
    PARSED_ITEMS.filter((p) => p.keep !== false).forEach((p) => {
      const sec = sectionByDate(p.date);
      if (!sec) return;
      const card = document.createElement('div');
      card.className = 'dmc-parsed-card';
      card.innerHTML = `
        <div class="dmc-parsed-ic">${S(TYPE_IC[p.type] || IC.ticket)}</div>
        <div class="dmc-parsed-main">
          <div class="dmc-parsed-title">${p.title}</div>
          <div class="dmc-parsed-sub">
            <span class="dmc-pill">${S(IC.cal)}${p.date.replace(', 2026', '')}</span>
            ${p.included
              ? '<span class="dmc-pill dmc-incl">Included in package</span>'
              : `<span class="dmc-pill dmc-price">${p.price}</span>`}
            <span class="dmc-prov">${S(IC.sparkles)}Parsed from PDF</span>
          </div>
        </div>`;
      sec.appendChild(card);
    });
    state.parsedAdded = true;
  }

  /* ---- floating controls ---- */
  let fabNew, fabMp;
  function buildFabs() {
    const stack = document.createElement('div');
    stack.className = 'dmc-fab-stack';
    fabNew = document.createElement('button');
    fabNew.className = 'dmc-fab';
    fabNew.addEventListener('click', () => openSheet(state.dmc.saved));
    fabMp = document.createElement('button');
    fabMp.className = 'dmc-fab';
    fabMp.addEventListener('click', () => {
      state.memberPreview = !state.memberPreview;
      document.body.classList.toggle('dmc-mp', state.memberPreview);
      updateFabs();
    });
    stack.append(fabNew, fabMp);
    document.body.appendChild(stack);

    const banner = document.createElement('div');
    banner.className = 'dmc-mp-banner';
    banner.textContent = 'Member preview — what the client sees';
    document.body.appendChild(banner);
  }
  function updateFabs() {
    if (!fabNew) return;
    fabNew.innerHTML = state.dmc.saved ? S(IC.pencil) + 'Edit DMC booking' : S(IC.plus) + 'New DMC booking';
    fabMp.innerHTML = S(IC.eye) + (state.memberPreview ? 'Member preview: on' : 'Member preview: off');
    fabMp.classList.toggle('dmc-on', state.memberPreview);
    fabMp.style.display = state.dmc.saved ? '' : 'none';
  }

  /* ---- scrim + toast ---- */
  let scrim, toastEl, toastTimer;
  function buildChrome() {
    scrim = document.createElement('div');
    scrim.className = 'dmc-scrim';
    scrim.addEventListener('click', closeAll);
    document.body.appendChild(scrim);
    toastEl = document.createElement('div');
    toastEl.className = 'dmc-toast';
    document.body.appendChild(toastEl);
  }
  function toast(msg) {
    toastEl.innerHTML = S(IC.check) + `<span>${msg}</span>`;
    toastEl.classList.add('dmc-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('dmc-show'), 3200);
  }
  function closeAll() {
    scrim.classList.remove('dmc-open');
    document.querySelectorAll('.dmc-sheet').forEach((s) => s.classList.remove('dmc-open'));
  }

  /* ---- New / Edit DMC sheet ---- */
  let sheet;
  function buildSheet() {
    sheet = document.createElement('div');
    sheet.className = 'dmc-sheet';
    document.body.appendChild(sheet);
  }

  function openSheet(editMode) {
    renderSheetStep1(editMode);
    scrim.classList.add('dmc-open');
    sheet.classList.add('dmc-open');
  }

  function renderSheetStep1(editMode) {
    const d = state.dmc;
    sheet.innerHTML = `
      <div class="dmc-head">
        <div>
          <div class="dmc-head-title">${editMode ? 'Edit DMC booking' : 'New DMC booking'}</div>
          <div class="dmc-head-sub">A DMC plans part of the trip on the ground and usually quotes one package price.</div>
        </div>
        <button class="dmc-x" data-dmc="close">${S(IC.x)}</button>
      </div>
      <div class="dmc-steps"><div class="dmc-step-dot dmc-active"></div><div class="dmc-step-dot"></div></div>
      <div class="dmc-body">
        <div class="dmc-field"><label class="dmc-label">DMC / vendor</label>
          <input class="dmc-input" id="dmc-f-vendor" value="${d.vendor}"></div>
        <div class="dmc-field"><label class="dmc-label">Destination covered</label>
          <input class="dmc-input" id="dmc-f-dest" value="${d.destination}"></div>
        <div class="dmc-row2">
          <div class="dmc-field"><label class="dmc-label">Start</label>
            <input class="dmc-input" id="dmc-f-start" value="${d.start}"></div>
          <div class="dmc-field"><label class="dmc-label">End</label>
            <input class="dmc-input" id="dmc-f-end" value="${d.end}"></div>
        </div>
        <div class="dmc-row-price">
          <div class="dmc-field"><label class="dmc-label">Currency</label>
            <select class="dmc-select" id="dmc-f-cur">
              ${['EUR', 'USD', 'GBP'].map((c) => `<option ${c === d.currency ? 'selected' : ''}>${c}</option>`).join('')}
            </select></div>
          <div class="dmc-field"><label class="dmc-label">Package price (one price for the whole program)</label>
            <input class="dmc-input" id="dmc-f-price" type="number" value="${d.price}"></div>
        </div>
        <div class="dmc-field"><label class="dmc-label">Confirmation #</label>
          <input class="dmc-input" id="dmc-f-conf" value="${d.confirmation}"></div>
        <div class="dmc-field"><label class="dmc-label">Notes</label>
          <textarea class="dmc-textarea" id="dmc-f-notes">${d.notes}</textarea></div>
      </div>
      <div class="dmc-foot">
        <span class="dmc-foot-left">Step 1 of 2 · details</span>
        <button class="dmc-btn" data-dmc="close">Cancel</button>
        <button class="dmc-btn dmc-btn-primary" data-dmc="next">Next · link components</button>
      </div>`;
    sheet.querySelectorAll('[data-dmc="close"]').forEach((b) => b.addEventListener('click', closeAll));
    sheet.querySelector('[data-dmc="next"]').addEventListener('click', () => {
      state.dmc.vendor = sheet.querySelector('#dmc-f-vendor').value || d.vendor;
      state.dmc.destination = sheet.querySelector('#dmc-f-dest').value;
      state.dmc.start = sheet.querySelector('#dmc-f-start').value;
      state.dmc.end = sheet.querySelector('#dmc-f-end').value;
      state.dmc.currency = sheet.querySelector('#dmc-f-cur').value;
      state.dmc.price = sheet.querySelector('#dmc-f-price').value;
      state.dmc.confirmation = sheet.querySelector('#dmc-f-conf').value;
      state.dmc.notes = sheet.querySelector('#dmc-f-notes').value;
      renderSheetStep2();
    });
  }

  function renderSheetStep2() {
    const picked = new Set(state.dmc.saved ? state.linked : registry.filter((r) => DEFAULT_LINKED.includes(r.title)).map((r) => r.id));
    const rows = registry
      .map(
        (r) => `
        <div class="dmc-check-row ${picked.has(r.id) ? 'dmc-checked' : ''}" data-id="${r.id}">
          <span class="dmc-check-box">${S(IC.check)}</span>
          <div class="dmc-check-main">
            <div class="dmc-check-title">${r.title}</div>
            <div class="dmc-check-sub">Day ${r.dayNum} · ${r.dateText}</div>
          </div>
        </div>`
      )
      .join('');
    sheet.innerHTML = `
      <div class="dmc-head">
        <div>
          <div class="dmc-head-title">Link components to ${state.dmc.vendor}</div>
          <div class="dmc-head-sub">Pick the itinerary components this DMC operates. They stay on their days and get grouped under the package.</div>
        </div>
        <button class="dmc-x" data-dmc="close">${S(IC.x)}</button>
      </div>
      <div class="dmc-steps"><div class="dmc-step-dot dmc-active"></div><div class="dmc-step-dot dmc-active"></div></div>
      <div class="dmc-body">
        <div class="dmc-check-list">${rows}</div>
        <div class="dmc-check-note">You can also add brand-new components inside the package by uploading the DMC's PDF after saving.</div>
      </div>
      <div class="dmc-foot">
        <span class="dmc-foot-left">Step 2 of 2 · link components</span>
        <button class="dmc-btn" data-dmc="back">Back</button>
        <button class="dmc-btn dmc-btn-primary" data-dmc="save">Save DMC booking</button>
      </div>`;
    sheet.querySelectorAll('.dmc-check-row').forEach((row) =>
      row.addEventListener('click', () => {
        row.classList.toggle('dmc-checked');
      })
    );
    sheet.querySelector('[data-dmc="close"]').addEventListener('click', closeAll);
    sheet.querySelector('[data-dmc="back"]').addEventListener('click', () => renderSheetStep1(state.dmc.saved));
    sheet.querySelector('[data-dmc="save"]').addEventListener('click', () => {
      state.linked = new Set([...sheet.querySelectorAll('.dmc-check-row.dmc-checked')].map((r) => r.dataset.id));
      state.dmc.saved = true;
      closeAll();
      decorate();
      toast(`${state.dmc.vendor} saved · ${state.linked.size} component${state.linked.size === 1 ? '' : 's'} linked`);
    });
  }

  /* ---- PDF upload modal ---- */
  let pdfSheet;
  function buildPdfSheet() {
    pdfSheet = document.createElement('div');
    pdfSheet.className = 'dmc-sheet';
    document.body.appendChild(pdfSheet);
  }

  function openPdfModal() {
    renderPdfDrop();
    scrim.classList.add('dmc-open');
    pdfSheet.classList.add('dmc-open');
  }

  function pdfHead(sub) {
    return `
      <div class="dmc-head">
        <div>
          <div class="dmc-head-title">Upload DMC PDF</div>
          <div class="dmc-head-sub">${sub}</div>
        </div>
        <button class="dmc-x" data-dmc="close">${S(IC.x)}</button>
      </div>`;
  }

  function renderPdfDrop() {
    pdfSheet.innerHTML = `
      ${pdfHead(`${state.dmc.vendor} sends the program as a PDF — Maestro parses it into itinerary components.`)}
      <div class="dmc-body">
        <div class="dmc-drop" id="dmc-drop">
          ${S(IC.upload)}
          <div class="dmc-drop-title">Drop the DMC itinerary PDF here</div>
          <div class="dmc-drop-sub">or click to browse · PDF up to 20 MB</div>
          <input type="file" accept=".pdf" id="dmc-file" style="display:none">
          <div id="dmc-file-slot"></div>
        </div>
      </div>
      <div class="dmc-foot">
        <span class="dmc-foot-left">Parsing is simulated in this prototype</span>
        <button class="dmc-btn" data-dmc="close">Cancel</button>
        <button class="dmc-btn dmc-btn-primary" id="dmc-parse" disabled style="opacity:.5">Parse PDF</button>
      </div>`;
    const drop = pdfSheet.querySelector('#dmc-drop');
    const input = pdfSheet.querySelector('#dmc-file');
    const parseBtn = pdfSheet.querySelector('#dmc-parse');
    let fname = null;
    const setFile = (name) => {
      fname = name;
      pdfSheet.querySelector('#dmc-file-slot').innerHTML =
        `<span class="dmc-file-pill">${S(IC.file)}<span>${name}</span></span>`;
      parseBtn.disabled = false;
      parseBtn.style.opacity = '1';
    };
    drop.addEventListener('click', () => input.click());
    input.addEventListener('change', () => input.files[0] && setFile(input.files[0].name));
    ['dragover', 'dragleave', 'drop'].forEach((ev) =>
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.toggle('dmc-dragover', ev === 'dragover');
        if (ev === 'drop' && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0].name);
      })
    );
    pdfSheet.querySelector('[data-dmc="close"]').addEventListener('click', closeAll);
    pdfSheet.querySelectorAll('.dmc-foot [data-dmc="close"]').forEach((b) => b.addEventListener('click', closeAll));
    parseBtn.addEventListener('click', () => renderPdfProgress(fname || 'adriatic-compass-croatia.pdf'));
  }

  function renderPdfProgress(fname) {
    pdfSheet.innerHTML = `
      ${pdfHead(fname)}
      <div class="dmc-body">
        <div class="dmc-progress">
          <div class="dmc-spinner"></div>
          <div class="dmc-progress-stage" id="dmc-stage">Reading PDF…</div>
        </div>
      </div>`;
    pdfSheet.querySelector('[data-dmc="close"]').addEventListener('click', closeAll);
    const stages = ['Reading PDF…', 'Extracting components…', 'Matching to itinerary days…'];
    let i = 0;
    const t = setInterval(() => {
      i++;
      if (i < stages.length) {
        pdfSheet.querySelector('#dmc-stage').textContent = stages[i];
      } else {
        clearInterval(t);
        renderPdfReview(fname);
      }
    }, 800);
  }

  function renderPdfReview(fname) {
    PARSED_ITEMS.forEach((p) => (p.keep = true));
    const rows = PARSED_ITEMS.map(
      (p, i) => `
      <div class="dmc-review-row" data-i="${i}">
        <div class="dmc-parsed-ic">${S(TYPE_IC[p.type] || IC.ticket)}</div>
        <div class="dmc-review-main">
          <div class="dmc-review-title">${p.title}</div>
          <div class="dmc-review-sub">
            <span class="dmc-pill">${S(IC.cal)}${p.date.replace(', 2026', '')}</span>
            ${p.included
              ? '<span class="dmc-pill dmc-incl">Included in package</span>'
              : `<span class="dmc-pill dmc-price">${p.price}</span>`}
          </div>
        </div>
        <button class="dmc-keep">Keep</button>
      </div>`
    ).join('');
    pdfSheet.innerHTML = `
      ${pdfHead(`Found ${PARSED_ITEMS.length} components in ${fname} — review before adding.`)}
      <div class="dmc-body">
        <div class="dmc-review-list">${rows}</div>
        <div class="dmc-check-note">Items with their own line price stay itemized internally; everything else rolls into the package price. The member never sees invented per-item prices.</div>
      </div>
      <div class="dmc-foot">
        <span class="dmc-foot-left">Components land on their matched days</span>
        <button class="dmc-btn" data-dmc="close">Cancel</button>
        <button class="dmc-btn dmc-btn-primary" id="dmc-add">Add components</button>
      </div>`;
    pdfSheet.querySelector('[data-dmc="close"]').addEventListener('click', closeAll);
    pdfSheet.querySelectorAll('.dmc-review-row .dmc-keep').forEach((btn) =>
      btn.addEventListener('click', () => {
        const row = btn.closest('.dmc-review-row');
        const item = PARSED_ITEMS[+row.dataset.i];
        item.keep = !item.keep;
        row.classList.toggle('dmc-dropped', !item.keep);
        btn.textContent = item.keep ? 'Keep' : 'Skipped';
        updateAddLabel();
      })
    );
    const updateAddLabel = () => {
      const n = PARSED_ITEMS.filter((p) => p.keep).length;
      pdfSheet.querySelector('#dmc-add').textContent = `Add ${n} component${n === 1 ? '' : 's'}`;
    };
    updateAddLabel();
    pdfSheet.querySelector('#dmc-add').addEventListener('click', () => {
      document.querySelectorAll('.dmc-parsed-card').forEach((e) => e.remove());
      insertParsedCards();
      closeAll();
      decorate();
      const n = PARSED_ITEMS.filter((p) => p.keep).length;
      toast(`${n} component${n === 1 ? '' : 's'} added from ${fname}`);
      document.querySelector('.dmc-parsed-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /* ---- init ---- */
  function init() {
    scan();
    if (!itinCol || !registry.length) return;
    buildChrome();
    buildSheet();
    buildPdfSheet();
    buildFabs();
    // demo starts with the DMC already applied so the visualization is instant
    state.dmc.saved = true;
    state.linked = new Set(registry.filter((r) => DEFAULT_LINKED.includes(r.title)).map((r) => r.id));
    decorate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
