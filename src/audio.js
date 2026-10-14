export function createAudio() {
  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem('jgsg-mute') === '1';
  } catch {
    muted = false;
  }

  function ac() {
    if (muted) return null;
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function tone(freq, duration, type, gainValue, delay = 0) {
    const c = ac();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const start = c.currentTime + delay;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function knock(freq, gainValue) {
    const c = ac();
    if (!c) return;
    const length = Math.floor(c.sampleRate * 0.09);
    const buffer = c.createBuffer(1, length, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
    const source = c.createBufferSource();
    source.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = c.createGain();
    gain.gain.value = gainValue;
    source.connect(filter).connect(gain).connect(c.destination);
    source.start();
    tone(freq / 3, 0.12, 'sine', gainValue * 0.35);
  }

  return {
    get muted() {
      return muted;
    },
    toggle() {
      muted = !muted;
      try {
        localStorage.setItem('jgsg-mute', muted ? '1' : '0');
      } catch {
        /* ignore */
      }
      return muted;
    },
    place(player) {
      if (player === 'X') knock(540, 0.18);
      else {
        tone(620, 0.18, 'sine', 0.05);
        tone(930, 0.22, 'triangle', 0.03);
      }
    },
    vanish() {
      tone(360, 0.16, 'sine', 0.04);
      tone(220, 0.2, 'triangle', 0.03, 0.04);
    },
    fanfare(kind) {
      if (kind === 'draw') {
        tone(311, 0.28, 'sine', 0.04);
        tone(247, 0.36, 'sine', 0.04, 0.12);
        return;
      }
      [523, 659, 784, 1046].forEach((freq, i) => tone(freq, 0.28, 'triangle', 0.045, i * 0.09));
    },
  };
}
