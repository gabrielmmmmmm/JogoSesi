let _ctx = null;
let _master = null;
let _musicGain = null;
let _sfxGain = null;
let _unlocked = false;

let _bossMusic = null;

function _ensure() {
  if (_ctx) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  _ctx = new AudioContext();
  _master = _ctx.createGain();
  _master.gain.value = 0.75;
  _master.connect(_ctx.destination);

  _musicGain = _ctx.createGain();
  _musicGain.gain.value = 0.55;
  _musicGain.connect(_master);

  _sfxGain = _ctx.createGain();
  _sfxGain.gain.value = 0.9;
  _sfxGain.connect(_master);
}

function _now() {
  return _ctx.currentTime;
}

function _osc(type, freq, t0, dur, gain, dest) {
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  return { o, g };
}

function _noise(t0, dur, gain, dest) {
  const bufferSize = Math.max(1, Math.floor(_ctx.sampleRate * dur));
  const buffer = _ctx.createBuffer(1, bufferSize, _ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.9;
  }
  const src = _ctx.createBufferSource();
  src.buffer = buffer;

  const filter = _ctx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(250, t0);

  const g = _ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(dest);

  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

function _sweep(type, f0, f1, t0, dur, gain, dest) {
  const o = _ctx.createOscillator();
  const g = _ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function _playSfx(name) {
  if (!_unlocked) return;
  const t0 = _now();

  if (name === 'shoot') {
    _sweep('square', 820, 240, t0, 0.07, 0.16, _sfxGain);
    _noise(t0, 0.03, 0.05, _sfxGain);
    return;
  }

  if (name === 'damage') {
    _sweep('sawtooth', 520, 120, t0, 0.12, 0.22, _sfxGain);
    _osc('square', 80, t0, 0.12, 0.10, _sfxGain);
    return;
  }

  if (name === 'sawHit') {
    _sweep('triangle', 740, 180, t0, 0.09, 0.18, _sfxGain);
    _noise(t0, 0.06, 0.10, _sfxGain);
    return;
  }

  if (name === 'lava') {
    _noise(t0, 0.16, 0.18, _sfxGain);
    _sweep('sine', 220, 70, t0, 0.18, 0.12, _sfxGain);
    return;
  }

  if (name === 'portal') {
    _sweep('triangle', 300, 900, t0, 0.16, 0.16, _sfxGain);
    _sweep('sine', 160, 420, t0, 0.18, 0.10, _sfxGain);
    return;
  }

  if (name === 'bossHit') {
    _osc('square', 110, t0, 0.10, 0.10, _sfxGain);
    _sweep('sawtooth', 420, 160, t0, 0.10, 0.14, _sfxGain);
    return;
  }

  if (name === 'bossWin') {
    _osc('triangle', 440, t0, 0.16, 0.12, _sfxGain);
    _osc('triangle', 660, t0 + 0.06, 0.18, 0.10, _sfxGain);
    _osc('triangle', 880, t0 + 0.12, 0.22, 0.08, _sfxGain);
    return;
  }
}

function _stopBossMusic() {
  if (!_bossMusic) return;
  try {
    _bossMusic.stop();
  } finally {
    _bossMusic = null;
  }
}

function _startBossMusic() {
  if (!_unlocked) return;
  _stopBossMusic();

  const tempo = 108;
  const stepDur = 60 / tempo / 2;
  const tStart = _now() + 0.02;

  const out = _ctx.createGain();
  out.gain.value = 0.35;
  out.connect(_musicGain);

  const bass = _ctx.createOscillator();
  const bassGain = _ctx.createGain();
  bass.type = 'sawtooth';
  bassGain.gain.value = 0.07;
  bass.connect(bassGain);
  bassGain.connect(out);

  const lead = _ctx.createOscillator();
  const leadGain = _ctx.createGain();
  lead.type = 'square';
  leadGain.gain.value = 0.04;
  lead.connect(leadGain);
  leadGain.connect(out);

  const drumGain = _ctx.createGain();
  drumGain.gain.value = 0.22;
  drumGain.connect(out);

  const bassSeq = [55, 55, 65.4, 55, 49, 49, 55, 49];
  const leadSeq = [220, 247, 262, 294, 262, 247, 220, 196];

  let step = 0;
  let timer = null;

  const tick = () => {
    const t = _now();
    const b = bassSeq[step % bassSeq.length];
    const l = leadSeq[step % leadSeq.length];
    bass.frequency.setValueAtTime(b, t);
    lead.frequency.setValueAtTime(l, t);

    if (step % 2 === 0) {
      _noise(t, 0.05, 0.14, drumGain);
      _osc('sine', 70, t, 0.08, 0.12, drumGain);
    } else if (step % 4 === 3) {
      _noise(t, 0.03, 0.08, drumGain);
    }

    step++;
  };

  bass.start(tStart);
  lead.start(tStart);

  timer = setInterval(tick, stepDur * 1000);

  _bossMusic = {
    stop() {
      clearInterval(timer);
      const t = _now();
      out.gain.setTargetAtTime(0.0001, t, 0.06);
      bass.stop(t + 0.12);
      lead.stop(t + 0.12);
      setTimeout(() => {
        try {
          out.disconnect();
        } catch {}
      }, 300);
    },
  };
}

export const AudioManager = {
  ensure() {
    _ensure();
  },

  unlock() {
    _ensure();
    if (_ctx.state === 'suspended') {
      _ctx.resume();
    }
    _unlocked = true;
  },

  isUnlocked() {
    return _unlocked;
  },

  sfx(name) {
    _ensure();
    _playSfx(name);
  },

  startBossMusic() {
    _ensure();
    _startBossMusic();
  },

  stopBossMusic() {
    _ensure();
    _stopBossMusic();
  },
};
