/* ============================================================
   Cross-collection date cascade (CON-1626)
   Injected on top of the Conductor dev-build snapshot,
   alongside add-flow.js (which exposes window.AF).

   Dates live at collection level (CON-810: components inherit),
   so the cascade is collection-to-collection.

   Locked behavior from intake:
   1. A collection date edit that affects dependent collections
      PROMPTS the advisor: shift the dependents or leave them.
   2. Preview of the resulting dates for every affected
      collection before anything is applied.
   3. No silent auto-move. Dependency rules are explicit and
      shown on every row (the "why" chip).

   Demo dependency rules (proposal, open at Brief). Any
   collection edit runs the same scan; what it drags depends
   on what is scheduled around it:
   - STAY edited: boundary flights/transfers re-anchor,
     day-anchored collections inside shift with check-in,
     everything after check-out follows the check-out delta.
   - FLIGHT edited (CON-792 pattern): same-day transfers meet
     the flight, boundary stays re-anchor (nights preserved on
     a check-in move), and those stays pull their dependents.
   - TRANSFER / DINING / EXPERIENCES edited: leaves; nothing
     is scheduled around them, so no prompt (direct save).
   ============================================================ */
(function () {
  'use strict';

  /* ---- local date math (YMD strings) ---- */
  function parseYMD(ymd) { const p = (ymd || '').split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(ymd, n) {
    const d = parseYMD(ymd); d.setDate(d.getDate() + n);
    const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${dd}`;
  }
  function diffDays(a, b) { return Math.round((parseYMD(b) - parseYMD(a)) / 86400000); }
  function plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }
  function deltaWord(n) { return `${n > 0 ? '+' : '−'}${plural(Math.abs(n), 'day')}`; }
  function shortDate(ymd) { return parseYMD(ymd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
  function shortRange(s, e) { return (!e || e === s) ? shortDate(s) : `${shortDate(s)} – ${shortDate(e)}`; }

  const AF = () => window.AF || {};

  /* ---- collection registry (scan the enhanced snapshot) ---- */
  function nameOfChip(chip) {
    if (chip.dataset.dcName) return chip.dataset.dcName;
    const countEl = chip.previousElementSibling;
    const titleEl = countEl && countEl.previousElementSibling;
    return titleEl ? titleEl.textContent.trim() : 'Collection';
  }
  function cityOf(name) {
    return (name || '').replace(/,?\s*Thailand\s*/i, ' ').replace(/\b(Hotels?|Dining|Experiences?|Flights?|Transfers?|Notes?)\b/gi, ' ').replace(/\s+/g, ' ').trim();
  }
  function scan() {
    return [...document.querySelectorAll('.af-coll-date')].map((chip) => {
      const name = nameOfChip(chip);
      const type = chip.dataset.dcType || AF().inferType(name);
      const countEl = chip.previousElementSibling;
      const count = chip.dataset.dcCount || ((countEl && ((countEl.textContent || '').match(/(\d+)\s*option/) || [])[1]) || '');
      const city = chip.dataset.dcCity || cityOf(name);
      return { name, type, chip, count, city, start: chip.dataset.start, end: chip.dataset.end || chip.dataset.start };
    }).filter((c) => c.start);
  }

  /* ---- dependency engine (any collection can drive a cascade) ---- */
  // selected defaults to FALSE: nothing moves unless the advisor opts in.
  // cls drives the conflict semantics: 'within' items must stay INSIDE the
  // edited stay's new span; 'anchor'/'after' items conflict when they land
  // inside it.
  function mkDep(k, shift, reason, cls) {
    const ns = addDays(k.start, shift), ne = addDays(k.end, shift);
    return { ...k, newStart: ns, newEnd: ne, sysStart: ns, sysEnd: ne, reason, shift, cls, selected: false, manual: false };
  }

  // Stay driver: flights/transfers on the boundaries re-anchor, day-anchored
  // collections inside shift with check-in, everything after check-out follows.
  function stayDeps(edited, registry, seen) {
    const { s0, e0, s1, e1 } = edited;
    const dStart = diffDays(s0, s1);
    const dEnd = diffDays(e0, e1);
    const out = [];
    registry.forEach((k) => {
      if (seen.has(k.chip)) return;
      let shift = 0, reason = '', cls = '';
      const anchorType = (k.type === 'flights' || k.type === 'transfers');
      if (anchorType && k.start === s0) {
        shift = dStart; cls = 'anchor'; reason = `${k.type === 'flights' ? 'Flight' : 'Transfer'} anchored to ${edited.shortName} check-in`;
      } else if (anchorType && k.start === e0) {
        shift = dEnd; cls = 'anchor'; reason = `${k.type === 'flights' ? 'Flight' : 'Transfer'} anchored to ${edited.shortName} check-out`;
      } else if (k.start >= e0) {
        shift = dEnd; cls = 'after'; reason = k.type === 'hotels'
          ? `Check-in follows ${edited.shortName} check-out`
          : `Scheduled after the ${edited.shortName} stay, keeps its place in the trip`;
      } else if (k.start >= s0 && k.start < e0) {
        shift = dStart; cls = 'within'; reason = `Day-anchored within the ${edited.shortName} stay`;
      }
      if (shift !== 0) { seen.add(k.chip); out.push(mkDep(k, shift, reason, cls)); }
    });
    return out;
  }

  // Flight driver (CON-792 pattern): same-day transfers meet the flight; a stay
  // whose check-in sits on the flight day moves wholesale (nights preserved), a
  // stay whose check-out sits on it gains/loses nights; each re-anchored stay
  // then pulls its own dependents.
  function flightDeps(edited, registry, seen) {
    const d = diffDays(edited.s0, edited.s1);
    const out = [];
    if (d === 0) return out;
    registry.forEach((k) => {
      if (seen.has(k.chip)) return;
      if (k.type === 'transfers' && k.start === edited.s0) {
        seen.add(k.chip); out.push(mkDep(k, d, 'Transfer meets this flight', 'anchor'));
      }
    });
    registry.forEach((k) => {
      if (seen.has(k.chip) || k.type !== 'hotels') return;
      let dep = null;
      if (k.start === edited.s0) {
        dep = mkDep(k, d, 'Check-in follows the new flight date, nights preserved', 'anchor');
      } else if (k.end === edited.s0) {
        dep = { ...k, newStart: k.start, newEnd: addDays(k.end, d), sysStart: k.start, sysEnd: addDays(k.end, d), reason: `Check-out follows the new flight date (${d > 0 ? 'extra' : 'fewer'} night${Math.abs(d) === 1 ? '' : 's'} in ${shortName(k.name)})`, shift: d, cls: 'anchor', selected: false, manual: false };
      }
      if (dep) {
        seen.add(k.chip); out.push(dep);
        const virtual = { name: k.name, shortName: shortName(k.name), type: 'hotels', chip: k.chip, s0: k.start, e0: k.end, s1: dep.newStart, e1: dep.newEnd };
        out.push(...stayDeps(virtual, registry, seen));
      }
    });
    return out;
  }

  function computeDependents(edited, registry) {
    const seen = new Set([edited.chip]);
    if (edited.type === 'hotels') return stayDeps(edited, registry, seen);
    if (edited.type === 'flights') return flightDeps(edited, registry, seen);
    // Transfers, dining, experiences, notes: nothing is scheduled around them,
    // so their edits cascade to nothing (they are leaves in the dependency tree).
    return [];
  }

  /* ---- trip range preview (edited + selected deps applied) ---- */
  function tripPreview(registry, edited, deps, baseTrip) {
    const cur = baseTrip || rangeOf(registry.map((k) => [k.start, k.end]));
    const spans = registry.map((k) => {
      if (k.chip === edited.chip) return [edited.s1, edited.e1];
      const d = deps.find((x) => x.chip === k.chip);
      return (d && d.selected) ? [d.newStart, d.newEnd] : [k.start, k.end];
    });
    if (!spans.length && baseTrip) {
      spans.push([edited.s1, edited.e1]);
      deps.forEach((d) => { if (d.selected) spans.push([d.newStart, d.newEnd]); });
    }
    return { cur, next: rangeOf(spans) };
  }
  function rangeOf(spans) {
    let min = null, max = null;
    spans.forEach(([s, e]) => {
      if (s && (!min || s < min)) min = s;
      const ee = e || s;
      if (ee && (!max || ee > max)) max = ee;
    });
    return { min, max };
  }

  /* ---- the cascade modal ---- */
  function icon(type, opts) { const I = AF().IC || {}; return AF().S ? AF().S(I[type] || I.cal, opts || 'width="14" height="14"') : ''; }

  function openCascadeModal(ctx) {
    const { edited, deps, registry, applyToSelf, baseTrip, onDone } = ctx;
    const existing = document.getElementById('dc-modal');
    if (existing) existing.remove();

    const dStart = diffDays(edited.s0, edited.s1);
    const dEnd = diffDays(edited.e0, edited.e1);
    const isStay = edited.type === 'hotels';
    const deltaBits = [];
    if (dStart === dEnd && dStart !== 0) deltaBits.push(`moved ${deltaWord(dStart)}`);
    else {
      if (dStart !== 0) deltaBits.push(`${isStay ? 'check-in' : 'start'} ${deltaWord(dStart)}`);
      if (dEnd !== 0) deltaBits.push(`${isStay ? 'check-out' : 'end'} ${deltaWord(dEnd)}`);
    }

    const unaffected = registry.filter((k) => k.chip !== edited.chip && !deps.find((d) => d.chip === k.chip));
    const unaffectedLine = unaffected.length
      ? `${plural(unaffected.length, 'collection')} before the change keep${unaffected.length === 1 ? 's' : ''} their dates (${summarizeNames(unaffected)}).`
      : '';

    const meta = (d) => {
      const bits = [];
      if (d.city) bits.push(d.city);
      if (d.count) bits.push(`${d.count} option${String(d.count) === '1' ? '' : 's'}`);
      return bits.join(' · ');
    };
    const row = (d, i) => `
      <label class="dc-row" data-i="${i}">
        <input type="checkbox" class="dc-cb">
        <span class="dc-row-ic">${icon(d.type)}</span>
        <span class="dc-row-main">
          <span class="dc-row-name">${d.name}</span>
          ${meta(d) ? `<span class="dc-row-meta">${meta(d)}</span>` : ''}
          <span class="dc-row-reason">${d.reason}</span>
          <span class="dc-row-warn"></span>
        </span>
        <span class="dc-row-dates">
          <span class="dc-old">${shortRange(d.start, d.end)}</span>
          <span class="dc-arrow">→</span>
          <button type="button" class="dc-new" title="Click to set a custom date">${shortRange(d.newStart, d.newEnd)}</button>
          <span class="dc-custom-pill">custom</span>
          <button type="button" class="dc-reset" title="Back to the suggested date">Reset</button>
        </span>
      </label>`;

    const modal = document.createElement('div');
    modal.id = 'dc-modal';
    modal.className = 'dc-modal';
    modal.innerHTML = `
      <div class="dc-card" role="dialog" aria-modal="true" aria-label="Update dependent dates">
        <div class="dc-hd">
          <div>
            <div class="dc-title">Move dependent collections too?</div>
            <div class="dc-sub">These collections are scheduled around ${edited.name}. Tick the ones that should move with it; unticked collections keep their current dates. Nothing changes until you confirm.</div>
          </div>
          <button class="dc-x" title="Discard the date change entirely" aria-label="Close">${icon('x')}</button>
        </div>
        <div class="dc-edit-summary">
          <span class="dc-row-ic">${icon(edited.type)}</span>
          <span class="dc-es-name">${edited.name}</span>
          ${edited.count ? `<span class="dc-es-meta">${edited.count} option${String(edited.count) === '1' ? '' : 's'}</span>` : ''}
          <span class="dc-row-dates">
            <span class="dc-old">${shortRange(edited.s0, edited.e0)}</span>
            <span class="dc-arrow">→</span>
            <span class="dc-new">${shortRange(edited.s1, edited.e1)}</span>
          </span>
          ${deltaBits.length ? `<span class="dc-delta">${deltaBits.join(', ')}</span>` : ''}
        </div>
        <div class="dc-trip-banner" id="dc-trip-banner"></div>
        <div class="dc-body">
          <div class="dc-caps">
            <span>Affected collections (${deps.length}) · <span id="dc-selcount">0 selected</span></span>
            <span class="dc-caps-actions">
              <button class="dc-selall" id="dc-selall">Select all</button>
              <button class="dc-selall" id="dc-clear">Clear</button>
            </span>
          </div>
          <div class="dc-bulk">
            <span>Shift all selected by</span>
            <input type="number" class="dc-bulk-n" id="dc-bulk-n" step="1" value="${dEnd || dStart}">
            <span>days</span>
            <button type="button" class="af-btn af-btn-outline af-btn-sm" id="dc-bulk-apply">Apply</button>
            <span class="dc-bulk-hint">overrides the suggested dates for every ticked row</span>
          </div>
          <div class="dc-rows">${deps.map(row).join('')}</div>
          ${unaffectedLine ? `<div class="dc-unaffected">${unaffectedLine}</div>` : ''}
        </div>
        <div class="dc-foot">
          <button class="af-btn af-btn-ghost" data-cancel title="Discard the date change entirely; nothing moves">Cancel</button>
          <div class="dc-spacer"></div>
          <button class="af-btn af-btn-primary" data-apply></button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('dc-open'));

    const applyBtn = modal.querySelector('[data-apply]');
    const selAllBtn = modal.querySelector('#dc-selall');
    const clearBtn = modal.querySelector('#dc-clear');
    const selCount = modal.querySelector('#dc-selcount');
    const banner = modal.querySelector('#dc-trip-banner');
    const bulkN = modal.querySelector('#dc-bulk-n');
    const bulkApply = modal.querySelector('#dc-bulk-apply');
    const cbs = [...modal.querySelectorAll('.dc-cb')];
    const rowEls = [...modal.querySelectorAll('.dc-row')];

    const refresh = () => {
      deps.forEach((d, i) => { d.selected = cbs[i].checked; });
      const n = deps.filter((d) => d.selected).length;
      selCount.textContent = `${n} selected`;
      applyBtn.textContent = n === 0 ? `Move only ${edited.name}` : `Move ${edited.name} + shift ${n}`;
      applyBtn.title = n === 0
        ? `Moves only ${edited.name}; all ${deps.length} listed collections keep their current dates`
        : `Moves ${edited.name} and shifts the ${n} ticked collection${n === 1 ? '' : 's'}`;
      bulkApply.disabled = n === 0;
      bulkN.disabled = n === 0;
      rowEls.forEach((rowEl, i) => {
        const d = deps[i];
        rowEl.classList.toggle('dc-unticked', !d.selected);
        rowEl.classList.toggle('dc-manual', d.manual);
        rowEl.querySelector('.dc-new').textContent = shortRange(d.newStart, d.newEnd);
        // conflicts: check the date that will actually be true after apply —
        // the kept current date for unticked rows, the custom date when edited
        const msg = !d.selected ? conflictFor(d, edited, d.start)
          : (d.manual ? conflictFor(d, edited, d.newStart) : '');
        const warnEl = rowEl.querySelector('.dc-row-warn');
        warnEl.innerHTML = msg ? `${icon('x', 'width="10" height="10"')} ${msg}` : '';
        rowEl.classList.toggle('dc-conflict', !!msg);
      });
      const { cur, next } = tripPreview(registry, edited, deps, baseTrip);
      if (cur.min && next.min && (cur.min !== next.min || cur.max !== next.max)) {
        const curLen = diffDays(cur.min, cur.max), nextLen = diffDays(next.min, next.max);
        const verb = nextLen > curLen ? 'extends' : nextLen < curLen ? 'shortens' : 'moves';
        banner.innerHTML = `${icon('cal', 'width="13" height="13"')} <span>Trip ${verb}: <s>${shortRange(cur.min, cur.max)}</s> → <b>${shortRange(next.min, next.max)}</b></span>`;
        banner.classList.add('dc-on');
      } else {
        banner.classList.remove('dc-on');
        banner.innerHTML = '';
      }
    };
    cbs.forEach((cb) => cb.addEventListener('change', refresh));
    selAllBtn.addEventListener('click', () => { cbs.forEach((cb) => { cb.checked = true; }); refresh(); });
    clearBtn.addEventListener('click', () => { cbs.forEach((cb) => { cb.checked = false; }); refresh(); });

    // per-row custom date: click the proposal -> inline date input
    rowEls.forEach((rowEl, i) => {
      const d = deps[i];
      rowEl.querySelector('.dc-new').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        if (rowEl.querySelector('.dc-new-input')) return;
        const btn = rowEl.querySelector('.dc-new');
        const inp = document.createElement('input');
        inp.type = 'date'; inp.className = 'dc-new-input'; inp.value = d.newStart;
        btn.style.display = 'none';
        btn.insertAdjacentElement('afterend', inp);
        inp.focus();
        let finished = false;
        const done = (commit) => {
          if (finished) return; finished = true;
          if (commit && inp.value) {
            const dur = diffDays(d.start, d.end);
            d.newStart = inp.value; d.newEnd = addDays(inp.value, dur);
            d.manual = true;
            cbs[i].checked = true; // you set a date, so this row is moving
          }
          inp.remove(); btn.style.display = '';
          refresh();
        };
        inp.addEventListener('change', () => done(true));
        inp.addEventListener('blur', () => done(false));
        inp.addEventListener('keydown', (ev) => {
          ev.stopPropagation();
          if (ev.key === 'Escape') done(false);
          if (ev.key === 'Enter') done(true);
        });
        inp.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); });
      });
      rowEl.querySelector('.dc-reset').addEventListener('click', (e) => {
        e.preventDefault(); e.stopPropagation();
        d.newStart = d.sysStart; d.newEnd = d.sysEnd;
        d.manual = false;
        refresh();
      });
    });

    // bulk shift: override every ticked row's proposal with a uniform delta
    bulkApply.addEventListener('click', () => {
      const nDays = parseInt(bulkN.value, 10);
      if (isNaN(nDays)) return;
      deps.forEach((d) => {
        if (!d.selected) return;
        d.newStart = addDays(d.start, nDays);
        d.newEnd = addDays(d.end, nDays);
        d.manual = !(d.newStart === d.sysStart && d.newEnd === d.sysEnd);
      });
      refresh();
    });
    bulkN.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') bulkApply.click(); });

    refresh();

    const destroy = () => { modal.classList.remove('dc-open'); setTimeout(() => modal.remove(), 180); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') { destroy(); AF().toast && AF().toast('No changes applied'); } };
    document.addEventListener('keydown', onKey);
    modal.addEventListener('click', (e) => { if (e.target === modal) { destroy(); AF().toast && AF().toast('No changes applied'); } });
    modal.querySelector('.dc-x').addEventListener('click', () => { destroy(); AF().toast && AF().toast('No changes applied'); });

    modal.querySelector('[data-cancel]').addEventListener('click', () => { destroy(); AF().toast && AF().toast('No changes applied'); });
    applyBtn.addEventListener('click', () => {
      applyToSelf();
      const moved = deps.filter((d) => d.selected);
      moved.forEach((d) => {
        if (!d.chip || !d.chip.isConnected) return;
        d.chip.dataset.start = d.newStart; d.chip.dataset.end = d.newEnd;
        d.chip.innerHTML = `${icon('cal', 'width="11" height="11"')} ${AF().rangeLabel(d.newStart, d.newEnd)}`;
      });
      AF().computeTrip && AF().computeTrip();
      const kept = deps.length - moved.length;
      AF().toast && AF().toast(moved.length
        ? `Moved ${edited.name} · shifted ${plural(moved.length, 'collection')}${kept ? ` · ${kept} kept` : ''}`
        : `Moved ${edited.name} · all ${plural(kept, 'dependent')} kept their dates`);
      destroy();
      if (onDone) onDone(moved.length ? 'shift' : 'keep');
    });
  }

  // Conflict semantics depend on the dependency class:
  // - 'within' items belong INSIDE the edited collection's new span; they
  //   conflict when the checked date falls outside it.
  // - 'anchor'/'after' items belong at or beyond the boundaries; they
  //   conflict when the checked date lands inside the new span (overlap).
  // Returns a message, or '' when there is no conflict.
  function conflictFor(d, edited, dateYMD) {
    const s1 = edited.s1, e1 = edited.e1 || edited.s1;
    const inSpan = dateYMD >= s1 && dateYMD < e1;
    if (d.cls === 'within') {
      return inSpan ? '' : `Falls outside the new ${edited.shortName} dates (${shortRange(s1, e1)})`;
    }
    return inSpan ? `Overlaps the new ${edited.shortName} dates (${shortRange(s1, e1)})` : '';
  }

  function summarizeNames(list) {
    const names = {};
    list.forEach((k) => { names[k.name] = (names[k.name] || 0) + 1; });
    return Object.entries(names).map(([n, c]) => (c > 1 ? `${n} ×${c}` : n)).join(', ');
  }

  function shortName(name) {
    return (name || '').replace(/,?\s*(Thailand|Hotels|Hotel)\s*/gi, ' ').trim() || name;
  }

  /* ---- entry point from add-flow.js (Edit Collection save) ---- */
  function onCollectionDateSave({ name, type, dateEl, newStart, newEnd, applyToSelf }) {
    const s0 = dateEl.dataset.start, e0 = dateEl.dataset.end || dateEl.dataset.start;
    if (s0 === newStart && e0 === newEnd) { AF().close && AF().close(); return; }
    const registry = scan();
    const self = registry.find((k) => k.chip === dateEl) || {};
    const edited = { name, shortName: shortName(name), type, chip: dateEl, s0, e0, s1: newStart, e1: newEnd, count: self.count, city: self.city };
    const deps = computeDependents(edited, registry);
    if (!deps.length) {
      applyToSelf();
      AF().toast && AF().toast(`Moved ${name} to ${AF().rangeLabel(newStart, newEnd)} · no dependent collections affected`);
      return;
    }
    openCascadeModal({ edited, deps, registry, applyToSelf });
  }

  /* ---- demo seeds: flight + transfer COLLECTIONS the snapshot doesn't
     have. Same model as every other collection: a named group holding
     multiple component options, with one date chip at collection level. ---- */
  function seedCard({ name, type, city, count, sub, start, end }) {
    const card = document.createElement('div');
    card.className = 'dc-seed-card';
    card.innerHTML = `
      <span class="dc-seed-ic">${icon(type)}</span>
      <span class="dc-seed-main">
        <span class="dc-seed-title">${name}</span>
        <span class="dc-seed-sub">${sub}</span>
      </span>
      <span class="dc-seed-count">${count} option${count === 1 ? '' : 's'}</span>
      <span class="af-coll-date" data-start="${start}" data-end="${end || start}" data-dc-name="${name}" data-dc-type="${type}" data-dc-city="${city}" data-dc-count="${count}">${icon('cal', 'width="11" height="11"')} ${AF().rangeLabel(start, end || start)}</span>
      <button type="button" class="af-edit-coll" title="Edit ${name} (move dates)">${icon('pencilSm', 'width="13" height="13"')}</button>`;
    const chip = card.querySelector('.af-coll-date');
    card.querySelector('.af-edit-coll').addEventListener('click', () => {
      AF().open({ mode: 'editCollection', type, collection: name, start: chip.dataset.start, end: chip.dataset.end, dateEl: chip });
    });
    return card;
  }

  function seedDemo() {
    const registry = scan();
    if (!registry.length) return; // not the trip page (e.g. test harness)

    // 1. Give hotel stays a real range: each stay runs to the next stay's
    //    check-in; the last one gets 2 nights (CON-810: components inherit).
    const hotels = registry.filter((k) => k.type === 'hotels').sort((a, b) => (a.start < b.start ? -1 : 1));
    hotels.forEach((h, i) => {
      const end = hotels[i + 1] ? hotels[i + 1].start : addDays(h.start, 2);
      h.chip.dataset.end = end;
      h.chip.innerHTML = `${icon('cal', 'width="11" height="11"')} ${AF().rangeLabel(h.chip.dataset.start, end)}`;
    });

    // 2. Seed flight + transfer collections (none exist in the snapshot).
    if (hotels.length) {
      const first = hotels[0];
      const firstSec = first.chip.closest('section');
      if (firstSec) {
        firstSec.appendChild(seedCard({ name: 'Bangkok Arrival Flights', type: 'flights', city: 'Bangkok', count: 3, sub: 'LAX → BKK · Thai Airways, Qatar Airways, EVA options', start: first.start }));
        firstSec.appendChild(seedCard({ name: 'Bangkok Airport Transfers', type: 'transfers', city: 'Bangkok', count: 2, sub: 'Airport to hotel · private car and luxury van options', start: first.start }));
      }
      const second = hotels[1];
      if (second) {
        const secondSec = second.chip.closest('section');
        if (secondSec) {
          secondSec.appendChild(seedCard({ name: 'Bangkok to Chiang Mai Flights', type: 'flights', city: 'Chiang Mai', count: 3, sub: 'BKK → CNX · morning and midday options', start: second.start }));
          secondSec.appendChild(seedCard({ name: 'Chiang Mai Airport Transfers', type: 'transfers', city: 'Chiang Mai', count: 1, sub: 'Airport to hotel · private car', start: second.start }));
        }
      }
    }
    AF().computeTrip && AF().computeTrip();
  }

  /* ---- isolated harness support (test-cascade.html) ---- */
  function demoEntry(name, type, start, end, city, count) {
    const chip = document.createElement('span'); // detached; carries dates only
    chip.dataset.start = start; chip.dataset.end = end || start;
    return { name, type, chip, start, end: end || start, city: city || cityOf(name), count: count || '' };
  }
  function openDemo(scenario) {
    const bkk = demoEntry('Bangkok, Thailand Hotels', 'hotels', '2024-05-24', '2024-05-27', 'Bangkok', 4);
    const cnx = demoEntry('Chiang Mai, Thailand Hotels', 'hotels', '2024-05-27', '2024-05-29', 'Chiang Mai', 4);
    const interFlight = demoEntry('Bangkok to Chiang Mai Flights', 'flights', '2024-05-27', '', 'Chiang Mai', 3);
    const registry = [
      bkk,
      demoEntry('Bangkok Arrival Flights', 'flights', '2024-05-24', '', 'Bangkok', 3),
      demoEntry('Bangkok Airport Transfers', 'transfers', '2024-05-24', '', 'Bangkok', 2),
      demoEntry('Bangkok Experiences', 'experiences', '2024-05-24', '', 'Bangkok', 5),
      demoEntry('Bangkok Dining', 'dining', '2024-05-25', '', 'Bangkok', 4),
      demoEntry('Bangkok Dining', 'dining', '2024-05-26', '', 'Bangkok', 4),
      interFlight,
      demoEntry('Chiang Mai Airport Transfers', 'transfers', '2024-05-27', '', 'Chiang Mai', 1),
      cnx,
      demoEntry('Chiang Mai Dining', 'dining', '2024-05-27', '', 'Chiang Mai', 2),
    ];
    const baseTrip = { min: '2024-05-24', max: '2024-05-29' };
    const noop = () => {};
    if (scenario === 'none') {
      onCollectionDateSaveDemo(registry, { name: 'Bangkok Dining', shortName: 'Bangkok Dining', type: 'dining', chip: registry[4].chip, s0: '2024-05-25', e0: '2024-05-25', s1: '2024-05-26', e1: '2024-05-26' });
      return;
    }
    let edited;
    if (scenario === 'shift') {
      edited = { name: bkk.name, shortName: shortName(bkk.name), type: 'hotels', chip: bkk.chip, s0: bkk.start, e0: bkk.end, s1: '2024-05-25', e1: '2024-05-28', count: bkk.count, city: bkk.city };
    } else if (scenario === 'flight') {
      edited = { name: interFlight.name, shortName: shortName(interFlight.name), type: 'flights', chip: interFlight.chip, s0: interFlight.start, e0: interFlight.end, s1: '2024-05-28', e1: '2024-05-28', count: interFlight.count, city: interFlight.city };
    } else {
      edited = { name: bkk.name, shortName: shortName(bkk.name), type: 'hotels', chip: bkk.chip, s0: bkk.start, e0: bkk.end, s1: bkk.start, e1: '2024-05-29', count: bkk.count, city: bkk.city };
    }
    const deps = computeDependents(edited, registry);
    openCascadeModal({ edited, deps, registry, applyToSelf: noop, baseTrip });
  }
  function onCollectionDateSaveDemo(registry, edited) {
    const deps = computeDependents(edited, registry);
    if (!deps.length) {
      AF().toast && AF().toast(`Moved ${edited.name} to ${AF().rangeLabel(edited.s1, edited.e1)} · no dependent collections affected`);
      return;
    }
    openCascadeModal({ edited, deps, registry, applyToSelf: () => {}, baseTrip: { min: '2024-05-24', max: '2024-05-29' } });
  }

  window.DateCascade = { onCollectionDateSave, openDemo };

  function init() { seedDemo(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
