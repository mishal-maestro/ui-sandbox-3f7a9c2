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
  function scan() {
    return [...document.querySelectorAll('.af-coll-date')].map((chip) => {
      const name = nameOfChip(chip);
      const type = chip.dataset.dcType || AF().inferType(name);
      return { name, type, chip, start: chip.dataset.start, end: chip.dataset.end || chip.dataset.start };
    }).filter((c) => c.start);
  }

  /* ---- dependency engine (any collection can drive a cascade) ---- */
  function mkDep(k, shift, reason) {
    return { ...k, newStart: addDays(k.start, shift), newEnd: addDays(k.end, shift), reason, shift, selected: true };
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
      let shift = 0, reason = '';
      const anchorType = (k.type === 'flights' || k.type === 'transfers');
      if (anchorType && k.start === s0) {
        shift = dStart; reason = `${k.type === 'flights' ? 'Flight' : 'Transfer'} anchored to ${edited.shortName} check-in`;
      } else if (anchorType && k.start === e0) {
        shift = dEnd; reason = `${k.type === 'flights' ? 'Flight' : 'Transfer'} anchored to ${edited.shortName} check-out`;
      } else if (k.start >= e0) {
        shift = dEnd; reason = k.type === 'hotels'
          ? `Check-in follows ${edited.shortName} check-out`
          : `Scheduled after the ${edited.shortName} stay, keeps its place in the trip`;
      } else if (k.start >= s0 && k.start < e0) {
        shift = dStart; reason = `Day-anchored within the ${edited.shortName} stay`;
      }
      if (shift !== 0) { seen.add(k.chip); out.push(mkDep(k, shift, reason)); }
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
        seen.add(k.chip); out.push(mkDep(k, d, 'Transfer meets this flight'));
      }
    });
    registry.forEach((k) => {
      if (seen.has(k.chip) || k.type !== 'hotels') return;
      let dep = null;
      if (k.start === edited.s0) {
        dep = mkDep(k, d, 'Check-in follows the new flight date, nights preserved');
      } else if (k.end === edited.s0) {
        dep = { ...k, newStart: k.start, newEnd: addDays(k.end, d), reason: `Check-out follows the new flight date (${d > 0 ? 'extra' : 'fewer'} night${Math.abs(d) === 1 ? '' : 's'} in ${shortName(k.name)})`, shift: d, selected: true };
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

    const row = (d, i) => `
      <label class="dc-row" data-i="${i}">
        <input type="checkbox" class="dc-cb" checked>
        <span class="dc-row-ic">${icon(d.type)}</span>
        <span class="dc-row-main">
          <span class="dc-row-name">${d.name}</span>
          <span class="dc-row-reason">${d.reason}</span>
          <span class="dc-row-warn">${icon('x', 'width="10" height="10"')} Conflicts with the new ${edited.shortName} dates if left on ${shortRange(d.start, d.end)}</span>
        </span>
        <span class="dc-row-dates">
          <span class="dc-old">${shortRange(d.start, d.end)}</span>
          <span class="dc-arrow">→</span>
          <span class="dc-new">${shortRange(d.newStart, d.newEnd)}</span>
        </span>
      </label>`;

    const modal = document.createElement('div');
    modal.id = 'dc-modal';
    modal.className = 'dc-modal';
    modal.innerHTML = `
      <div class="dc-card" role="dialog" aria-modal="true" aria-label="Update dependent dates">
        <div class="dc-hd">
          <div>
            <div class="dc-title">Update dependent dates?</div>
            <div class="dc-sub">Nothing moves until you confirm. Unticked collections keep their current dates.</div>
          </div>
          <button class="dc-x" title="Discard the date change entirely" aria-label="Close">${icon('x')}</button>
        </div>
        <div class="dc-edit-summary">
          <span class="dc-row-ic">${icon(edited.type)}</span>
          <span class="dc-es-name">${edited.name}</span>
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
            <span>Affected collections (${deps.length})</span>
            <button class="dc-selall" id="dc-selall">Select none</button>
          </div>
          <div class="dc-rows">${deps.map(row).join('')}</div>
          ${unaffectedLine ? `<div class="dc-unaffected">${unaffectedLine}</div>` : ''}
        </div>
        <div class="dc-foot">
          <button class="af-btn af-btn-ghost" data-keep title="Move only ${edited.shortName}; every dependent stays on its current dates">Keep other dates</button>
          <div class="dc-spacer"></div>
          <button class="af-btn af-btn-primary" data-shift>Shift selected (${deps.length})</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('dc-open'));

    const shiftBtn = modal.querySelector('[data-shift]');
    const selAllBtn = modal.querySelector('#dc-selall');
    const banner = modal.querySelector('#dc-trip-banner');
    const cbs = [...modal.querySelectorAll('.dc-cb')];

    const refresh = () => {
      deps.forEach((d, i) => { d.selected = cbs[i].checked; });
      const n = deps.filter((d) => d.selected).length;
      shiftBtn.textContent = `Shift selected (${n})`;
      shiftBtn.disabled = n === 0;
      shiftBtn.title = n === 0 ? 'Nothing selected. Use "Keep other dates" to move only the collection you edited.' : '';
      selAllBtn.textContent = n === deps.length ? 'Select none' : 'Select all';
      modal.querySelectorAll('.dc-row').forEach((rowEl, i) => {
        const d = deps[i];
        rowEl.classList.toggle('dc-unticked', !d.selected);
        rowEl.classList.toggle('dc-conflict', !d.selected && willConflict(d, edited));
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
    selAllBtn.addEventListener('click', () => {
      const allOn = deps.every((d) => d.selected);
      cbs.forEach((cb) => { cb.checked = !allOn; });
      refresh();
    });
    refresh();

    const destroy = () => { modal.classList.remove('dc-open'); setTimeout(() => modal.remove(), 180); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') { destroy(); AF().toast && AF().toast('No changes applied'); } };
    document.addEventListener('keydown', onKey);
    modal.addEventListener('click', (e) => { if (e.target === modal) { destroy(); AF().toast && AF().toast('No changes applied'); } });
    modal.querySelector('.dc-x').addEventListener('click', () => { destroy(); AF().toast && AF().toast('No changes applied'); });

    modal.querySelector('[data-keep]').addEventListener('click', () => {
      applyToSelf();
      AF().computeTrip && AF().computeTrip();
      AF().toast && AF().toast(`Moved ${edited.shortName} · kept ${plural(deps.length, 'dependent')} on current dates`);
      destroy();
      if (onDone) onDone('keep');
    });
    shiftBtn.addEventListener('click', () => {
      applyToSelf();
      const moved = deps.filter((d) => d.selected);
      moved.forEach((d) => {
        if (!d.chip || !d.chip.isConnected) return;
        d.chip.dataset.start = d.newStart; d.chip.dataset.end = d.newEnd;
        d.chip.innerHTML = `${icon('cal', 'width="11" height="11"')} ${AF().rangeLabel(d.newStart, d.newEnd)}`;
      });
      AF().computeTrip && AF().computeTrip();
      const kept = deps.length - moved.length;
      AF().toast && AF().toast(`Moved ${edited.shortName} · shifted ${plural(moved.length, 'collection')}${kept ? ` · ${kept} kept` : ''}`);
      destroy();
      if (onDone) onDone('shift');
    });
  }

  function willConflict(d, edited) {
    // unticked dependent whose current day falls inside the stay's NEW span
    return d.start >= edited.s1 && d.start < (edited.e1 || edited.s1);
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
    const edited = { name, shortName: shortName(name), type, chip: dateEl, s0, e0, s1: newStart, e1: newEnd };
    if (s0 === newStart && e0 === newEnd) { AF().close && AF().close(); return; }
    const registry = scan();
    const deps = computeDependents(edited, registry);
    if (!deps.length) {
      applyToSelf();
      AF().toast && AF().toast(`Moved ${name} to ${AF().rangeLabel(newStart, newEnd)} · no dependent collections affected`);
      return;
    }
    openCascadeModal({ edited, deps, registry, applyToSelf });
  }

  /* ---- demo seeds: flights + transfers the snapshot doesn't have ---- */
  function seedCard({ name, type, sub, start, end }) {
    const card = document.createElement('div');
    card.className = 'dc-seed-card';
    card.innerHTML = `
      <span class="dc-seed-ic">${icon(type)}</span>
      <span class="dc-seed-main">
        <span class="dc-seed-title">${name}</span>
        <span class="dc-seed-sub">${sub}</span>
      </span>
      <span class="dc-seed-count">1 option</span>
      <span class="af-coll-date" data-start="${start}" data-end="${end || start}" data-dc-name="${name}" data-dc-type="${type}">${icon('cal', 'width="11" height="11"')} ${AF().rangeLabel(start, end || start)}</span>
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
        firstSec.appendChild(seedCard({ name: 'Arrival Flight · LAX → BKK', type: 'flights', sub: 'Thai Airways TG693 · arrives 07:35 · Business', start: first.start }));
        firstSec.appendChild(seedCard({ name: 'Airport Transfer · BKK', type: 'transfers', sub: 'Private car, airport to hotel · meet at arrivals', start: first.start }));
      }
      const second = hotels[1];
      if (second) {
        const secondSec = second.chip.closest('section');
        if (secondSec) {
          secondSec.appendChild(seedCard({ name: 'Flight · BKK → CNX', type: 'flights', sub: 'Thai Airways TG102 · 10:35 → 11:55 · Business', start: second.start }));
          secondSec.appendChild(seedCard({ name: 'Airport Transfer · CNX', type: 'transfers', sub: 'Private car, airport to hotel', start: second.start }));
        }
      }
    }
    AF().computeTrip && AF().computeTrip();
  }

  /* ---- isolated harness support (test-cascade.html) ---- */
  function demoEntry(name, type, start, end) {
    const chip = document.createElement('span'); // detached; carries dates only
    chip.dataset.start = start; chip.dataset.end = end || start;
    return { name, type, chip, start, end: end || start };
  }
  function openDemo(scenario) {
    const bkk = demoEntry('Bangkok, Thailand Hotels', 'hotels', '2024-05-24', '2024-05-27');
    const cnx = demoEntry('Chiang Mai, Thailand Hotels', 'hotels', '2024-05-27', '2024-05-29');
    const interFlight = demoEntry('Flight · BKK → CNX', 'flights', '2024-05-27');
    const registry = [
      bkk,
      demoEntry('Arrival Flight · LAX → BKK', 'flights', '2024-05-24'),
      demoEntry('Airport Transfer · BKK', 'transfers', '2024-05-24'),
      demoEntry('Bangkok Experiences', 'experiences', '2024-05-24'),
      demoEntry('Bangkok Dining', 'dining', '2024-05-25'),
      demoEntry('Bangkok Dining', 'dining', '2024-05-26'),
      interFlight,
      demoEntry('Airport Transfer · CNX', 'transfers', '2024-05-27'),
      cnx,
      demoEntry('Chiang Mai Dining', 'dining', '2024-05-27'),
    ];
    const baseTrip = { min: '2024-05-24', max: '2024-05-29' };
    const noop = () => {};
    if (scenario === 'none') {
      onCollectionDateSaveDemo(registry, { name: 'Bangkok Dining', shortName: 'Bangkok Dining', type: 'dining', chip: registry[4].chip, s0: '2024-05-25', e0: '2024-05-25', s1: '2024-05-26', e1: '2024-05-26' });
      return;
    }
    let edited;
    if (scenario === 'shift') {
      edited = { name: bkk.name, shortName: shortName(bkk.name), type: 'hotels', chip: bkk.chip, s0: bkk.start, e0: bkk.end, s1: '2024-05-25', e1: '2024-05-28' };
    } else if (scenario === 'flight') {
      edited = { name: interFlight.name, shortName: shortName(interFlight.name), type: 'flights', chip: interFlight.chip, s0: interFlight.start, e0: interFlight.end, s1: '2024-05-28', e1: '2024-05-28' };
    } else {
      edited = { name: bkk.name, shortName: shortName(bkk.name), type: 'hotels', chip: bkk.chip, s0: bkk.start, e0: bkk.end, s1: bkk.start, e1: '2024-05-29' };
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
