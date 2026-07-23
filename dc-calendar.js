/* ============================================================
   Calendar view for the date-cascade prototype (CON-1626 v3).
   Entry point 3 (Dustin, Jul 22): dragging a hotel on the
   calendar pops the same "Move other items too?" prompt when
   other items exist. Flights are draggable too (CON-792
   pattern); dining / experiences / transfers are static.

   State = DateCascade.demoRegistry() (same Bangkok/Chiang Mai
   demo trip as the harness). Blocks re-render from the
   registry after every apply/cancel.
   ============================================================ */
(function () {
  'use strict';

  const DC = () => window.DateCascade;
  const U = () => window.DateCascade.util;

  let entries = null;
  let grid = null, rangeEl = null;

  function tripRange() {
    let min = null, max = null;
    entries.forEach((k) => {
      if (!min || k.start < min) min = k.start;
      const e = k.end || k.start;
      if (!max || e > max) max = e;
    });
    return { min, max };
  }

  function syncFromChips() {
    entries.forEach((k) => {
      k.start = k.chip.dataset.start;
      k.end = k.chip.dataset.end || k.chip.dataset.start;
    });
  }

  function render() {
    const u = U();
    syncFromChips();
    const { min, max } = tripRange();
    rangeEl.textContent = `${u.shortRange(min, max)} · drag to reschedule`;
    const from = u.addDays(min, -1);
    const to = u.addDays(max, 2);
    const days = [];
    for (let d = from; d <= to; d = u.addDays(d, 1)) days.push(d);

    grid.style.gridTemplateColumns = `230px repeat(${days.length}, minmax(84px, 1fr))`;
    let html = '';
    // day column underlays + header row
    days.forEach((d, j) => {
      html += `<div class="cal-daybg" style="grid-column:${j + 2};grid-row:1 / ${entries.length + 2}"></div>`;
      html += `<div class="cal-dayhead" style="grid-column:${j + 2};grid-row:1">${u.dayLabel(d)}</div>`;
    });
    html += `<div class="cal-corner" style="grid-column:1;grid-row:1"></div>`;
    entries.forEach((k, i) => {
      const row = i + 2;
      const col = u.diffDays(from, k.start) + 2;
      const span = u.diffDays(k.start, k.end) + 1;
      const draggable = k.type === 'hotels' || k.type === 'flights';
      html += `<div class="cal-label" style="grid-column:1;grid-row:${row}">
        <span class="dc-row-ic">${u.icon(k.type)}</span>
        <span class="cal-label-tx"><span class="cal-label-name">${k.name}</span><span class="cal-label-meta">${k.city}${k.count ? ` · ${k.count} option${String(k.count) === '1' ? '' : 's'}` : ''}${k.manualEntry ? ' · manual entry' : ''}</span></span>
      </div>`;
      html += `<div class="cal-block cal-${k.type}${draggable ? ' cal-drag' : ''}" data-i="${i}" style="grid-column:${col} / span ${span};grid-row:${row}" ${draggable ? 'title="Drag to move"' : ''}>
        <span class="cal-block-tx">${u.shortRange(k.start, k.end)}</span>
      </div>`;
    });
    grid.innerHTML = html;
    wireDrag(from, days.length);
  }

  function wireDrag(from, dayCount) {
    const u = U();
    grid.querySelectorAll('.cal-block.cal-drag').forEach((block) => {
      block.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const k = entries[parseInt(block.dataset.i, 10)];
        const head = grid.querySelector('.cal-dayhead');
        const colW = head ? head.getBoundingClientRect().width : 90;
        const startX = e.clientX;
        const tx = block.querySelector('.cal-block-tx');
        const origLabel = tx.textContent;
        let delta = 0;
        try { block.setPointerCapture(e.pointerId); } catch (err) { /* synthetic or lost pointer: drag still works via element listeners */ }
        block.classList.add('cal-dragging');
        const onMove = (ev) => {
          delta = Math.round((ev.clientX - startX) / colW);
          block.style.transform = `translateX(${delta * colW}px)`;
          tx.textContent = delta === 0 ? origLabel : u.shortRange(u.addDays(k.start, delta), u.addDays(k.end, delta));
        };
        const onUp = () => {
          block.removeEventListener('pointermove', onMove);
          block.removeEventListener('pointerup', onUp);
          block.removeEventListener('pointercancel', onUp);
          block.classList.remove('cal-dragging');
          block.style.transform = '';
          tx.textContent = origLabel;
          if (delta !== 0) {
            DC().promptMove({
              entry: k,
              newStart: u.addDays(k.start, delta),
              newEnd: u.addDays(k.end, delta),
              registry: entries,
              onDone: () => render(),
            });
          }
        };
        block.addEventListener('pointermove', onMove);
        block.addEventListener('pointerup', onUp);
        block.addEventListener('pointercancel', onUp);
      });
    });
  }

  function init() {
    grid = document.getElementById('cal-grid');
    rangeEl = document.getElementById('cal-range');
    if (!grid || !window.DateCascade) return;
    entries = DC().demoRegistry();
    render();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
