/* ============================================================
   Create New Trip - Step 02 Demo (CON-606 party composition)
   Self-contained overlay, injected on top of trip-detail.html.
   Prefix: .nt-  (new-trip)
   ============================================================ */
(function () {
  'use strict';

  /* ---- Icons (lucide-style inline SVG, matching add-flow.js pattern) ---- */
  const S = (p, o = '') =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${o}>${p}</svg>`;
  const IC = {
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>',
    arrowR: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
  };

  /* ---- State ---- */
  const st = {
    adults: 1,       // Default 1 (not 2), per spec
    children: 0,
    tripType: null,
    budget: null,
    travelStyle: new Set(),
  };
  const PARTY_CAPS = { adults: { min: 1, max: 12 }, children: { min: 0, max: 8 } };

  /* ---- DOM scaffold ---- */
  let scrim, modal, toastEl, toastT;

  function build() {
    scrim = document.createElement('div');
    scrim.className = 'nt-scrim';
    scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });

    modal = document.createElement('div');
    modal.className = 'nt-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = renderModalHTML();

    toastEl = document.createElement('div');
    toastEl.className = 'nt-toast';

    document.body.append(scrim, modal, toastEl);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && scrim.classList.contains('nt-open')) close(); });

    // Wire interactivity
    wireStepNav();
    wireSteppers();
    wireChips();
    wireFooter();
  }

  function renderModalHTML() {
    return `
      <div class="nt-modal-content">
        <!-- Header -->
        <div class="nt-header">
          <div>
            <h2 class="nt-title">Create New Trip</h2>
            <p class="nt-subtitle">Create a trip in seconds with Conductor AI</p>
          </div>
          <button type="button" class="nt-close" aria-label="Close" data-nt-close>
            ${S(IC.x, 'width="14" height="14"')}
          </button>
        </div>

        <!-- Step Nav -->
        <nav aria-label="Trip creation steps" class="nt-step-nav">
          <button type="button" class="nt-step" data-step="1">
            <div class="nt-step-title">The Basics</div>
            <div class="nt-step-label">Step 01</div>
          </button>
          <button type="button" class="nt-step nt-active" data-step="2" aria-current="step">
            <div class="nt-step-title">Trip Details</div>
            <div class="nt-step-label">Step 02</div>
          </button>
          <button type="button" class="nt-step nt-disabled" data-step="3" disabled>
            <div class="nt-step-title nt-disabled-title">Itinerary</div>
            <div class="nt-step-label">Step 03</div>
          </button>
        </nav>

        <!-- Body -->
        <div class="nt-body">
          <section class="nt-section">
            <h3 class="nt-section-heading">Trip details</h3>

            <!-- Party Composition: Adults + Children side-by-side, then derived travelers line -->
            <div class="nt-travelers-block">
              <div class="nt-travelers-row">
                <!-- Adults stepper -->
                <div class="nt-traveler-field">
                  <label class="nt-field-label">Adults<span class="nt-sublabel">Ages 18+</span></label>
                  <div role="group" aria-label="Adults" class="nt-stepper">
                    <button type="button" class="nt-stepper-btn" data-party="adults" data-delta="-1" aria-label="Decrease adults">−</button>
                    <span aria-live="polite" class="nt-stepper-value" id="nt-adults-value">1</span>
                    <button type="button" class="nt-stepper-btn" data-party="adults" data-delta="1" aria-label="Increase adults">+</button>
                  </div>
                </div>

                <!-- Children stepper -->
                <div class="nt-traveler-field">
                  <label class="nt-field-label">Children<span class="nt-sublabel">Ages 0-17</span></label>
                  <div role="group" aria-label="Children" class="nt-stepper">
                    <button type="button" class="nt-stepper-btn" data-party="children" data-delta="-1" aria-label="Decrease children">−</button>
                    <span aria-live="polite" class="nt-stepper-value" id="nt-children-value">0</span>
                    <button type="button" class="nt-stepper-btn" data-party="children" data-delta="1" aria-label="Increase children">+</button>
                  </div>
                </div>
              </div>

              <!-- Derived travelers line -->
              <p class="nt-travelers-summary" id="nt-travelers-summary" aria-live="polite">1 traveler</p>
            </div>

            <!-- Budget segmented control (single-select) -->
            <div class="nt-field-group">
              <label class="nt-field-label">Budget</label>
              <div role="group" aria-label="Budget" class="nt-budget-group">
                <button type="button" class="nt-budget-btn" data-budget="comfortable" aria-pressed="false">
                  <span>$$</span> Comfortable
                </button>
                <button type="button" class="nt-budget-btn" data-budget="luxury" aria-pressed="false">
                  <span>$$$</span> Luxury
                </button>
                <button type="button" class="nt-budget-btn" data-budget="ultra" aria-pressed="false">
                  <span>$$$$</span> Ultra Luxury
                </button>
              </div>
            </div>

            <!-- Trip Type chips (single-select) -->
            <div class="nt-field-group">
              <label class="nt-field-label">Trip Type</label>
              <div role="group" class="nt-chip-group">
                <button type="button" class="nt-chip" data-trip-type="leisure" aria-pressed="false">Leisure</button>
                <button type="button" class="nt-chip" data-trip-type="family" aria-pressed="false">Family</button>
                <button type="button" class="nt-chip" data-trip-type="celebration" aria-pressed="false">Celebration</button>
                <button type="button" class="nt-chip" data-trip-type="business" aria-pressed="false">Business</button>
                <button type="button" class="nt-chip" data-trip-type="wellness" aria-pressed="false">Wellness</button>
              </div>
            </div>

            <!-- Travel Style chips (multi-select max 3) -->
            <div class="nt-field-group">
              <label class="nt-field-label">Travel Style</label>
              <p class="nt-microcopy">Select up to 3</p>
              <div role="group" class="nt-chip-group">
                <button type="button" class="nt-chip" data-travel-style="culture" aria-pressed="false">Culture</button>
                <button type="button" class="nt-chip" data-travel-style="culinary" aria-pressed="false">Culinary</button>
                <button type="button" class="nt-chip" data-travel-style="relaxation" aria-pressed="false">Relaxation</button>
                <button type="button" class="nt-chip" data-travel-style="adventure" aria-pressed="false">Adventure</button>
                <button type="button" class="nt-chip" data-travel-style="romance" aria-pressed="false">Romance</button>
                <button type="button" class="nt-chip" data-travel-style="beach" aria-pressed="false">Beach</button>
              </div>
            </div>

            <!-- Lead Advisor combobox (static, click shows toast) -->
            <div class="nt-field-group">
              <label class="nt-field-label">Lead Advisor</label>
              <button type="button" class="nt-combobox" data-combobox>
                <span class="nt-combobox-placeholder">Select advisor...</span>
                ${S(IC.chevD, 'width="14" height="14" class="nt-combobox-icon"')}
              </button>
            </div>

            <!-- Origin Airport input (static) -->
            <div class="nt-field-group">
              <label class="nt-field-label">Origin Airport</label>
              <input type="text" class="nt-input" placeholder="Search airport (e.g. LAX)">
            </div>
          </section>
        </div>

        <!-- Footer -->
        <div class="nt-footer">
          <button type="button" class="nt-btn nt-btn-ghost" data-nt-back>Back</button>
          <button type="button" class="nt-btn nt-btn-primary" data-nt-continue>
            Continue ${S(IC.arrowR, 'width="14" height="14"')}
          </button>
        </div>
      </div>
    `;
  }

  function wireStepNav() {
    modal.querySelectorAll('[data-step]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = btn.dataset.step;
        if (step === '1') toast('Step 01 not part of this demo');
        if (step === '3') toast('Step 03 not part of this demo');
      });
    });
  }

  function wireSteppers() {
    modal.querySelectorAll('[data-party]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.party;
        const delta = parseInt(btn.dataset.delta, 10);
        stepParty(field, delta);
      });
    });
    updatePartyUI();
  }

  function stepParty(field, delta) {
    const caps = PARTY_CAPS[field];
    const newVal = st[field] + delta;
    if (newVal < caps.min || newVal > caps.max) return;
    st[field] = newVal;
    updatePartyUI();
  }

  function updatePartyUI() {
    const adultsVal = modal.querySelector('#nt-adults-value');
    const childrenVal = modal.querySelector('#nt-children-value');
    const summary = modal.querySelector('#nt-travelers-summary');

    if (!adultsVal) return; // Not built yet

    adultsVal.textContent = st.adults;
    childrenVal.textContent = st.children;

    // Update button states
    modal.querySelectorAll('[data-party]').forEach((btn) => {
      const field = btn.dataset.party;
      const delta = parseInt(btn.dataset.delta, 10);
      const caps = PARTY_CAPS[field];
      const newVal = st[field] + delta;
      const disabled = newVal < caps.min || newVal > caps.max;
      btn.disabled = disabled;
      btn.style.opacity = disabled ? '0.4' : '1';
      btn.style.pointerEvents = disabled ? 'none' : 'auto';
      if (disabled && delta > 0) {
        btn.title = `Maximum ${caps.max} ${field}`;
      } else if (disabled && delta < 0) {
        btn.title = `Minimum ${caps.min} ${field}`;
      } else {
        const action = delta > 0 ? 'Increase' : 'Decrease';
        btn.title = `${action} ${field}`;
      }
    });

    // Derived travelers line
    const travelers = st.adults + st.children;
    let text;
    if (st.children === 0) {
      text = `${travelers} ${travelers === 1 ? 'traveler' : 'travelers'}`;
    } else {
      const adultWord = st.adults === 1 ? 'adult' : 'adults';
      const childWord = st.children === 1 ? 'child' : 'children';
      text = `${travelers} ${travelers === 1 ? 'traveler' : 'travelers'} (${st.adults} ${adultWord}, ${st.children} ${childWord})`;
    }
    summary.textContent = text;
  }

  function wireChips() {
    // Budget (single-select)
    modal.querySelectorAll('[data-budget]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.budget;
        const wasPressed = btn.getAttribute('aria-pressed') === 'true';
        // Clear all
        modal.querySelectorAll('[data-budget]').forEach((b) => {
          b.setAttribute('aria-pressed', 'false');
          b.classList.remove('nt-pressed');
        });
        // Set this one if not already pressed
        if (!wasPressed) {
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('nt-pressed');
          st.budget = value;
        } else {
          st.budget = null;
        }
      });
    });

    // Trip Type (single-select)
    modal.querySelectorAll('[data-trip-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.tripType;
        const wasPressed = btn.getAttribute('aria-pressed') === 'true';
        // Clear all
        modal.querySelectorAll('[data-trip-type]').forEach((b) => {
          b.setAttribute('aria-pressed', 'false');
          b.classList.remove('nt-pressed');
        });
        // Set this one if not already pressed
        if (!wasPressed) {
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('nt-pressed');
          st.tripType = value;
        } else {
          st.tripType = null;
        }
      });
    });

    // Travel Style (multi-select max 3)
    modal.querySelectorAll('[data-travel-style]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.travelStyle;
        const wasPressed = btn.getAttribute('aria-pressed') === 'true';
        if (wasPressed) {
          // Unselect
          btn.setAttribute('aria-pressed', 'false');
          btn.classList.remove('nt-pressed');
          st.travelStyle.delete(value);
        } else {
          // Check if at max
          if (st.travelStyle.size >= 3) {
            // Ignore (or could show a visual indicator)
            return;
          }
          // Select
          btn.setAttribute('aria-pressed', 'true');
          btn.classList.add('nt-pressed');
          st.travelStyle.add(value);
        }
      });
    });

    // Lead Advisor combobox (static, click shows toast)
    modal.querySelector('[data-combobox]').addEventListener('click', () => {
      toast('Advisor selector not part of this demo');
    });
  }

  function wireFooter() {
    modal.querySelector('[data-nt-close]').addEventListener('click', close);
    modal.querySelector('[data-nt-back]').addEventListener('click', () => {
      toast('Step 01 not part of this demo');
    });
    modal.querySelector('[data-nt-continue]').addEventListener('click', () => {
      toast('Step 03 not part of this demo');
    });
  }

  function open() {
    scrim.classList.add('nt-open');
    modal.classList.add('nt-open');
  }

  function close() {
    scrim.classList.remove('nt-open');
    modal.classList.remove('nt-open');
  }

  function toast(msg) {
    clearTimeout(toastT);
    toastEl.textContent = msg;
    toastEl.classList.add('nt-toast-open');
    toastT = setTimeout(() => {
      toastEl.classList.remove('nt-toast-open');
    }, 2500);
  }

  /* ---- Trigger button injection ---- */
  function injectTrigger() {
    const trigger = document.createElement('button');
    trigger.className = 'nt-trigger';
    trigger.textContent = '+ New Trip';
    trigger.setAttribute('type', 'button');
    trigger.onclick = function() {
      // Query DOM directly and add classes immediately (no RAF needed for class toggle)
      const s = document.querySelector('.nt-scrim');
      const m = document.querySelector('.nt-modal');
      if (s && m) {
        s.classList.add('nt-open');
        m.classList.add('nt-open');
      }
    };
    document.body.appendChild(trigger);
  }

  /* ---- Init ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      build();
      injectTrigger();
    });
  } else {
    build();
    injectTrigger();
  }
})();
