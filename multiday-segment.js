/* ============================================================
   Multi-day segment prototype - cruise as the stress case
   Conductor / CC v2, for the CON-1688 product loop.

   Argument: "DMC Booking" in the current Figma is not a DMC feature.
   It is a multi-day segment drawn for DMCs first. One container,
   four types (dmc / cruise / tour / rail), type-specific attributes
   underneath. That is the shape Dustin scoped on 2026-07-21.

   Demo data is real in shape:
   - capture fields  = Nina Price, #ta-ops-pod-1, 2026-03-19
   - the sailing     = Christine Melican, #cluster-rebeca, 2026-07-29
   All member details are fictionalised.
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- icons ---------------- */
  const svg = (p, w = 16) =>
    `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

  const IC = {
    ship:    '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10V2"/>',
    box:     '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    layers:  '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.59"/>',
    map:     '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764V21M9 3.236V19"/>',
    train:   '<path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1M15 15l1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3M16 19l2 3"/>',
    upload:  '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
    plus:    '<path d="M5 12h14M12 5v14"/>',
    x:       '<path d="M18 6 6 18M6 6l12 12"/>',
    check:   '<path d="M20 6 9 17l-5-5"/>',
    chev:    '<path d="m9 18 6-6-6-6"/>',
    edit:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
    trash:   '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    ext:     '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    anchor:  '<path d="M12 22V8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/><circle cx="12" cy="5" r="3"/>',
    sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    clock:   '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    file:    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    info:    '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    bed:     '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/>',
  };

  /* ---------------- the four segment types ---------------- */
  /* This is the whole argument: one container, the type varies. */
  const TYPES = {
    dmc:    { label: 'DMC package',     blurb: 'A destination management company running a leg on the ground.', icon: IC.box,   colour: '#7a5ea8', tag: 'IN FIGMA TODAY' },
    cruise: { label: 'Cruise',          blurb: 'A sailing with ports of call, sea days and a cabin.',            icon: IC.ship,  colour: '#2f6f8f', tag: 'THIS DEMO' },
    tour:   { label: 'Multi-day tour',  blurb: 'A guided tour running across several days.',                     icon: IC.map,   colour: '#856349', tag: 'SAME SHAPE' },
    rail:   { label: 'Multi-day rail',  blurb: 'A sleeper or multi-leg rail journey.',                           icon: IC.train, colour: '#5d5d5d', tag: 'SAME SHAPE' },
  };

  /* ---------------- demo trip ---------------- */
  const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const DOW   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  const d = (iso) => { const [y, m, dd] = iso.split('-').map(Number); return new Date(y, m - 1, dd); };
  const fmtDow = (iso) => DOW[d(iso).getDay()];
  const fmtShort = (iso) => `${MONTH[d(iso).getMonth()]}. ${d(iso).getDate()}`;
  const money = (n) => '$' + n.toLocaleString('en-US');

  /* The sailing. Shape and identifiers follow Christine's real booking
     posted in #cluster-rebeca on 2026-07-29. */
  const CRUISE = {
    id: 'seg-1',
    type: 'cruise',
    title: 'Best of Italy & Croatia',
    vendor: 'Celebrity Cruises',
    ship: 'Celebrity Constellation',
    confirmation: '5919859',
    stateroom: '6148',
    stateroomType: 'Concierge Class Veranda',
    deck: 'Deck 6',
    nights: 11,
    start: '2026-10-12',
    end: '2026-10-23',
    embark:    { port: 'Rome (Civitavecchia)', time: '17:00' },
    disembark: { port: 'Ravenna',              time: '06:00' },
    pricing: {
      mode: 'per-person',
      perPerson: 3980,
      guests: 2,
      extras: [
        { label: 'Port taxes & fees', amount: 742 },
        { label: 'Gratuities',        amount: 0, note: 'Included in fare' },
      ],
    },
    days: [
      { date: '2026-10-12', kind: 'embark', port: 'Rome (Civitavecchia)', note: 'Aboard by 15:30, sails 17:00',
        items: [{ t: 'Embarkation & sail-away', meta: 'Aboard by 15:30', tag: 'Cruise' }] },
      { date: '2026-10-13', kind: 'port', port: 'Naples, Italy', from: '07:00', to: '18:00',
        items: [{ t: 'Private Pompeii with an archaeologist', meta: '09:00 · 4 hrs · Maestro-arranged', tag: 'Experience', maestro: true }] },
      { date: '2026-10-14', kind: 'sea',
        items: [{ t: "Chef's Table, Tuscan Grille", meta: '19:30 · onboard', tag: 'Dining' }] },
      { date: '2026-10-15', kind: 'port', port: 'Taormina (Sicily), Italy', from: '08:00', to: '17:00', flag: 'Tender port', items: [] },
      { date: '2026-10-16', kind: 'port', port: 'Valletta, Malta', from: '08:00', to: '18:00', items: [] },
      { date: '2026-10-17', kind: 'sea',
        items: [{ t: 'Couples thermal suite, The Spa', meta: '14:00 · onboard', tag: 'Experience' }] },
      { date: '2026-10-18', kind: 'port', port: 'Dubrovnik, Croatia', from: '09:00', flag: 'Overnight in port',
        items: [{ t: 'Old Town after the crowds, private guide', meta: '16:00 · 3 hrs · Maestro-arranged', tag: 'Experience', maestro: true }] },
      { date: '2026-10-19', kind: 'port', port: 'Dubrovnik, Croatia', to: '17:00', flag: 'Departs today', items: [] },
      { date: '2026-10-20', kind: 'port', port: 'Split, Croatia', from: '08:00', to: '18:00', items: [] },
      { date: '2026-10-21', kind: 'sea',
        items: [{ t: 'Anniversary dinner, Le Petit Chef', meta: '20:00 · onboard', tag: 'Dining' }] },
      { date: '2026-10-22', kind: 'port', port: 'Zadar, Croatia', from: '09:00', to: '17:00', items: [] },
      { date: '2026-10-23', kind: 'disembark', port: 'Ravenna', note: 'Ashore from 06:00',
        items: [{ t: 'Private transfer, Ravenna to Bologna Airport', meta: '08:30', tag: 'Transfer' }] },
    ],
  };

  /* Days outside the sailing. Oct 11 exists because ops asked for it:
     Hailey Schoenfeld, #ta-ops-pod-1, 2026-03-19, "add one day in the
     cruise departure city". */
  const LAND = [
    { date: '2026-10-11', label: 'Pre-cruise, Rome',
      block: { title: 'Rome Hotels', count: '3 options',
        cards: [
          { n: 'Hotel de Russie', s: 'Deluxe Room · 1 night · 5-star', badge: 'Recommended' },
          { n: 'J.K. Place Roma',  s: 'Junior Suite · 1 night · 5-star', badge: 'Alternate' },
        ] } },
  ];

  /* ---------------- state ---------------- */
  const state = {
    added: false,
    member: false,
    pricingMode: 'per-person',
    excluded: new Set(),
  };

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ============================================================
     RENDER: the itinerary
     ============================================================ */

  function dayHead(iso, n, tag) {
    return `
      <div class="day-head">
        <div class="day-num">DAY<b>${String(n).padStart(2, '0')}</b></div>
        <div class="day-date">
          <div class="dow">${fmtDow(iso)}</div>
          <div class="dmy">${fmtShort(iso)}</div>
        </div>
        ${tag ? `<div class="day-tag">${tag}</div>` : ''}
      </div>`;
  }

  function landBlock(b) {
    return `
      <div class="block">
        <div class="block-head">
          <div class="block-title">${svg(IC.bed, 15)} ${b.title} <small>${b.count}</small></div>
          <div class="block-actions ta-only">
            <button class="icon-btn" aria-label="Edit">${svg(IC.edit, 15)}</button>
            <button class="icon-btn" aria-label="Remove">${svg(IC.trash, 15)}</button>
          </div>
        </div>
        <div class="card-row">
          ${b.cards.map(c => `
            <div class="card">
              <div class="ph" data-label="${c.n}"></div>
              <div class="card-body">
                <span class="badge badge-rec" style="margin-bottom:8px">${c.badge}</span>
                <h4>${c.n}</h4>
                <p>${c.s}</p>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  /* --- the segment itself --- */
  function segDayRow(day, idx) {
    const isSea = day.kind === 'sea';
    const cls = ['seg-day'];
    if (isSea) cls.push('is-sea');
    if (day.kind === 'embark') cls.push('is-embark');
    if (day.kind === 'disembark') cls.push('is-disembark');

    let head;
    if (isSea) {
      head = `<div class="port-line">
                ${svg(IC.sun, 15)}<span class="port-name">At sea</span>
              </div>
              <p class="sea-note">No port today. Onboard plans below.</p>`;
    } else {
      const times = [];
      if (day.from) times.push(`arrives ${day.from}`);
      if (day.to) times.push(`departs ${day.to}`);
      head = `<div class="port-line">
                ${svg(day.kind === 'embark' || day.kind === 'disembark' ? IC.anchor : IC.map, 15)}
                <span class="port-name">${day.port}</span>
                ${times.length ? `<span class="port-time">${times.join(' &middot; ')}</span>` : ''}
                ${day.flag ? `<span class="badge badge-info">${day.flag}</span>` : ''}
                ${day.note ? `<span class="port-time">${day.note}</span>` : ''}
              </div>`;
    }

    const items = day.items.map(it => `
      <div class="exc">
        <div>
          <div class="t">${it.t}</div>
          <div class="meta">${it.meta}</div>
        </div>
        <div class="right">
          ${it.maestro ? '<span class="badge badge-ok">Maestro</span>' : ''}
          <span class="badge badge-inc">${state.member ? 'Included' : 'Included in fare'}</span>
        </div>
      </div>`).join('');

    /* Rebeca's ask, 2026-08-04: recommend our own port experiences
       instead of the cruise line's shore excursions. */
    const ghost = (!state.member && day.kind === 'port' && !day.items.length)
      ? `<button class="exc ghost" data-act="add-exc" data-i="${idx}">${svg(IC.plus, 14)} Add a port experience</button>`
      : '';

    return `
      <div class="${cls.join(' ')}">
        <div class="seg-day-key">
          <div class="n">DAY ${String(idx + 1).padStart(2, '0')}</div>
          <div class="d">${d(day.date).getDate()}</div>
          <div class="m">${MONTH[d(day.date).getMonth()]}</div>
        </div>
        <div class="seg-day-main">
          ${head}
          ${(items || ghost) ? `<div class="excursions">${items}${ghost}</div>` : ''}
        </div>
      </div>`;
  }

  function priceLine() {
    const p = CRUISE.pricing;
    const fare = p.perPerson * p.guests;
    const extras = p.extras.reduce((s, e) => s + e.amount, 0);
    const total = fare + extras;
    if (state.member) return { big: money(total), sub: `${p.guests} guests · all taxes included` };
    if (state.pricingMode === 'per-person') return { big: money(total), sub: `${money(p.perPerson)} pp × ${p.guests} + ${money(extras)} taxes` };
    return { big: money(total), sub: 'One package price' };
  }

  function segmentEl() {
    const t = TYPES[CRUISE.type];
    const pr = priceLine();

    const foot = state.member ? `
      <div class="seg-foot">
        <dl><dt>Ship</dt><dd>${CRUISE.ship}</dd></dl>
        <dl><dt>Stateroom</dt><dd>${CRUISE.stateroomType}</dd></dl>
        <dl><dt>Nights</dt><dd>${CRUISE.nights}</dd></dl>
      </div>` : `
      <div class="seg-foot">
        <dl><dt>Ship</dt><dd>${CRUISE.ship}</dd></dl>
        <dl><dt>Booking</dt><dd>${CRUISE.confirmation}</dd></dl>
        <dl><dt>Stateroom</dt><dd>${CRUISE.stateroom} · ${CRUISE.stateroomType} · ${CRUISE.deck}</dd></dl>
        <dl><dt>Embark</dt><dd>${fmtShort(CRUISE.start)} ${CRUISE.embark.time} ${CRUISE.embark.port}</dd></dl>
        <dl><dt>Disembark</dt><dd>${fmtShort(CRUISE.end)} ${CRUISE.disembark.time} ${CRUISE.disembark.port}</dd></dl>
      </div>`;

    return `
      <div class="segment is-cruise landed" id="theSegment">
        <div class="seg-head">
          <span class="seg-chip">${svg(t.icon, 13)} ${t.label.toUpperCase()}</span>
          <div class="seg-id">
            <h3>${CRUISE.ship} &middot; ${CRUISE.title}</h3>
            <p>${CRUISE.nights} nights &middot; ${CRUISE.embark.port} to ${CRUISE.disembark.port}
               &middot; ${CRUISE.days.filter(x => x.kind === 'sea').length} days at sea</p>
          </div>
          <div class="seg-price">
            <b>${pr.big}</b>
            <span>${pr.sub}</span>
          </div>
          <div class="seg-head-actions">
            <button class="btn btn-sm btn-outline">${svg(IC.ext, 13)} View voyage</button>
            <button class="icon-btn" aria-label="Edit">${svg(IC.edit, 15)}</button>
            <button class="icon-btn" aria-label="Remove">${svg(IC.trash, 15)}</button>
          </div>
        </div>
        ${state.member ? '' : `
        <div class="seg-invariant">
          ${svg(IC.check, 15)}
          <div>
            <b>Supplies its own accommodation.</b>
            ${CRUISE.nights} nights are covered by this segment, so
            <code>city-stay-has-hotel</code> passes without a hotel component, and the
            ${CRUISE.days.filter(x => x.kind === 'sea').length} days at sea route cleanly.
            <span class="then">
              Today those nights read as <s>${CRUISE.nights} nights with nowhere to sleep</s> and the
              fidelity check false-fails every one of them.
            </span>
          </div>
        </div>`}
        <div class="seg-body">
          ${CRUISE.days.map(segDayRow).join('')}
        </div>
        ${foot}
      </div>`;
  }

  function render() {
    const root = $('#itin');
    let html = '';
    let n = 1;

    /* pre-cruise land day */
    LAND.forEach(l => {
      html += `<section class="day">${dayHead(l.date, n++, l.label.toUpperCase())}${landBlock(l.block)}</section>`;
      html += `<div class="add-row ta-only"><button class="add-btn" data-act="open" aria-label="Add to itinerary">${svg(IC.plus, 15)}</button></div>`;
    });

    if (!state.added) {
      html += `
        <section class="day">
          ${dayHead(CRUISE.start, n, 'NOTHING SCHEDULED')}
          <div class="empty-slot">
            <div style="font-weight:600;color:var(--text);margin-bottom:4px">Oct 12 &ndash; 23 is empty</div>
            The member has an 11-night sailing booked. There is no component type that can hold it,
            so it lives in a Notion note and the trip page shows twelve blank days.
          </div>
          <div class="add-row ta-only" style="padding-top:12px">
            <button class="btn btn-primary" data-act="open">${svg(IC.plus, 15)} Add to itinerary</button>
          </div>
        </section>`;
    } else {
      html += `<section class="day">${dayHead(CRUISE.start, n, 'SAILING')}${segmentEl()}</section>`;
      html += `<div class="add-row ta-only"><button class="add-btn" data-act="open" aria-label="Add to itinerary">${svg(IC.plus, 15)}</button></div>`;
    }

    root.innerHTML = html;

    /* rail totals */
    const pr = priceLine();
    $('#railTotal').textContent = state.added ? pr.big : '$1,240';
    $('#bookedCount').innerHTML = state.added
      ? `${svg(IC.check, 14)} 4/6 Booked`
      : `${svg(IC.check, 14)} 0/6 Booked`;
    const rc = $('#railCommission');
    if (rc) rc.hidden = !state.added || state.member;

    if (state.added) {
      setTimeout(() => {
        const s = $('#theSegment');
        if (s) s.classList.remove('landed');
      }, 2400);
    }
  }

  /* ============================================================
     MODAL: chooser -> type -> capture -> parse -> review
     ============================================================ */

  const scrim = $('#scrim');
  const modal = $('#modal');
  let step = null;

  function openModal(which) { step = which; paint(); scrim.classList.add('open'); }

  /* Clear the modal after it fades, so stale steps never flash on reopen
     and nothing internal lingers in the DOM during a member preview. */
  function closeModal() {
    scrim.classList.remove('open');
    clearTimeout(closeModal._t);
    closeModal._t = setTimeout(() => {
      if (!scrim.classList.contains('open')) { modal.innerHTML = ''; step = null; }
    }, 200);
  }

  scrim.addEventListener('click', e => { if (e.target === scrim) closeModal(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (scrim.classList.contains('open')) closeModal();
    else $('#notes').classList.remove('open');
  });

  function head(icon, title, sub, wide) {
    modal.className = 'modal' + (wide ? ' wide' : '');
    return `
      <div class="modal-head">
        <div class="ic">${svg(icon, 18)}</div>
        <div>
          <h2 id="modalTitle">${title}</h2>
          <p>${sub}</p>
        </div>
        <button class="icon-btn x" data-act="close" aria-label="Close">${svg(IC.x, 18)}</button>
      </div>`;
  }

  /* --- step 1: what are we adding --- */
  function stepChooser() {
    return head(IC.plus, 'Add to itinerary', 'Create curated options, or add a booking that spans days') + `
      <div class="modal-body">
        <div class="tiles">
          <button class="tile" data-act="collection">
            <div class="ic">${svg(IC.layers, 17)}</div>
            <div>
              <b>Collection</b>
              <span>Compare options you curate, hotels, dining, experiences, and more.</span>
            </div>
            <span class="chev">${svg(IC.chev, 15)}</span>
          </button>
          <button class="tile is-new" data-act="segment">
            <div class="ic">${svg(IC.box, 17)}</div>
            <div>
              <b>Multi-day segment <span class="tile-flag">NEW</span></b>
              <span>One booking that runs across several days. DMC package, cruise, tour or rail.</span>
            </div>
            <span class="chev">${svg(IC.chev, 15)}</span>
          </button>
        </div>
        <div class="shared-note">
          ${svg(IC.info, 15)}
          <div>
            Today this second tile reads <b>"DMC Booking"</b>. Renaming it to a multi-day segment is the whole
            proposal. The container already spans days, groups by day, links components and carries one price.
            Only the type varies.
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <span class="note">Anchored to Oct 12, the first empty day.</span>
        <span class="spacer"></span>
        <button class="btn btn-ghost" data-act="close">Cancel</button>
      </div>`;
  }

  /* --- step 2: which type --- */
  function stepType() {
    const opts = Object.entries(TYPES).map(([k, t]) => `
      <button class="type-opt" data-act="pick-type" data-type="${k}" ${k === 'cruise' ? 'aria-pressed="true"' : ''}>
        <div class="ic" style="background:${t.colour}">${svg(t.icon, 18)}</div>
        <div>
          <b>${t.label}</b>
          <span>${t.blurb}</span>
        </div>
        <span class="tag">${t.tag}</span>
      </button>`).join('');

    return head(IC.box, 'New multi-day segment', 'Same container, same day rail, same linked components. Pick the type.') + `
      <div class="modal-body">
        <div class="types">${opts}</div>
        <div class="shared-note">
          ${svg(IC.info, 15)}
          <div>
            Dustin scoped exactly this on <b>2026-07-21</b>: one multi-day type covering cruises, multi-day tours
            and multi-day train rides, because ancillary items hang off those days. Cruise is picked here because
            it is the hardest of the four.
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="back-chooser">Back</button>
        <span class="spacer"></span>
        <button class="btn btn-primary" data-act="to-capture">Continue with Cruise</button>
      </div>`;
  }

  /* --- step 3: capture --- */
  function stepCapture() {
    return head(IC.ship, 'New cruise segment', 'Rome to Ravenna &middot; lands on the right days once added') + `
      <div class="modal-body">
        <div class="dropzone">
          <div class="ic">${svg(IC.upload, 19)}</div>
          <b>Drop the cruise confirmation here</b>
          <p>PDF or document. We read it into a dated voyage you can review. Nothing is added until you confirm.</p>
          <button class="btn btn-outline btn-sm" data-act="parse">Browse files</button>
        </div>

        <div class="or">or</div>

        <button class="alt-row" data-act="manual">
          ${svg(IC.plus, 16)}
          <div>
            <b>Enter the voyage manually</b>
            <span>Ship, ports and cabin, no file needed</span>
          </div>
        </button>

        <div class="shared-note" style="margin-top:16px">
          ${svg(IC.info, 15)}
          <div>
            Only <b>Embark:</b>, <b>Disembark</b> and a named cruise line parse reliably. Ship names and the word
            "cabin" throw false positives, seven of them in the Yarbrough PDF alone, so the review step below is
            not optional.
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="back-type">Back</button>
        <span class="spacer"></span>
        <button class="btn btn-primary" disabled>Add to itinerary</button>
      </div>`;
  }

  /* --- step 3b: manual entry, built from ops' own field list --- */
  function stepManual() {
    return head(IC.ship, 'Enter the voyage', "Fields are ops' own list, #ta-ops-pod-1, 2026-03-19", true) + `
      <div class="modal-body">
        <div class="grid2">
          <div class="field"><label>Cruise line</label><input type="text" value="Celebrity Cruises"></div>
          <div class="field"><label>Name of cruise ship</label><input type="text" value="Celebrity Constellation"></div>
        </div>
        <div class="field"><label>Title of trip</label><input type="text" value="Best of Italy &amp; Croatia"></div>
        <div class="grid3">
          <div class="field"><label>Embarkation date</label><input type="date" value="2026-10-12"></div>
          <div class="field"><label>Embarkation city</label><input type="text" value="Rome (Civitavecchia)"></div>
          <div class="field"><label>Time</label><input type="text" value="17:00"></div>
        </div>
        <div class="grid3">
          <div class="field"><label>Disembarkation date</label><input type="date" value="2026-10-23"></div>
          <div class="field"><label>Disembarkation city</label><input type="text" value="Ravenna"></div>
          <div class="field"><label>Time</label><input type="text" value="06:00"></div>
        </div>
        <div class="grid3">
          <div class="field"><label>Stateroom type</label><input type="text" value="Concierge Class Veranda"></div>
          <div class="field"><label>Stateroom no.</label><input type="text" value="6148"></div>
          <div class="field"><label>Booking ID</label><input type="text" value="5919859"></div>
        </div>
        <div class="grid3">
          <div class="field"><label>Fare basis</label>
            <select><option selected>Per person</option><option>Per cabin</option><option>One package price</option></select>
          </div>
          <div class="field"><label>Fare per person</label><input type="text" value="$3,980"></div>
          <div class="field"><label>Port taxes &amp; fees</label><input type="text" value="$742"></div>
        </div>
        <div class="shared-note">
          ${svg(IC.info, 15)}
          <div>
            Four of these have nowhere to live in the current model: ship, stateroom, embark and disembark
            port with times, and a fare that is per person rather than per package.
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-act="back-capture">Back</button>
        <span class="spacer"></span>
        <button class="btn btn-primary" data-act="review">Continue to review</button>
      </div>`;
  }

  /* --- step 4: parse animation --- */
  const STAGES = ['Reading the document', 'Finding embark and disembark', 'Building the day-by-day voyage', 'Matching ports to dates'];

  function stepParse() {
    return head(IC.file, 'Reading the confirmation', 'Celebrity_Constellation_5919859.pdf') + `
      <div class="modal-body">
        <div class="parse">
          <div class="parse-file">${svg(IC.file, 16)} Celebrity_Constellation_5919859.pdf <span class="sz">318 KB</span></div>
          <div id="stages">
            ${STAGES.map((s, i) => `<div class="stage" data-i="${i}"><span class="dot"></span>${s}</div>`).join('')}
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <span class="note">Nothing is added until you confirm.</span>
        <span class="spacer"></span>
        <button class="btn btn-ghost" data-act="close">Cancel</button>
      </div>`;
  }

  function runParse() {
    let i = 0;
    const tick = () => {
      const rows = $$('#stages .stage');
      if (!rows.length) return;
      if (i > 0) { rows[i - 1].classList.remove('active'); rows[i - 1].classList.add('done'); rows[i - 1].querySelector('.dot').innerHTML = svg(IC.check, 11); }
      if (i < rows.length) { rows[i].classList.add('active'); i++; setTimeout(tick, 620); }
      else setTimeout(() => { step = 'review'; paint(); }, 380);
    };
    setTimeout(tick, 260);
  }

  /* --- step 5: review --- */
  function stepReview() {
    const p = CRUISE.pricing;
    const fare = p.perPerson * p.guests;
    const extras = p.extras.reduce((s, e) => s + e.amount, 0);

    const groups = CRUISE.days.map((day, i) => {
      const isSea = day.kind === 'sea';
      const kindTag = isSea
        ? '<span class="kind kind-sea">AT SEA</span>'
        : `<span class="kind kind-port">${day.kind === 'embark' ? 'EMBARK' : day.kind === 'disembark' ? 'DISEMBARK' : 'PORT'}</span>`;

      const label = isSea ? 'At sea' : day.port;
      const times = [day.from ? `arrives ${day.from}` : '', day.to ? `departs ${day.to}` : ''].filter(Boolean).join(' · ');

      const rows = day.items.length
        ? day.items.map(it => `
            <div class="rv">
              <input type="checkbox" checked>
              <div class="thumb"></div>
              <div class="txt">
                <b>${it.t}</b>
                <div class="sub">${it.meta}</div>
              </div>
              <div class="rt"><span class="badge badge-inc">Included</span></div>
            </div>`).join('')
        : `<div class="rv ${isSea ? 'is-sea' : ''}">
              <input type="checkbox" checked>
              <div class="thumb"></div>
              <div class="txt">
                <b>${isSea ? 'Day at sea' : label}</b>
                <div class="sub">${isSea ? 'Onboard. No port call.' : (times || 'Port call')}</div>
                ${!isSea ? '<div class="pending">Optional: add a port experience</div>' : ''}
              </div>
              <div class="rt"><span class="badge badge-inc">Included</span></div>
            </div>`;

      return `
        <div class="rv-group">
          <h5>DAY ${String(i + 1).padStart(2, '0')} &middot; ${fmtShort(day.date).toUpperCase()} ${kindTag} <span style="font-weight:400;letter-spacing:0;color:var(--text-sec);text-transform:none">${label}${times ? ' · ' + times : ''}</span></h5>
          ${rows}
        </div>`;
    }).join('');

    return head(IC.ship, `Cruise &middot; ${CRUISE.ship} &mdash; ${CRUISE.title}`,
      `Parsed from Celebrity_Constellation_5919859.pdf`, true) + `
      <div class="modal-body">
        <div class="review-banner">
          ${svg(IC.check, 15)}
          <div>
            We found an 11-night voyage and built <b>12 dated days</b>, including
            <b>3 days at sea</b> and an overnight in Dubrovnik. Every day is populated, none are blank.
          </div>
        </div>

        <div class="pricing-row">
          <div>
            <b>Pricing &middot; Per person</b>
            <span>${money(p.perPerson)} pp × ${p.guests} guests, plus ${money(extras)} port taxes. Total ${money(fare + extras)}.</span>
          </div>
          <div class="mini-toggle" role="group" aria-label="Pricing mode">
            <button data-act="pmode" data-m="package">Package</button>
            <button data-act="pmode" data-m="per-person" aria-pressed="true">Per person</button>
            <button data-act="pmode" data-m="per-item">Per item</button>
          </div>
        </div>
        <div class="shared-note" style="margin:2px 0 6px">
          ${svg(IC.info, 15)}
          <div>
            <b>Per person is the new mode.</b> The Figma offers Package or Per item only. A cruise fare is
            quoted per person with port taxes on top, so today a TA has to fake it.
          </div>
        </div>

        ${groups}
      </div>
      <div class="modal-foot">
        <span class="note">12 days, 3 at sea. Sea days carry onboard plans rather than sitting empty.</span>
        <span class="spacer"></span>
        <button class="btn btn-ghost" data-act="back-capture">Back</button>
        <button class="btn btn-primary" data-act="commit">Add to itinerary</button>
      </div>`;
  }

  function paint() {
    const map = {
      chooser: stepChooser, type: stepType, capture: stepCapture,
      manual: stepManual, parse: stepParse, review: stepReview,
    };
    modal.innerHTML = (map[step] || stepChooser)();
    if (step === 'parse') runParse();
    const f = modal.querySelector('.modal-body button, .modal-body input');
    if (f && step !== 'parse') f.focus({ preventScroll: true });
  }

  /* ============================================================
     events
     ============================================================ */

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;

    switch (act) {
      case 'open':        openModal('chooser'); break;
      case 'close':       closeModal(); break;
      case 'segment':     step = 'type'; paint(); break;
      case 'back-chooser':step = 'chooser'; paint(); break;
      case 'back-type':   step = 'type'; paint(); break;
      case 'back-capture':step = 'capture'; paint(); break;
      case 'to-capture':  step = 'capture'; paint(); break;
      case 'manual':      step = 'manual'; paint(); break;
      case 'review':      step = 'review'; paint(); break;
      case 'parse':       step = 'parse'; paint(); break;

      case 'collection':
        toast('Collection is the existing single-day flow. Unchanged by this proposal.');
        break;

      case 'pick-type': {
        $$('.type-opt').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
        if (el.dataset.type !== 'cruise') {
          toast(`${TYPES[el.dataset.type].label} uses the same container. This demo walks the cruise path.`);
          setTimeout(() => {
            $$('.type-opt').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.type === 'cruise')));
          }, 1400);
        }
        break;
      }

      case 'pmode': {
        state.pricingMode = el.dataset.m;
        $$('[data-act="pmode"]').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
        const row = el.closest('.pricing-row').querySelector('div');
        const p = CRUISE.pricing;
        const extras = p.extras.reduce((s, x) => s + x.amount, 0);
        const total = p.perPerson * p.guests + extras;
        if (state.pricingMode === 'package') {
          row.innerHTML = `<b>Pricing &middot; One package price</b><span>${money(total)} for the voyage. Per-person breakdown and port taxes are lost.</span>`;
        } else if (state.pricingMode === 'per-item') {
          row.innerHTML = `<b>Pricing &middot; Per item</b><span>Enter a price per day. A cruise fare does not decompose by day, so this mode does not fit.</span>`;
        } else {
          row.innerHTML = `<b>Pricing &middot; Per person</b><span>${money(p.perPerson)} pp × ${p.guests} guests, plus ${money(extras)} port taxes. Total ${money(total)}.</span>`;
        }
        break;
      }

      case 'commit':
        state.added = true;
        state.pricingMode = 'per-person';
        closeModal();
        render();
        setTimeout(() => {
          const s = $('#theSegment');
          if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 90);
        toast('Voyage added. 12 days populated, the Rome night is untouched.');
        break;

      case 'add-exc':
        toast('Port experiences hang off the port call, which is why arrival and departure times matter.');
        break;

      case 'member':
        state.member = !state.member;
        document.body.classList.toggle('member', state.member);
        $('#fabMember').classList.toggle('on', state.member);
        $('#fabMemberLabel').textContent = state.member ? 'Advisor view' : 'Member preview';
        if (!state.added) toast('Add the voyage first to see the member view.');
        render();
        break;

      case 'exit-member':
        state.member = false;
        document.body.classList.remove('member');
        $('#fabMember').classList.remove('on');
        $('#fabMemberLabel').textContent = 'Member preview';
        render();
        break;

      case 'notes':       $('#notes').classList.add('open'); break;
      case 'close-notes': $('#notes').classList.remove('open'); break;
    }
  });

  render();
})();
