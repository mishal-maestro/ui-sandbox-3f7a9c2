/* ============================================================
   Calendar view for the date-cascade prototype (CON-1626 v3.1).
   Rebuilt to mirror prod's MonthView (Mishal's saved HTML,
   Jul 23): month grid, Mon-first weeks, day cells with
   out-of-month dimming, multi-day span bars per collection
   (hotels render check-in-noon to check-out-noon with
   continuation segments across weeks), timed dining chips in
   the day-cell flow. Every bar/chip is draggable; dropping on
   another day runs the same "Move other items too?" flow as
   the itinerary view (DateCascade.promptMove). Dining is a
   leaf, so its drops apply directly with the re-price card.
   ============================================================ */
(function () {
  'use strict';

  const DC = () => window.DateCascade;
  const U = () => window.DateCascade.util;
  const AF = () => window.AF || {};

  let entries = null;
  let monthEl = null, titleEl = null;

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

  /* Monday-first month lattice around the trip's month */
  function monthLattice(anchorYMD) {
    const u = U();
    const first = anchorYMD.slice(0, 8) + '01';
    const y = parseInt(first.slice(0, 4), 10), m = parseInt(first.slice(5, 7), 10);
    const nextFirst = (m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`);
    const lastOfMonth = u.addDays(nextFirst, -1);
    const dowMon0 = (ymd) => (new Date(ymd + 'T00:00:00').getDay() + 6) % 7;
    const gridStart = u.addDays(first, -dowMon0(first));
    const gridEnd = u.addDays(lastOfMonth, 6 - dowMon0(lastOfMonth));
    const weeks = [];
    for (let ws = gridStart; ws <= gridEnd; ws = u.addDays(ws, 7)) weeks.push(ws);
    return { first, lastOfMonth, weeks, monthLabel: new Date(first + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  }

  const TYPE_CLS = { hotels: 'dcm-hotels', flights: 'dcm-flights', transfers: 'dcm-transfers', experiences: 'dcm-experiences', notes: 'dcm-notes' };

  function render() {
    const u = U();
    syncFromChips();
    const { min } = tripRange();
    const { first, lastOfMonth, weeks, monthLabel } = monthLattice(min);
    titleEl.textContent = monthLabel;

    const bars = entries.map((k, ei) => ({ k, ei })).filter((x) => x.k.type !== 'dining');
    const chips = entries.map((k, ei) => ({ k, ei })).filter((x) => x.k.type === 'dining');

    let html = '';
    weeks.forEach((weekStart) => {
      const weekEnd = u.addDays(weekStart, 6);
      // bar segments intersecting this week, with greedy lane assignment
      const segs = [];
      bars.forEach(({ k, ei }) => {
        if (k.end < weekStart || k.start > weekEnd) return;
        const segStart = k.start < weekStart ? weekStart : k.start;
        const segEnd = k.end > weekEnd ? weekEnd : k.end;
        segs.push({ k, ei, a: u.diffDays(weekStart, segStart), b: u.diffDays(weekStart, segEnd), trueStart: segStart === k.start, trueEnd: segEnd === k.end });
      });
      segs.sort((p, q) => (p.a - q.a) || (q.b - p.b));
      const lanes = [];
      segs.forEach((s) => {
        let lane = 0;
        while (lanes[lane] && lanes[lane].some((o) => !(s.b < o.a || s.a > o.b))) lane += 1;
        (lanes[lane] = lanes[lane] || []).push(s);
        s.lane = lane;
      });
      // per-column: how many bar lanes are occupied over that day (chip offset)
      const colCover = Array.from({ length: 7 }, (_, c) => {
        let n = 0;
        lanes.forEach((laneSegs) => { if (laneSegs.some((s) => s.a <= c && c <= s.b)) n += 1; });
        return n;
      });

      html += '<div class="dcm-week">';
      // day cells
      html += '<div class="dcm-days">';
      for (let c = 0; c < 7; c += 1) {
        const d = u.addDays(weekStart, c);
        const out = d < first || d > lastOfMonth;
        html += `<div class="dcm-day${out ? ' dcm-out' : ''}"><span class="dcm-daynum">${parseInt(d.slice(8), 10)}</span></div>`;
      }
      html += '</div>';
      // span bars
      html += '<div class="dcm-bars">';
      segs.forEach((s) => {
        const colPct = 100 / 7;
        const isHotel = s.k.type === 'hotels';
        const left = s.a * colPct + (isHotel && s.trueStart ? colPct / 2 : 0);
        const right = (s.b + 1) * colPct - (isHotel && s.trueEnd ? colPct / 2 : 0);
        const cont = `${s.trueStart ? '' : ' dcm-cont-l'}${s.trueEnd ? '' : ' dcm-cont-r'}`;
        html += `<button type="button" class="dcm-bar ${TYPE_CLS[s.k.type] || ''}${cont}" data-ei="${s.ei}" title="${s.k.name} · drag to move" style="left:${left}%;width:${right - left}%;top:${s.lane * 18}px">${u.icon(s.k.type, 'width="9" height="9"')}<span class="dcm-bar-tx">${s.k.name}</span></button>`;
      });
      html += '</div>';
      // timed chips (dining) in the day flow, below the bars
      html += '<div class="dcm-chips">';
      for (let c = 0; c < 7; c += 1) {
        const d = u.addDays(weekStart, c);
        html += `<div class="dcm-chipcol" style="margin-top:${colCover[c] * 18}px">`;
        chips.forEach(({ k, ei }) => {
          if (k.start !== d) return;
          html += `<button type="button" class="dcm-chip" data-ei="${ei}" title="${k.name} · drag to move">${u.icon('dining', 'width="9" height="9"')}<span class="dcm-chip-tx">${k.time ? `${k.time} ` : ''}${k.name}</span></button>`;
        });
        html += '</div>';
      }
      html += '</div>';
      html += '</div>';
    });
    monthEl.innerHTML = html;
    wireDrag();
  }

  function wireDrag() {
    const u = U();
    monthEl.querySelectorAll('[data-ei]').forEach((el) => {
      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const k = entries[parseInt(el.dataset.ei, 10)];
        const week = el.closest('.dcm-week');
        const colW = week.getBoundingClientRect().width / 7;
        const rowH = week.getBoundingClientRect().height;
        const x0 = e.clientX, y0 = e.clientY;
        let delta = 0;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
        el.classList.add('dcm-dragging');
        const onMove = (ev) => {
          const dc = Math.round((ev.clientX - x0) / colW);
          const dr = Math.round((ev.clientY - y0) / rowH);
          delta = dr * 7 + dc;
          el.style.transform = `translate(${dc * colW}px, ${dr * rowH}px)`;
        };
        const onUp = () => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerup', onUp);
          el.removeEventListener('pointercancel', onUp);
          el.classList.remove('dcm-dragging');
          el.style.transform = '';
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
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
      });
    });
  }

  function init() {
    monthEl = document.getElementById('dcm-month');
    titleEl = document.getElementById('dcm-title');
    if (!monthEl || !window.DateCascade) return;
    entries = DC().demoRegistry();
    render();
    // inert prod chrome: everything not part of this prototype just says so
    document.querySelectorAll('[data-demo-toast]').forEach((b) => {
      b.addEventListener('click', () => { AF().toast && AF().toast('Not part of this prototype'); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
