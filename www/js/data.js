// =====================================================================
// Real-AI-ze — estimate constants
// ---------------------------------------------------------------------
// ⚠️  These are ROUGH, PLACEHOLDER estimates so the app works end to end.
//     VERIFY every number against a real source before the demo and
//     update the `source` notes. Judges WILL ask where numbers come from.
// =====================================================================

window.FACTORS = {
  // Energy per activity, in watt-hours (Wh) — "Standard" model baseline
  energyWh: {
    chat: 0.3,    // per text prompt. TODO verify (e.g. Google 2025 Gemini report, Epoch AI 2025)
    image: 3,     // per generated image. TODO verify
    video: 100,   // per short AI video clip. TODO verify (estimates vary a LOT)
  },

  // Water per kWh, in liters (on-site cooling + water used to generate the electricity)
  // TODO verify (e.g. Li et al. "Making AI Less Thirsty", LBNL 2024 data center report)
  waterLitersPerKWh: 2.0,

  // Virginia grid carbon intensity, kg CO2 per kWh. TODO verify (EIA Virginia state profile / PJM)
  co2KgPerKWh: 0.3,

  // Multiplier by model size
  model: {
    small: 0.5,
    standard: 1,
    large: 4,     // reasoning models "think" longer → more compute
    unsure: 1,
  },

  // ---- Everyday equivalents ----
  bathtubLiters: 150,      // a full bathtub
  phoneChargeKWh: 0.015,   // one full smartphone charge
  carKgCO2PerMile: 0.4,    // average gas car (EPA ~400 g/mile)
  streamingKWhPerHour: 0.08, // HD video streaming incl. network. TODO verify
  olympicPoolLiters: 2500000,

  // ---- Virginia lens ----
  virginiaHighSchoolers: 400000, // TODO verify (VDOE fall membership, grades 9–12)
  averageStudent: { chatsPerDay: 15, imagesPerWeek: 3, videosPerMonth: 0, model: 'standard' }, // TODO: survey your hackathon!
  lightUser:      { chatsPerDay: 3,  imagesPerWeek: 0, videosPerMonth: 0, model: 'small' },
};

// Tips on the "Take Action" screen. `apply` receives a copy of the habits and
// returns modified habits; `co2Factor` scales CO2 only (cleaner grid hours).
window.TIPS = [
  { id: 'small',  title: 'Use a smaller model for simple stuff', desc: 'Quick facts don’t need the biggest AI',
    apply: h => ({ ...h, chatModelShare: 0.5 }) },
  { id: 'batch',  title: 'Batch questions into one prompt',      desc: 'One detailed message, not five',
    apply: h => ({ ...h, chatsPerDay: h.chatsPerDay * 0.7 }) },
  { id: 'images', title: 'Skip AI images you don’t need',          desc: 'Images cost way more than text',
    apply: h => ({ ...h, imagesPerWeek: h.imagesPerWeek * 0.5, videosPerMonth: h.videosPerMonth * 0.5 }) },
  { id: 'clean',  title: 'Use AI when the grid is cleanest',       desc: 'Greener hours in Virginia (CO₂ only)',
    co2Factor: 0.8 },
  { id: 'auto',   title: 'Turn off auto-AI features',              desc: 'Auto-summaries run on every search',
    apply: h => ({ ...h, chatsPerDay: h.chatsPerDay * 0.9 }) },
];
