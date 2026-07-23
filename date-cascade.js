/* ============================================================
   Cross-collection date cascade (CON-1626) — v3
   Injected on top of the Conductor dev-build snapshot,
   alongside add-flow.js (which exposes window.AF).

   Dates live at collection level (CON-810: components inherit),
   so the cascade is collection-to-collection. Advisor-facing
   copy says "other items" (Dustin, Jul 22).

   Entry points (all converge on the same prompt):
   1. Inline date pills on every collection header (prod
      parity: each single pill change fires immediately).
   2. The Edit Collection modal (prod parity: batched, applies
      on "Save changes").
   3. Dragging a hotel/flight on the calendar page
      (dc-calendar.js drives, via DateCascade.promptMove).

   Locked behavior from intake:
   - Prompt the advisor, preview every resulting date, no
     silent auto-move. Nothing is pre-selected (opt-in).
   - After confirm: availability + rates re-scan on moved
     items (prod-style "Updating your collection" card);
     manually entered items are excluded.

   Demo dependency rules (proposal, per Dustin's Jul 22
   comment: hotels are the main anchor; transfers-on-flights
   also cascade):
   - STAY edited: boundary flights/transfers re-anchor,
     day-anchored items inside shift with check-in, everything
     after check-out follows the check-out delta.
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
  function dayLabel(ymd) { return parseYMD(ymd).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }

  const AF = () => window.AF || {};
  function icon(type, opts) { const I = AF().IC || {}; return AF().S ? AF().S(I[type] || I.cal, opts || 'width="14" height="14"') : ''; }

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
  function chipEntry(chip) {
    const name = nameOfChip(chip);
    const type = chip.dataset.dcType || AF().inferType(name);
    const countEl = chip.previousElementSibling;
    const count = chip.dataset.dcCount || ((countEl && ((countEl.textContent || '').match(/(\d+)\s*option/) || [])[1]) || '');
    const city = chip.dataset.dcCity || cityOf(name);
    const manualEntry = chip.dataset.dcManual === '1';
    return { name, type, chip, count, city, manualEntry, start: chip.dataset.start, end: chip.dataset.end || chip.dataset.start };
  }
  function scan() {
    return [...document.querySelectorAll('.af-coll-date')].map(chipEntry).filter((c) => c.start);
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
    // Transfers, dining, experiences, notes: leaves in the dependency tree.
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

  /* ---- conflict semantics (class-aware) ---- */
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

  /* ---- re-pricing progress card (prod parity: collection-reschedule) ---- */
  // items: moved collections; manually entered ones are skipped (Dustin,
  // Jul 22: rescan availability/rates only on non-manually-entered items).
  function showReprice(items, done) {
    const list = (items || []).filter((x) => x && !x.manualEntry);
    if (!list.length) { if (done) done(); return; }
    const existing = document.getElementById('dc-reprice');
    if (existing) existing.remove();
    const card = document.createElement('div');
    card.id = 'dc-reprice';
    card.className = 'dc-reprice';
    card.innerHTML = `
      <span class="dc-rp-ic">${icon('sparkles', 'width="16" height="16"')}</span>
      <span class="dc-rp-main">
        <span class="dc-rp-title">Updating your collection <span class="dc-rp-spin"></span></span>
        <span class="dc-rp-sub" id="dc-rp-sub"></span>
        <span class="dc-rp-status">Re-pricing options...</span>
      </span>`;
    document.body.appendChild(card);
    requestAnimationFrame(() => card.classList.add('dc-on'));
    const sub = card.querySelector('#dc-rp-sub');
    let i = 0;
    const step = () => {
      if (i >= list.length) {
        card.classList.remove('dc-on');
        setTimeout(() => { card.remove(); if (done) done(); }, 200);
        return;
      }
      const it = list[i];
      const s = it.newStart || it.s1 || it.start, e = it.newEnd || it.e1 || it.end;
      const nights = it.type === 'hotels' ? diffDays(s, e) : 0;
      sub.textContent = `${it.city || it.name} · ${AF().rangeLabel(s, e)}${nights > 0 ? ` · ${plural(nights, 'night')}` : ''}`;
      i += 1;
      setTimeout(step, 1000);
    };
    step();
  }

  /* ---- the cascade prompt ---- */
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
      ? `${plural(unaffected.length, 'item')} before the change keep${unaffected.length === 1 ? 's' : ''} their dates (${summarizeNames(unaffected)}).`
      : '';

    const meta = (d) => {
      const bits = [];
      if (d.city) bits.push(d.city);
      if (d.count) bits.push(`${d.count} option${String(d.count) === '1' ? '' : 's'}`);
      if (d.manualEntry) bits.push('manual entry, rates not re-checked');
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
      <div class="dc-card" role="dialog" aria-modal="true" aria-label="Move other items too">
        <div class="dc-hd">
          <div>
            <div class="dc-title">Move other items too?</div>
            <div class="dc-sub">These items are scheduled around ${edited.name}. Tick the ones that should move with it; unticked items keep their current dates. Nothing changes until you confirm.</div>
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
            <span class="dc-new-static">${shortRange(edited.s1, edited.e1)}</span>
          </span>
          ${deltaBits.length ? `<span class="dc-delta">${deltaBits.join(', ')}</span>` : ''}
        </div>
        <div class="dc-trip-banner" id="dc-trip-banner"></div>
        <div class="dc-body">
          <div class="dc-caps">
            <span>Affected items (${deps.length}) · <span id="dc-selcount">0 selected</span></span>
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
          <div class="dc-rescan-note">${icon('shield', 'width="11" height="11"')} Availability and rates re-check automatically on everything that moves. Manually entered items keep their entered rates.</div>
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
        ? `Moves only ${edited.name}; all ${deps.length} listed items keep their current dates`
        : `Moves ${edited.name} and shifts the ${n} ticked item${n === 1 ? '' : 's'}`;
      bulkApply.disabled = n === 0;
      bulkN.disabled = n === 0;
      rowEls.forEach((rowEl, i) => {
        const d = deps[i];
        rowEl.classList.toggle('dc-unticked', !d.selected);
        rowEl.classList.toggle('dc-manual', d.manual);
        rowEl.querySelector('.dc-new').textContent = shortRange(d.newStart, d.newEnd);
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
    const onKey = (e) => { if (e.key === 'Escape') { destroy(); AF().toast && AF().toast('No changes applied'); if (onDone) onDone('cancel'); } };
    document.addEventListener('keydown', onKey);
    modal.addEventListener('click', (e) => { if (e.target === modal) { destroy(); AF().toast && AF().toast('No changes applied'); if (onDone) onDone('cancel'); } });
    modal.querySelector('.dc-x').addEventListener('click', () => { destroy(); AF().toast && AF().toast('No changes applied'); if (onDone) onDone('cancel'); });
    modal.querySelector('[data-cancel]').addEventListener('click', () => { destroy(); AF().toast && AF().toast('No changes applied'); if (onDone) onDone('cancel'); });

    applyBtn.addEventListener('click', () => {
      applyToSelf();
      const moved = deps.filter((d) => d.selected);
      moved.forEach((d) => {
        if (!d.chip) return;
        d.chip.dataset.start = d.newStart; d.chip.dataset.end = d.newEnd;
        if (d.chip.isConnected) renderChip(d.chip);
      });
      AF().computeTrip && AF().computeTrip();
      const kept = deps.length - moved.length;
      const summary = moved.length
        ? `Moved ${edited.name} · shifted ${plural(moved.length, 'item')}${kept ? ` · ${kept} kept` : ''}`
        : `Moved ${edited.name} · all ${plural(kept, 'item')} kept their dates`;
      destroy();
      showReprice([edited, ...moved], () => { AF().toast && AF().toast(summary); });
      if (onDone) onDone(moved.length ? 'shift' : 'keep');
    });
  }

  /* ---- shared entry: any date move on any surface ---- */
  // entry = registry entry for the edited collection; newStart/newEnd = the
  // proposed dates. Runs the dependency check, prompts when other items are
  // affected, otherwise applies directly. Re-pricing card runs after apply.
  function promptMove({ entry, newStart, newEnd, registry, baseTrip, applyToSelf, onDone }) {
    if (entry.start === newStart && entry.end === newEnd) { if (onDone) onDone('noop'); return; }
    const edited = {
      name: entry.name, shortName: shortName(entry.name), type: entry.type, chip: entry.chip,
      s0: entry.start, e0: entry.end, s1: newStart, e1: newEnd,
      count: entry.count, city: entry.city, manualEntry: entry.manualEntry,
    };
    const apply = applyToSelf || (() => {
      entry.chip.dataset.start = newStart; entry.chip.dataset.end = newEnd;
      if (entry.chip.isConnected) renderChip(entry.chip);
    });
    const deps = computeDependents(edited, registry);
    if (!deps.length) {
      apply();
      AF().computeTrip && AF().computeTrip();
      showReprice([edited], () => {
        AF().toast && AF().toast(`Moved ${entry.name} to ${AF().rangeLabel(newStart, newEnd)} · no other items affected`);
      });
      if (onDone) onDone('none');
      return;
    }
    openCascadeModal({ edited, deps, registry, applyToSelf: apply, baseTrip, onDone });
  }

  /* ---- entry point 1: inline date pills on collection headers ---- */
  function renderChip(chip) {
    const s = chip.dataset.start, e = chip.dataset.end || s;
    chip.classList.add('dc-pills');
    chip.innerHTML = `
      <button type="button" class="dc-pill" data-which="start" title="Change the start date">${icon('cal', 'width="11" height="11"')} <span>${AF().fromYMD(s)}</span></button>
      <button type="button" class="dc-pill" data-which="end" title="Change the end date">${icon('cal', 'width="11" height="11"')} <span>${AF().fromYMD(e)}</span></button>`;
    chip.querySelectorAll('.dc-pill').forEach((pill) => {
      pill.addEventListener('click', (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        beginPillEdit(chip, pill.dataset.which);
      });
    });
  }

  function beginPillEdit(chip, which) {
    if (chip.querySelector('.dc-pill-input')) return;
    const pill = chip.querySelector(`.dc-pill[data-which="${which}"]`);
    const inp = document.createElement('input');
    inp.type = 'date'; inp.className = 'dc-pill-input';
    inp.value = which === 'start' ? chip.dataset.start : (chip.dataset.end || chip.dataset.start);
    pill.style.display = 'none';
    pill.insertAdjacentElement('afterend', inp);
    inp.focus();
    let finished = false;
    const done = (commit) => {
      if (finished) return; finished = true;
      const v = inp.value;
      inp.remove(); pill.style.display = '';
      if (!commit || !v) return;
      const s0 = chip.dataset.start, e0 = chip.dataset.end || s0;
      let ns = s0, ne = e0;
      if (which === 'start') { ns = v; if (ne < ns) ne = ns; }
      else { ne = v; if (ns > ne) ns = ne; }
      if (ns === s0 && ne === e0) return;
      // prod parity: a single pill change fires the flow immediately
      promptMove({ entry: chipEntry(chip), newStart: ns, newEnd: ne, registry: scan() });
    };
    inp.addEventListener('change', () => done(true));
    inp.addEventListener('blur', () => done(false));
    inp.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape') done(false);
      if (ev.key === 'Enter') done(true);
    });
    inp.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); });
  }

  /* ---- entry point 2: Edit Collection modal (prod parity) ---- */
  function openEditModal({ collection, type, start, end, dateEl }) {
    const existing = document.getElementById('dc-edit');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.id = 'dc-edit';
    modal.className = 'dc-modal';
    const stepper = (label, val) => `
      <div class="dc-ep-field">
        <div class="dc-ep-label">${label}</div>
        <div class="dc-ep-stepper"><button type="button" class="dc-ep-btn">−</button><span class="dc-ep-val">${val}</span><button type="button" class="dc-ep-btn">+</button></div>
      </div>`;
    modal.innerHTML = `
      <div class="dc-card dc-edit-card" role="dialog" aria-modal="true" aria-label="Edit Collection">
        <div class="dc-hd">
          <div class="dc-title">Edit Collection</div>
          <button class="dc-x dc-x-round" aria-label="Close">${icon('x', 'width="13" height="13"')}</button>
        </div>
        <div class="dc-edit-body">
          <label class="dc-e-caps" for="dc-en">Collection Name</label>
          <input class="dc-e-input" id="dc-en" maxlength="120" value="${(collection || '').replace(/"/g, '&quot;')}">
          <label class="dc-e-caps">Dates</label>
          <div class="dc-e-dates">
            <span class="dc-e-datewrap">${icon('cal', 'width="12" height="12"')}<input type="date" class="dc-e-date" id="dc-es" value="${start || ''}"></span>
            <span class="dc-e-datewrap">${icon('cal', 'width="12" height="12"')}<input type="date" class="dc-e-date" id="dc-ee" value="${end || start || ''}"></span>
          </div>
          <p class="dc-e-help">Changing the date re-prices this collection and may extend the trip.</p>
          <div class="dc-ep-grid">${stepper('Adults', 1)}${stepper('Children', 0)}${stepper('Infants', 0)}</div>
        </div>
        <div class="dc-foot dc-edit-foot">
          <button class="af-btn af-btn-ghost" data-cancel>Cancel</button>
          <button class="af-btn af-btn-primary" data-save>Save changes</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('dc-open'));

    const sI = modal.querySelector('#dc-es'), eI = modal.querySelector('#dc-ee'), nI = modal.querySelector('#dc-en');
    sI.addEventListener('change', () => { if (eI.value && eI.value < sI.value) eI.value = sI.value; });
    modal.querySelectorAll('.dc-ep-btn').forEach((b) => b.addEventListener('click', () => {
      const val = b.parentElement.querySelector('.dc-ep-val');
      let n = parseInt(val.textContent, 10) + (b.textContent === '+' ? 1 : -1);
      if (n < 0) n = 0;
      val.textContent = n;
    }));

    const destroy = () => { modal.classList.remove('dc-open'); setTimeout(() => modal.remove(), 180); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') destroy(); };
    document.addEventListener('keydown', onKey);
    modal.addEventListener('click', (e) => { if (e.target === modal) destroy(); });
    modal.querySelector('.dc-x').addEventListener('click', destroy);
    modal.querySelector('[data-cancel]').addEventListener('click', destroy);

    modal.querySelector('[data-save]').addEventListener('click', () => {
      const newName = nI.value.trim();
      if (newName && dateEl && newName !== collection) {
        if (dateEl.dataset.dcName) dateEl.dataset.dcName = newName;
        const countEl = dateEl.previousElementSibling;
        const titleEl = countEl && countEl.previousElementSibling;
        if (titleEl && !dateEl.dataset.dcName) titleEl.textContent = newName;
        const seedTitle = dateEl.closest('.dc-seed-card') && dateEl.closest('.dc-seed-card').querySelector('.dc-seed-title');
        if (seedTitle) seedTitle.textContent = newName;
      }
      const ns = sI.value, ne = eI.value || sI.value;
      destroy();
      // prod parity: the modal batches, dates apply on Save
      promptMove({ entry: chipEntry(dateEl), newStart: ns, newEnd: ne, registry: scan() });
    });
  }

  /* ---- demo seeds: flight + transfer COLLECTIONS the snapshot doesn't
     have. Same model as every other collection: a named group holding
     multiple component options, with one date chip at collection level. ---- */
  function seedCard({ name, type, city, count, sub, start, end, manualEntry }) {
    const card = document.createElement('div');
    card.className = 'dc-seed-card';
    card.innerHTML = `
      <span class="dc-seed-ic">${icon(type)}</span>
      <span class="dc-seed-main">
        <span class="dc-seed-title">${name}</span>
        <span class="dc-seed-sub">${sub}</span>
      </span>
      <span class="dc-seed-count">${count} option${count === 1 ? '' : 's'}</span>
      <span class="af-coll-date" data-start="${start}" data-end="${end || start}" data-dc-name="${name}" data-dc-type="${type}" data-dc-city="${city}" data-dc-count="${count}"${manualEntry ? ' data-dc-manual="1"' : ''}></span>
      <button type="button" class="af-edit-coll" title="Edit ${name}">${icon('pencilSm', 'width="13" height="13"')}</button>`;
    const chip = card.querySelector('.af-coll-date');
    renderChip(chip);
    card.querySelector('.af-edit-coll').addEventListener('click', () => {
      openEditModal({ collection: nameOfChip(chip), type, start: chip.dataset.start, end: chip.dataset.end, dateEl: chip });
    });
    return card;
  }

  function seedDemo() {
    const registry = scan();
    if (!registry.length) return; // not the trip page (e.g. test harness / calendar)

    // 1. Give hotel stays a real range: each stay runs to the next stay's
    //    check-in; the last one gets 2 nights (CON-810: components inherit).
    const hotels = registry.filter((k) => k.type === 'hotels').sort((a, b) => (a.start < b.start ? -1 : 1));
    hotels.forEach((h, i) => {
      const end = hotels[i + 1] ? hotels[i + 1].start : addDays(h.start, 2);
      h.chip.dataset.end = end;
    });

    // 2. Render every chip as prod-style inline date pills (entry point 1).
    registry.forEach((k) => renderChip(k.chip));

    // 3. Seed flight + transfer collections (none exist in the snapshot).
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
          secondSec.appendChild(seedCard({ name: 'Chiang Mai Airport Transfers', type: 'transfers', city: 'Chiang Mai', count: 1, sub: 'Airport to hotel · private car · entered manually', start: second.start, manualEntry: true }));
        }
      }
      // 4. Calendar view link (entry point 3 lives on calendar.html).
      const firstSecEl = first.chip.closest('section');
      if (firstSecEl && firstSecEl.parentElement && !document.getElementById('dc-cal-link')) {
        const link = document.createElement('a');
        link.id = 'dc-cal-link';
        link.className = 'dc-cal-link';
        link.href = 'calendar.html';
        link.innerHTML = `${icon('cal', 'width="13" height="13"')} Calendar view · drag a stay to move it`;
        firstSecEl.parentElement.insertBefore(link, firstSecEl);
      }
    }
    AF().computeTrip && AF().computeTrip();
  }

  /* ---- shared demo trip (harness + calendar) ---- */
  function demoEntry(name, type, start, end, city, count, manualEntry) {
    const chip = document.createElement('span'); // detached; carries dates only
    chip.dataset.start = start; chip.dataset.end = end || start;
    return { name, type, chip, start, end: end || start, city: city || cityOf(name), count: count || '', manualEntry: !!manualEntry };
  }
  function demoRegistry() {
    const list = [
      demoEntry('Bangkok, Thailand Hotels', 'hotels', '2024-05-24', '2024-05-27', 'Bangkok', 4),
      demoEntry('Bangkok Arrival Flights', 'flights', '2024-05-24', '', 'Bangkok', 3),
      demoEntry('Bangkok Airport Transfers', 'transfers', '2024-05-24', '', 'Bangkok', 2),
      demoEntry('Bangkok Experiences', 'experiences', '2024-05-24', '', 'Bangkok', 5),
      demoEntry('Bangkok Dining', 'dining', '2024-05-25', '', 'Bangkok', 4),
      demoEntry('Bangkok Dining', 'dining', '2024-05-26', '', 'Bangkok', 4),
      demoEntry('Bangkok to Chiang Mai Flights', 'flights', '2024-05-27', '', 'Chiang Mai', 3),
      demoEntry('Chiang Mai Airport Transfers', 'transfers', '2024-05-27', '', 'Chiang Mai', 1, true),
      demoEntry('Chiang Mai, Thailand Hotels', 'hotels', '2024-05-27', '2024-05-29', 'Chiang Mai', 4),
      demoEntry('Chiang Mai Dining', 'dining', '2024-05-27', '', 'Chiang Mai', 2),
    ];
    // dining renders as timed chips on the calendar, like prod
    const times = ['7:30 PM', '8:00 PM', '7:00 PM'];
    list.filter((k) => k.type === 'dining').forEach((k, i) => { k.time = times[i % times.length]; });
    return list;
  }

  /* ---- isolated harness support (test-cascade.html) ---- */
  function openDemo(scenario) {
    const registry = demoRegistry();
    const byName = (n, i) => registry.filter((k) => k.name === n)[i || 0];
    const bkk = byName('Bangkok, Thailand Hotels');
    const interFlight = byName('Bangkok to Chiang Mai Flights');
    const baseTrip = { min: '2024-05-24', max: '2024-05-29' };
    if (scenario === 'none') {
      const dine = byName('Bangkok Dining');
      promptMove({ entry: dine, newStart: '2024-05-26', newEnd: '2024-05-26', registry, baseTrip, applyToSelf: () => {} });
      return;
    }
    let entry = bkk, ns, ne;
    if (scenario === 'shift') { ns = '2024-05-25'; ne = '2024-05-28'; }
    else if (scenario === 'flight') { entry = interFlight; ns = '2024-05-28'; ne = '2024-05-28'; }
    else { ns = bkk.start; ne = '2024-05-29'; }
    promptMove({ entry, newStart: ns, newEnd: ne, registry, baseTrip, applyToSelf: () => {} });
  }

  window.DateCascade = {
    onCollectionDateSave: function ({ name, type, dateEl, newStart, newEnd }) {
      // legacy add-flow save path; kept for compatibility
      promptMove({ entry: chipEntry(dateEl), newStart, newEnd, registry: scan() });
    },
    openDemo, openEditModal, promptMove, renderChip, demoRegistry, computeDependents, showReprice,
    util: { addDays, diffDays, shortDate, shortRange, dayLabel, plural, icon, shortName, cityOf },
  };

  function init() { seedDemo(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
