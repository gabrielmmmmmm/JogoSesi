function rand(seed) {
  let t = seed + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pick(arr, r) {
  return arr[Math.floor(r * arr.length)];
}

export function generateSubLevel(phaseIndex, subLevelIndex) {
  const width = 2200 + phaseIndex * 140 + subLevelIndex * 90;
  const height = 540;
  const seed = phaseIndex * 100 + subLevelIndex * 7 + 42;

  const baseY = 510;

  const platforms = [{ x: width / 2, y: baseY, w: width, h: 60 }];

  const steps = 8 + phaseIndex;
  let x = 380;
  let y = 420;

  // Keep parkours jumpable with current player tuning
  const gapMin = phaseIndex >= 5 ? 170 : 220;
  const gapMax = phaseIndex >= 5 ? 240 : 300;
  const upStepMax = phaseIndex >= 5 ? -55 : -70;
  const downStepMax = phaseIndex >= 5 ? 30 : 40;

  for (let i = 0; i < steps; i++) {
    const r1 = rand(seed + i * 11);
    const r2 = rand(seed + i * 13);

    const dx = gapMin + r1 * (gapMax - gapMin);
    x += dx;

    const dyOptions =
      phaseIndex < 2
        ? [-45, -20, 0, 15]
        : [upStepMax, Math.floor(upStepMax * 0.7), -20, 0, 15, downStepMax];
    y += pick(dyOptions, r2);
    y = Math.max(200, Math.min(440, y));

    const w = 150 + Math.floor(r2 * 120);
    platforms.push({ x, y, w, h: 26 });
  }

  // Portal is placed near the last generated platform
  const lastPlat = platforms[platforms.length - 1];
  const portal = {
    x: Math.min(width - 140, lastPlat.x + Math.max(40, lastPlat.w * 0.25)),
    y: Math.min(440, lastPlat.y - 40),
  };

  const hazards = [];

  // Moving saws
  const saws = [];
  const sawCount = Math.min(1 + Math.floor(phaseIndex / 2), 5);
  for (let i = 0; i < sawCount; i++) {
    const r1 = rand(seed + 900 + i * 7);
    const r2 = rand(seed + 920 + i * 11);
    const r3 = rand(seed + 940 + i * 13);
    const sx = 520 + r1 * (width - 1040);
    const sy = 200 + r2 * 220;
    const range = 120 + r3 * 220;
    const speed = 90 + phaseIndex * 10 + r2 * 40;
    saws.push({ x: sx, y: sy, range, speed });
  }

  // Troll platforms (some fall / some disappear after touch)
  const trollPlatforms = [];
  const disableTrollPlatforms = phaseIndex === 9 && subLevelIndex === 1;
  if (!disableTrollPlatforms) {
    const trollCount = Math.min(1 + Math.floor((phaseIndex + subLevelIndex) / 2), 6);
    for (let i = 0; i < trollCount; i++) {
      const r1 = rand(seed + 1200 + i * 19);
      const idx = 1 + Math.floor(r1 * Math.max(1, platforms.length - 2));
      const kind = 'vanish';
      trollPlatforms.push({ index: idx, kind, delayMs: 160 + Math.floor(r1 * 220) });
    }
  }

  const pickups = [];
  const pkCount = 2 + Math.min(phaseIndex, 3);
  for (let i = 0; i < pkCount; i++) {
    const r1 = rand(seed + 600 + i * 17);
    const r2 = rand(seed + 700 + i * 19);
    const px = 420 + r1 * (width - 840);
    const py = 220 + r2 * 180;
    pickups.push({ x: px, y: py, type: 'scrap' });
  }

  return {
    key: `PH${phaseIndex + 1}_S${subLevelIndex + 1}`,
    name: `Fase ${phaseIndex + 1} — Parkour ${subLevelIndex + 1}/5`,
    width,
    height,
    spawn: { x: 120, y: 380 },
    portal,
    platforms,
    hazards,
    saws,
    trollPlatforms,
    pickups,
  };
}
