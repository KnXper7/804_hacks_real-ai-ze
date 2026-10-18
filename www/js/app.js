(() => {
  const F = window.FACTORS;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const setText = (id, value) => { document.getElementById(id).textContent = value; };

  // ---------------- State ----------------
  const ACTIVITIES = window.ACTIVITIES;
  const byId = (id) => ACTIVITIES.find((a) => a.id === id);

  const DEFAULT = {
    seenLanding: false,
    setupDone: false,
    ais: ['chatgpt'],
    notifications: false,
    habits: Object.fromEntries(ACTIVITIES.filter((a) => a.core).map((a) => [a.id, a.start])),
  };
  let state = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem('realaize-v3') || 'null');
      if (saved) return { ...structuredClone(DEFAULT), seenLanding: !!saved.setupDone, ...saved, habits: { ...DEFAULT.habits, ...saved.habits } };
      const old = JSON.parse(localStorage.getItem('realaize-v2') || 'null');
      if (old) {
        const habits = { small: old.habits?.smallPerWeek ?? 100, big: old.habits?.bigPerWeek ?? 20 };
        if (old.habits?.imagesPerWeek) habits.image = old.habits.imagesPerWeek;
        return { ...structuredClone(DEFAULT), ...old, habits };
      }
    } catch (e) {}
    return structuredClone(DEFAULT);
  }

  function save() {
    try { localStorage.setItem('realaize-v3', JSON.stringify(state)); } catch (e) {}
  }

  // ---------------- Math ----------------
  function footprint(h) {
    const whPerWeek = Object.entries(h).reduce((sum, [id, n]) => sum + n * (byId(id)?.wh ?? 0), 0);
    const kWh = (whPerWeek * 52) / 1000;
    return {
      kWh,
      water: kWh * F.waterLitersPerKWh,
      co2: kWh * F.co2KgPerKWh,
      bill: kWh * F.pricePerKWh,
    };
  }

  // 0 = lightest, 1 = heaviest (log scale so the rating feels fair at both ends)
  function heaviness(kWh) {
    const { best, worst } = F.rating;
    if (kWh <= best) return 0;
    return Math.min(1, Math.log(kWh / best) / Math.log(worst / best));
  }

  const rating = (kWh) => Math.max(1, Math.round(10 - 9 * heaviness(kWh)));

  function fmt(n) {
    if (n >= 100) return Math.round(n).toLocaleString();
    if (n >= 10) return n.toFixed(0);
    return n.toFixed(1);
  }

  // ---------------- Setup + Settings (shared controls) ----------------
  function paintPrefs() {
    $$('[data-ai]').forEach((b) => b.setAttribute('aria-pressed', state.ais.includes(b.dataset.ai)));
    $$('[data-notify-toggle]').forEach((t) => { t.checked = state.notifications; });
  }

  $$('[data-ai]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.ai;
      state.ais = state.ais.includes(id) ? state.ais.filter((x) => x !== id) : [...state.ais, id];
      save();
      paintPrefs();
    });
  });

  $$('[data-notify-toggle]').forEach((t) => {
    t.addEventListener('change', async () => {
      if (t.checked) {
        state.notifications = await enableNotifications();
      } else {
        state.notifications = false;
        await window.Capacitor?.Plugins?.LocalNotifications?.cancel({ notifications: [{ id: 1 }, { id: 2 }] }).catch(() => {});
        notifyStatus('');
      }
      save();
      paintPrefs();
    });
  });

  // Uses the Capacitor Local Notifications plugin when installed, else the browser API.
  // Needs the @capacitor/local-notifications plugin in the phone app (npm i + npx cap sync).
  async function enableNotifications() {
    const LN = window.Capacitor?.Plugins?.LocalNotifications;
    try {
      if (LN) {
        const perm = await LN.requestPermissions();
        if (perm.display !== 'granted') {
          notifyStatus('Notifications are blocked. Turn them on for Real-AI-ze in your phone’s Settings.');
          return false;
        }
        await LN.cancel({ notifications: [{ id: 1 }, { id: 2 }] }).catch(() => {});
        await LN.schedule({
          notifications: [
            {
              id: 2,
              title: 'Real-AI-ze',
              body: 'Notifications are on! We’ll remind you every Monday.',
              schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
            },
            {
              id: 1,
              title: 'Real-AI-ze',
              body: 'How was your AI use this week? Check your footprint.',
              schedule: { on: { weekday: 2, hour: 17, minute: 0 }, allowWhileIdle: true },
            },
          ],
        });
        notifyStatus('');
        return true;
      }
      if ('Notification' in window) {
        const ok = (await Notification.requestPermission()) === 'granted';
        if (ok) new Notification('Real-AI-ze', { body: 'Notifications are on!' });
        notifyStatus(ok ? '' : 'Notifications are blocked in this browser.');
        return ok;
      }
      notifyStatus('Notifications need the phone app — they don’t work in this browser.');
      return false;
    } catch (e) {
      console.error('Notification setup failed:', e);
      notifyStatus('Couldn’t turn on notifications: ' + (e.message || e));
      return false;
    }
  }

  function notifyStatus(text) {
    $$('[data-notify-status]').forEach((el) => { el.textContent = text; });
  }


  // Landing page (Home) is only shown the very first time the app opens.
  $('#get-started').addEventListener('click', (e) => {
    e.preventDefault();
    state.seenLanding = true;
    state.setupDone = true;
    save();
    location.hash = '#calc';
    route();
  });

  $('#setup-done').addEventListener('click', () => {
    state.setupDone = true;
    save();
    location.hash = '#calc';
  });

  $('#reset').addEventListener('click', async () => {
    try { await window.Capacitor?.Plugins?.LocalNotifications?.cancel({ notifications: [{ id: 1 }, { id: 2 }] }); } catch (e) {}
    state = structuredClone(DEFAULT);
    save();
    location.hash = '#home';
    route();
  });

  // ---------------- Calculator ----------------
  const fields = $('#fields');
  const fieldTpl = $('#field-template');
  const optionTpl = $('#add-option-template');

  function buildField(a) {
    const node = fieldTpl.content.firstElementChild.cloneNode(true);
    const range = $('input', node);
    node.dataset.id = a.id;
    $('.field__label', node).textContent = a.label;
    $('.field__help', node).textContent = a.help;
    $('.range-max', node).textContent = `${a.max} ${a.unit}`;
    range.max = a.max;
    range.step = a.step;
    range.setAttribute('aria-label', a.label);
    $('.field__remove', node).hidden = !!a.core;

    range.addEventListener('input', () => {
      state.habits[a.id] = Number(range.value);
      save();
      paintField(node);
    });
    $('.field__remove', node).addEventListener('click', () => {
      delete state.habits[a.id];
      save();
      updateCalc();
    });
    return node;
  }

  function paintField(node) {
    const range = $('input', node);
    range.value = state.habits[node.dataset.id];
    range.style.setProperty('--pct', (range.value / range.max) * 100 + '%');
    $('.pill', node).textContent = range.value;
  }

  function updateCalc() {
    const active = ACTIVITIES.filter((a) => a.id in state.habits);
    const available = ACTIVITIES.filter((a) => !(a.id in state.habits));

    fields.replaceChildren(...active.map(buildField));
    $$('.field', fields).forEach(paintField);

    $('#add-options').replaceChildren(...available.map((a) => {
      const chip = optionTpl.content.firstElementChild.cloneNode(true);
      chip.textContent = '+ ' + a.label;
      chip.addEventListener('click', () => {
        state.habits[a.id] = a.start;
        save();
        updateCalc();
        fields.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
      return chip;
    }));
    $('.add-more').hidden = available.length === 0;

  }

  $('#save-changes').addEventListener('click', () => {
    save();
    location.hash = '#results';
  });

  // ---------------- Results ----------------
  function updateResults() {
    const f = footprint(state.habits);
    const score = rating(f.kWh);
    const level = score >= 8 ? 'good' : score >= 5 ? 'ok' : 'bad';

    setText('rating-score', score);
    setText('rating-text', window.RATING_TEXT.find((r) => score >= r.min).text);
    $('#rating').dataset.level = level;

    setText('res-water', fmt(f.water));
    setText('res-bottles', fmt(f.water / F.bottleLiters));
    setText('res-bill', f.bill < 10 ? f.bill.toFixed(2) : fmt(f.bill));
    setText('res-kwh', fmt(f.kWh));
    setText('res-miles', fmt(f.co2 / F.carKgCO2PerMile));
    setText('res-co2', fmt(f.co2));

    const prompts = Object.values(state.habits).reduce((a, b) => a + b, 0) * 52;
    setText('res-cash', f.bill < 10 ? f.bill.toFixed(2) : fmt(f.bill));
    setText('pp-water', prompts ? `${(f.water * 1000 / prompts).toPrecision(2)} mL` : '0 mL');
    setText('pp-cash', prompts ? `$${(f.bill / prompts).toPrecision(2)}` : '$0');

    const waterFill = visualFill(f.water, F.visual.waterFullAt);
    const cashFill = visualFill(f.bill, F.visual.cashFullAt);

    const water = $('#tank-water');
    const stream = $('#tank-stream');
    water.style.height = '0%';
    stream.style.height = '100%';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      water.style.height = waterFill + '%';
      stream.style.height = 100 - waterFill + '%';
    }));

    buildPile(cashFill);
    makeItRain(cashFill);
  }

  // 90% full at `fullAt`. The curve makes everyday amounts still look big.
  function visualFill(value, fullAt) {
    if (value <= 0) return 0;
    return Math.min(97, 90 * Math.pow(value / fullAt, F.visual.curve));
  }

  const billTpl = $('#bill-template');
  const newBill = () => billTpl.content.firstElementChild.cloneNode(true);
  const rand = (min, max) => min + Math.random() * (max - min);

  // The pile fills the whole width of the box, row by row from the bottom,
  // until it reaches `fill`% of the box height. Cash rains only while it grows.
  const PILE = { rowPx: 13, perRow: 5, msPerRow: 140 };

  function buildPile(fill) {
    const pile = $('#cash-pile');
    const boxHeight = pile.parentElement.clientHeight || 280;
    const targetPx = (boxHeight * fill) / 100;
    const rows = Math.ceil(targetPx / PILE.rowPx);
    pile.style.height = fill + '%';

    const bills = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < PILE.perRow + (r % 2); c++) {
        const bill = newBill();
        const x = ((c + (r % 2 ? 0 : 0.5)) / PILE.perRow) * 100;
        bill.style.left = `calc(${x + rand(-6, 6)}% - 27px)`;
        bill.style.bottom = Math.min(targetPx - 14, r * PILE.rowPx + rand(-3, 3)) + 'px';
        bill.style.transform = `rotate(${rand(-28, 28)}deg)`;
        bill.style.animationDelay = (r * PILE.msPerRow + rand(0, PILE.msPerRow)) / 1000 + 's';
        bills.push(bill);
      }
    }
    pile.replaceChildren(...bills);
    return rows * PILE.msPerRow + 400;
  }

  // Cash keeps raining forever; each bill disappears when it lands on top of the pile.
  function makeItRain(fill) {
    const rain = $('#cash-rain');
    if (fill <= 0) return rain.replaceChildren();
    const box = rain.parentElement.clientHeight || 280;
    const fallPx = box * (1 - fill / 100) + 20;
    rain.replaceChildren(...Array.from({ length: 12 }, () => {
      const bill = newBill();
      bill.style.left = rand(-5, 80) + '%';
      bill.style.animationDuration = rand(1.2, 2) * Math.max(0.5, fallPx / box) + 's';
      bill.style.animationDelay = rand(0, 2) + 's';
      bill.style.setProperty('--spin', rand(-200, 200) + 'deg');
      bill.style.setProperty('--fall', fallPx + 'px');
      return bill;
    }));
  }

  // ---------------- Router ----------------
  const UPDATE = { calc: updateCalc, results: updateResults, setup: paintPrefs, settings: paintPrefs };
  const view = $('#view');
  let isInitialRoute = true;

  function route() {
    let key = location.hash.slice(1);
    if (isInitialRoute) {
      isInitialRoute = false;
      if (!state.seenLanding) key = 'home';
      else if (!state.setupDone) key = 'setup';
      else if (!key || key === 'home' || key === 'setup') key = 'results';
    } else if (!key) {
      key = !state.seenLanding ? 'home' : !state.setupDone ? 'setup' : 'results';
    } else if (state.setupDone && (key === 'home' || key === 'setup')) {
      key = 'results';
    }
    if (!document.getElementById('screen-' + key)) key = 'results';
    const screen = document.getElementById('screen-' + key);

    $$('.screen').forEach((s) => { s.hidden = s !== screen; });
    $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === key));
    $('.tabbar').hidden = key === 'home' || key === 'setup';
    setText('page-title', screen.dataset.title);
    view.classList.toggle('has-sheet', screen.hasAttribute('data-sheet'));

    UPDATE[key]?.();

    view.classList.remove('fade-in');
    void view.offsetWidth;
    view.classList.add('fade-in');
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  $('#info-btn').addEventListener('click', () => $('#info-dialog').showModal());
  $('#info-btn').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#info-dialog').showModal(); } });
  route();
})();
