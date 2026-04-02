const STORAGE_KEY = 'noah_sesi_state_v1';

const DEFAULT_STATE = {
  phaseIndex: 0,
  unlockedPhaseIndex: 0,
  subLevelIndex: 0,
  odsUnlocked: Array(10).fill(false),
  bossHp: Array(10).fill(null),
  deathCount: 0,
};

function clampInt(n, min, max) {
  const v = Number.isFinite(n) ? Math.floor(n) : min;
  return Math.max(min, Math.min(max, v));
}

export const GameState = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE, odsUnlocked: [...DEFAULT_STATE.odsUnlocked] };
      const parsed = JSON.parse(raw);
      const ods = Array.isArray(parsed.odsUnlocked) ? parsed.odsUnlocked.map(Boolean) : [];
      const odsNormalized = Array(10)
        .fill(false)
        .map((_, i) => Boolean(ods[i]));

      const bossHpArr = Array.isArray(parsed.bossHp) ? parsed.bossHp : [];
      const bossHpNormalized = Array(10)
        .fill(null)
        .map((_, i) => {
          const v = bossHpArr[i];
          return Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null;
        });

      return {
        phaseIndex: clampInt(parsed.phaseIndex, 0, 9),
        unlockedPhaseIndex: clampInt(parsed.unlockedPhaseIndex, 0, 9),
        subLevelIndex: clampInt(parsed.subLevelIndex, 0, 4),
        odsUnlocked: odsNormalized,
        bossHp: bossHpNormalized,
        deathCount: clampInt(parsed.deathCount, 0, 999),
      };
    } catch {
      return { ...DEFAULT_STATE, odsUnlocked: [...DEFAULT_STATE.odsUnlocked] };
    }
  },

  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },

  reset() {
    const s = { ...DEFAULT_STATE, odsUnlocked: [...DEFAULT_STATE.odsUnlocked] };
    this.save(s);
    return s;
  },

  getBossHp(phaseIndex) {
    const s = this.load();
    const idx = clampInt(phaseIndex, 0, 9);
    const v = s.bossHp?.[idx];
    return Number.isFinite(v) ? v : null;
  },

  setBossHp(phaseIndex, hp) {
    const s = this.load();
    const idx = clampInt(phaseIndex, 0, 9);
    s.bossHp = Array.isArray(s.bossHp) ? s.bossHp : Array(10).fill(null);
    s.bossHp[idx] = Number.isFinite(hp) ? Math.max(0, Math.floor(hp)) : null;
    this.save(s);
    return s;
  },

  clearBossHp(phaseIndex) {
    const s = this.load();
    const idx = clampInt(phaseIndex, 0, 9);
    s.bossHp = Array.isArray(s.bossHp) ? s.bossHp : Array(10).fill(null);
    s.bossHp[idx] = null;
    this.save(s);
    return s;
  },

  unlockOds(phaseIndex) {
    const s = this.load();
    const idx = clampInt(phaseIndex, 0, 9);
    s.odsUnlocked[idx] = true;
    this.save(s);
    return s;
  },

  setProgress({ phaseIndex, unlockedPhaseIndex, subLevelIndex }) {
    const s = this.load();
    if (phaseIndex !== undefined) s.phaseIndex = clampInt(phaseIndex, 0, 9);
    if (unlockedPhaseIndex !== undefined) s.unlockedPhaseIndex = clampInt(unlockedPhaseIndex, 0, 9);
    if (subLevelIndex !== undefined) s.subLevelIndex = clampInt(subLevelIndex, 0, 4);
    this.save(s);
    return s;
  },

  registerDeath(currentPhaseIndex) {
    const s = this.load();
    s.deathCount = clampInt((s.deathCount ?? 0) + 1, 0, 999);

    const gameOver = s.deathCount >= 7;
    if (gameOver) {
      const reset = this.reset();
      return { ...reset, gameOver: true };
    }

    this.save(s);
    return { ...s, gameOver: false };
  },

  allOdsUnlocked() {
    const s = this.load();
    return s.odsUnlocked.every(Boolean);
  },
};
