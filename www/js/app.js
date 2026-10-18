(() => {
  const F = window.FACTORS;
  const TIPS = window.TIPS;

  const DEFAULT = {
    habits: { chatsPerDay: 25, imagesPerWeek: 10, videosPerMonth: 2, model: 'standard', location: 'VA' },
    tips: ['small', 'batch'],
    pledged: false,
  };
  let state = load();

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem('realaize') || 'null');
      if (saved) return { ...DEFAULT, ...saved, habits: { ...DEFAULT.habits, ...saved.habits } };
    } catch (e) {}
    return structuredClone(DEFAULT);
  }
  function save() { try { localStorage.setItem('realaize', JSON.stringify(state)); } catch (e) {} }

  const LOCATION = {
    VA: { label: 'Virginia (PJM grid)', co2: F.co2KgPerKWh },
    US: { label: 'Elsewhere in the US', co2: 0.37 },
  };

  function footprint(h, co2Factor = 1) {
    const m = F.model[h.model] ?? 1;
    const share = h.chatModelShare || 0;
    const chatMult = share * F.model.small + (1 - share) * m;
    const wh = h.chatsPerDay * 365 * F.energyWh.chat * chatMult
             + h.imagesPerWeek * 52 * F.energyWh.image * m
             + h.videosPerMonth * 12 * F.energyWh.video * m;
    const kWh = wh / 1000;
    const co2 = kWh * (LOCATION[h.location]?.co2 ?? F.co2KgPerKWh) * co2Factor;
    return { kWh, water: kWh * F.waterLitersPerKWh, co2 };
  }

  function withTips(h, tipIds) {
    let out = { ...h }, co2Factor = 1;
    for (const t of TIPS) {
      if (!tipIds.includes(t.id)) continue;
      if (t.apply) out = t.apply(out);
      if (t.co2Factor) co2Factor *= t.co2Factor;
    }
    return footprint(out, co2Factor);
  }

  const baseline = () => footprint(state.habits);
  const after = () => withTips(state.habits, state.tips);
  const pct = (a, b) => (a > 0 ? Math.round((1 - b / a) * 100) : 0);

  function fmt(n) {
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + ' million';
    if (n >= 100) return Math.round(n).toLocaleString();
    if (n >= 10) return n.toFixed(0);
    return n.toFixed(1);
  }

  const ICON = {
    bolt: '<svg viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9z"/></svg>',
    drop: '<svg viewBox="0 0 24 24"><path d="M12 2.7s-6 6.6-6 11.3a6 6 0 0 0 12 0c0-4.7-6-11.3-6-11.3z"/></svg>',
    cloud: '<svg viewBox="0 0 24 24"><path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/></svg>',
    server: '<svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></svg>',
    bottle: '<svg viewBox="0 0 24 24"><path d="M10 2h4v3l2 3v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8l2-3z"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
    car: '<svg viewBox="0 0 24 24"><path d="M5 17h14M5 17a2 2 0 1 0 4 0M15 17a2 2 0 1 0 4 0M3 17v-4l2-5h14l2 5v4"/></svg>',
    tv: '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 21h8"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  };

  const stat = (icon, value, label) => `
    <div class="card">
      <div class="stat__icon">${ICON[icon]}</div>
      <div class="stat__value">${value}</div>
      <div class="stat__label">${label}</div>
    </div>`;

  const screens = {
    home: {
      title: 'Real-AI-ze',
      render: () => `
        <div class="stack">
          <p class="eyebrow">804 Hacks · Virginia data centers</p>
          <h1 class="h1">What does your AI habit really cost the planet?</h1>
          <p class="lead">See your yearly energy, water, and CO₂ footprint in 60 seconds — then <b>shrink it<b>.</p>
        </div>
        <div class="hero-art"><img src="assets/logo.png" alt=""></div>
        <a href="#calc" class="btn btn--primary btn--block">Calculate my footprint →</a>

        <h2 class="h2 why-it-matters">Why it matters</h2>
        <div class="boxes">
          ${stat('server', '#1', 'Virginia hosts more data centers than anywhere else on Earth.')}
          ${stat('bolt', '25%', 'of Virginia’s electricity goes to data centers.')}
          ${stat('drop', '19 million liters', 'of water a day can go to cooling data centers.')}
        </div>

        <h2 class="h2 how-it-works">How it works</h2>
        <div class="steps">
          <div class="step"><span class="step__num">1</span>Tell us your AI habits</div>
          <div class="step"><span class="step__num">2</span>See your footprint in things you can picture</div>
          <div class="step"><span class="step__num">3</span>Get tips to shrink it &amp; share your card</div>
          <div class="step"><span class="step__num">4</span>Lessen the impact of AI usage on our green world.</div>
        </div>`,
    },

    calc: {
      title: 'Real-AI-ze',
      sheet: true,
      render: () => {
        const h = state.habits;
        const slider = (key, label, help, max) => `
          <div class="field">
            <div class="field__head"><span class="field__label">${label}</span><span class="pill" id="v-${key}">${h[key]}</span></div>
            <span class="field__help">${help}</span>
            <input type="range" min="0" max="${max}" step="1" value="${h[key]}" data-key="${key}" aria-label="${label}">
            <div class="range-labels"><span>0</span><span>${max}</span></div>
          </div>`;
        const chip = (val, label) => `<button class="chip" data-model="${val}" aria-pressed="${h.model === val}">${label}</button>`;
        return `
          <div class="stack">
            <p class="eyebrow">Step 1 of 2</p>
            <h1 class="h1 h1--sm">How do you use AI?</h1>
            <div class="progress"><div style="width:50%"></div></div>
          </div>
          ${slider('chatsPerDay', 'AI chats per day', 'Each message you send counts', 100)}
          ${slider('imagesPerWeek', 'AI images per week', 'Image generators &amp; AI filters', 50)}
          ${slider('videosPerMonth', 'AI videos per month', 'These cost the most!', 20)}
          <div class="field">
            <span class="field__label">Which AI do you use most?</span>
            <div class="chips">
              ${chip('small', 'Small / fast')}${chip('standard', 'Standard')}${chip('large', 'Large / reasoning')}${chip('unsure', 'Not sure')}
            </div>
          </div>
          <div class="field">
            <label class="field__label" for="loc">Where do you live?</label>
            <select id="loc">
              ${Object.entries(LOCATION).map(([k, v]) => `<option value="${k}" ${h.location === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
          </div>
          <div class="estimate-sheet">
            <p class="eyebrow">Live estimate · per year</p>
            <div class="estimate-sheet__row" id="live"></div>
            <a href="#results" class="btn btn--primary btn--block">See my results →</a>
          </div>`;
      },
      bind: (root) => {
        const live = root.querySelector('#live');
        const paint = () => {
          const f = baseline();
          live.innerHTML = [[fmt(f.kWh) + ' kWh', 'Energy'], [fmt(f.water) + ' L', 'Water'], [fmt(f.co2) + ' kg', 'CO₂']]
            .map(([v, l]) => `<div><div class="estimate-sheet__value">${v}</div><div class="estimate-sheet__label">${l}</div></div>`).join('');
        };
        root.querySelectorAll('input[type=range]').forEach((r) => {
          const setFill = () => r.style.setProperty('--pct', (r.value / r.max) * 100 + '%');
          setFill();
          r.addEventListener('input', () => {
            state.habits[r.dataset.key] = Number(r.value);
            root.querySelector('#v-' + r.dataset.key).textContent = r.value;
            setFill(); paint(); save();
          });
        });
        root.querySelectorAll('[data-model]').forEach((b) => b.addEventListener('click', () => {
          state.habits.model = b.dataset.model;
          root.querySelectorAll('[data-model]').forEach((x) => x.setAttribute('aria-pressed', x === b));
          paint(); save();
        }));
        root.querySelector('#loc').addEventListener('change', (e) => { state.habits.location = e.target.value; paint(); save(); });
        paint();
      },
    },

    results: {
      title: 'Real-AI-ze',
      render: () => {
        const h = state.habits, f = baseline();
        const avg = footprint({ ...F.averageStudent, location: h.location });
        const light = footprint({ ...F.lightUser, location: h.location });
        const max = Math.max(f.water, avg.water, light.water) || 1;
        const bar = (label, v, you) => `
          <div class="bar"><span class="bar__label">${label}</span>
            <div class="bar__track"><div class="bar__fill ${you ? 'bar__fill--you' : ''}" style="width:${(v / max) * 100}%"></div></div>
            <span class="bar__value">${fmt(v)} L</span></div>`;
        const vaLiters = avg.water * F.virginiaHighSchoolers;
        const modelName = { small: 'small model', standard: 'standard model', large: 'large model', unsure: 'standard model' }[h.model];
        return `
          <div class="stack">
            <h1 class="h1 h1--sm">Your AI use adds up to this every year</h1>
            <p class="muted">${h.chatsPerDay} chats/day · ${h.imagesPerWeek} images/wk · ${h.videosPerMonth} videos/mo · ${modelName} · ${LOCATION[h.location].label}</p>
          </div>
          <div class="card card--dark">
            <p class="eyebrow">Water</p>
            <div class="big">${fmt(f.water)} liters</div>
            <p class="muted">to cool data centers and generate their power</p>
          </div>
          <div class="row">
            ${stat('bolt', fmt(f.kWh) + ' kWh', 'Electricity')}
            ${stat('cloud', fmt(f.co2) + ' kg', 'CO₂')}
          </div>
          <h2 class="h2">That’s the same as…</h2>
          <div class="row">
            ${stat('bottle', fmt(f.water / 0.5), 'water bottles (500 mL)')}
            ${stat('phone', fmt(f.kWh / F.phoneChargeKWh), 'full phone charges')}
            ${stat('car', fmt(f.co2 / F.carKgCO2PerMile) + ' mi', 'driven in a gas car')}
            ${stat('tv', fmt(f.kWh / F.streamingKWhPerHour) + ' hrs', 'of HD streaming')}
          </div>
          <div class="card">
            <h3>You vs. the average student</h3>
            ${bar('You', f.water, true)}${bar('Avg.', avg.water)}${bar('Light', light.water)}
          </div>
          <div class="card card--soft">
            <p class="eyebrow">The Virginia lens</p>
            <p><strong>If every Virginia high schooler used AI like the average student…</strong></p>
            <div class="stat__value">${fmt(vaLiters)} liters / yr</div>
            <p class="muted">≈ ${fmt(vaLiters / F.olympicPoolLiters)} Olympic pools of water</p>
          </div>
          <a href="#act" class="btn btn--primary btn--block">Shrink my footprint →</a>
          <div class="row">
            <a href="#act" class="btn">Share card</a>
            <a href="#calc" class="btn">Recalculate</a>
          </div>`;
      },
    },

    act: {
      title: 'Real-AI-ze',
      render: () => {
        const b = baseline(), a = after();
        const max = b.water || 1;
        return `
          <div class="stack">
            <h1 class="h1 h1--sm">Shrink your footprint</h1>
            <p class="muted">Tap the changes you’ll actually make.</p>
          </div>
          <div class="card card--soft" id="ba">
            <p class="eyebrow">Your new footprint</p>
            <div class="bar"><span class="bar__label">Before</span><div class="bar__track"><div class="bar__fill" style="width:100%"></div></div><span class="bar__value">${fmt(b.water)} L</span></div>
            <div class="bar"><span class="bar__label">After</span><div class="bar__track"><div class="bar__fill bar__fill--you" style="width:${(a.water / max) * 100}%"></div></div><span class="bar__value">${fmt(a.water)} L</span></div>
            <div class="h2">−${pct(b.water, a.water)}% water · −${pct(b.co2, a.co2)}% CO₂</div>
          </div>
          <div class="stack-lg">
            ${TIPS.map((t) => {
              const solo = withTips(state.habits, [t.id]);
              const save = t.co2Factor && !t.apply ? `−${pct(b.co2, solo.co2)}% CO₂` : `−${pct(b.water, solo.water)}%`;
              return `<button class="tip" data-tip="${t.id}" aria-pressed="${state.tips.includes(t.id)}">
                <span class="tip__box">${ICON.check}</span>
                <span class="tip__copy"><span class="tip__title">${t.title}</span><span class="tip__desc">${t.desc}</span></span>
                <span class="tip__save">${save}</span></button>`;
            }).join('')}
          </div>
          ${state.pledged
            ? `<p class="pledged">✓ You took the pledge. Nice!</p>`
            : `<button class="btn btn--primary btn--block" id="pledge">Take the pledge ✓</button>`}
          <h2 class="h2">Share your card</h2>
          <canvas class="share-card" id="card" width="1080" height="1080"></canvas>
          <button class="btn btn--block" id="share">Share…</button>`;
      },
      bind: (root) => {
        root.querySelectorAll('[data-tip]').forEach((btn) => btn.addEventListener('click', () => {
          const id = btn.dataset.tip;
          state.tips = state.tips.includes(id) ? state.tips.filter((x) => x !== id) : [...state.tips, id];
          save(); route();
        }));
        root.querySelector('#pledge')?.addEventListener('click', () => { state.pledged = true; save(); route(); });
        drawCard(root.querySelector('#card'));
        root.querySelector('#share').addEventListener('click', () => shareCard(root.querySelector('#card')));
      },
    },
  };

  function drawCard(cv) {
    const c = cv.getContext('2d'), b = baseline(), a = after();
    const g = c.createLinearGradient(0, 0, 0, 1080);
    g.addColorStop(0, '#0a171c'); g.addColorStop(1, '#0e3a40');
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1080);
    c.fillStyle = 'rgba(79,209,217,.16)'; c.fillRect(0, 760, 1080, 320);
    c.fillStyle = '#4fd1d9'; c.fillRect(0, 760, 1080, 6);
    c.fillStyle = '#4fd1d9'; c.font = '600 40px -apple-system, Inter, sans-serif'; c.fillText('MY AI FOOTPRINT', 80, 140);
    c.fillStyle = '#fff'; c.font = '800 150px -apple-system, Inter, sans-serif'; c.fillText(fmt(b.water) + ' L', 80, 320);
    c.fillStyle = '#a9bcc0'; c.font = '400 44px -apple-system, Inter, sans-serif'; c.fillText('of water a year from my AI use', 80, 400);
    c.fillStyle = '#fff'; c.font = '700 64px -apple-system, Inter, sans-serif';
    c.fillText(`→ ${fmt(a.water)} L with my changes`, 80, 560);
    c.fillStyle = '#77d0a3'; c.font = '600 48px -apple-system, Inter, sans-serif';
    c.fillText(`−${pct(b.water, a.water)}% water · −${pct(b.co2, a.co2)}% CO₂`, 80, 640);
    c.fillStyle = '#fff'; c.font = '700 48px -apple-system, Inter, sans-serif'; c.fillText('Real-AI-ze', 80, 900);
    c.fillStyle = '#a9bcc0'; c.font = '400 36px -apple-system, Inter, sans-serif'; c.fillText('What does your AI habit cost? · 804 Hacks', 80, 960);
  }

  async function shareCard(cv) {
    const text = `My AI use costs ~${fmt(baseline().water)} L of water a year. I'm cutting it ${pct(baseline().water, after().water)}% with Real-AI-ze.`;
    try {
      const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
      const file = new File([blob], 'my-ai-footprint.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) return await navigator.share({ files: [file], text });
      if (navigator.share) return await navigator.share({ text });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
    } catch (e) { /* user cancelled share */ }
  }

  const view = document.getElementById('view');
  function route() {
    const key = (location.hash || '#home').slice(1);
    const s = screens[key] || screens.home;
    document.getElementById('page-title').textContent = s.title;
    document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === key || (!screens[key] && a.dataset.tab === 'home')));
    view.classList.toggle('has-sheet', !!s.sheet);
    const scroll = view.dataset.key === key ? window.scrollY : 0;
    view.innerHTML = s.render();
    view.dataset.key = key;
    s.bind?.(view);
    window.scrollTo(0, scroll);
  }
  window.addEventListener('hashchange', () => { view.classList.remove('fade-in'); void view.offsetWidth; view.classList.add('fade-in'); route(); });
  document.getElementById('info-btn').addEventListener('click', () => document.getElementById('info-dialog').showModal());
  route();
})();
