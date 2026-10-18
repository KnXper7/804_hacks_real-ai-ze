// =====================================================================
// Real-AI-ze — estimate constants
// ⚠️  ROUGH PLACEHOLDER estimates so the app works end to end.
//     VERIFY every number against a real source before the demo.
// =====================================================================

window.FACTORS = {
  waterLitersPerKWh: 2.0,     // cooling + water used to make the electricity. TODO verify
  co2KgPerKWh: 0.3,           // Virginia grid. TODO verify (EIA Virginia state profile)
  pricePerKWh: 0.14,          // Virginia residential electricity, $/kWh. TODO verify (EIA)

  bottleLiters: 0.5,          // one water bottle
  carKgCO2PerMile: 0.4,       // average gas car (EPA ~400 g/mile)

  // Results visuals: the water tank / cash pile are 90% full at these yearly amounts.
  // `curve` < 1 makes smaller amounts still look big (1 = straight line).
  visual: { waterFullAt: 50, cashFullAt: 5, curve: 0.4 },

  // Rating scale (yearly kWh). At or below `best` = 10/10, at or above `worst` = 1/10.
  rating: { best: 0.5, worst: 50 },
};

// Things the user can track on the Calculator. `core` ones are always shown;
// the rest can be added with "+ Add more". Energy is per item, in watt-hours (Wh).
window.ACTIVITIES = [
  { id: 'small',    core: true, label: 'Small prompts',       help: 'Quick questions, short replies, simple fixes',      unit: '/ week',         max: 500, step: 5, start: 100, wh: 0.3 },  // TODO verify (e.g. Google 2025 Gemini report, Epoch AI 2025)
  { id: 'big',      core: true, label: 'Big prompts',         help: 'Essays, long code, file uploads, “thinking” models', unit: '/ week',         max: 200, step: 1, start: 20,  wh: 3 },    // TODO verify
  { id: 'image',    label: 'AI images',                       help: 'Image generators and AI photo filters',             unit: '/ week',         max: 50,  step: 1, start: 5,   wh: 3 },    // TODO verify
  { id: 'video',    label: 'AI videos',                       help: 'Short AI video clips — these cost the most',        unit: '/ week',         max: 20,  step: 1, start: 1,   wh: 100 },  // TODO verify (estimates vary a lot)
  { id: 'voice',    label: 'AI voice chat',                   help: 'Talking out loud with an AI assistant',             unit: 'minutes / week', max: 300, step: 5, start: 30,  wh: 1 },    // TODO verify
  { id: 'research', label: 'Deep research tasks',             help: 'AI agents that browse and write long reports',      unit: '/ week',         max: 20,  step: 1, start: 2,   wh: 20 },   // TODO verify
  { id: 'music',    label: 'AI songs',                        help: 'AI music generators',                               unit: '/ week',         max: 30,  step: 1, start: 2,   wh: 10 },   // TODO verify
  { id: 'files',    label: 'File & PDF summaries',            help: 'Uploading documents for the AI to read',            unit: '/ week',         max: 50,  step: 1, start: 5,   wh: 2 },    // TODO verify
];

window.RATING_TEXT = [
  { min: 9, text: 'Great job — your AI use is light on the planet.' },
  { min: 7, text: 'Pretty good — a few small changes would make it even better.' },
  { min: 5, text: 'About average — your AI habits use a noticeable amount of water and power.' },
  { min: 3, text: 'Heavy — your AI use adds up to a real cost for the planet.' },
  { min: 0, text: 'Very heavy — cutting back on big prompts and images would help a lot.' },
];
