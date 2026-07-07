/* Speech synthesis, beep, and wake lock utilities. */

const VoiceEngine = (() => {
  let cachedVoice = null;
  let volume = parseFloat(localStorage.getItem('hiit_voice_volume')) || 0.8;

  function pickVoice() {
    if (cachedVoice) return cachedVoice;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    const preferred = ['Samantha', 'Google US English', 'Alex', 'Victoria'];
    for (const name of preferred) {
      const v = voices.find(v => v.name === name);
      if (v) { cachedVoice = v; return v; }
    }
    const enUS = voices.find(v => v.lang === 'en-US');
    if (enUS) { cachedVoice = enUS; return enUS; }
    const en = voices.find(v => v.lang && v.lang.startsWith('en'));
    cachedVoice = en || voices[0];
    return cachedVoice;
  }

  if (typeof speechSynthesis !== 'undefined') {
    speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickVoice(); };
  }

  function setVolume(v) {
    volume = Math.min(1, Math.max(0.5, v));
    localStorage.setItem('hiit_voice_volume', String(volume));
  }
  function getVolume() { return volume; }

  /* Unlocks speech synthesis on iOS Safari: must be called directly inside
     a user gesture (e.g. the Start Workout tap). */
  function unlock() {
    try {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      speechSynthesis.speak(u);
      pickVoice();
    } catch (e) { /* no-op */ }
  }

  function cancelAll() {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  }

  function speak(text, { rate = 0.95 } = {}) {
    if (typeof speechSynthesis === 'undefined' || !text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.volume = volume;
    u.pitch = 1.0;
    const v = pickVoice();
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }

  /* Rough estimate of spoken duration in seconds, used to auto-extend rest
     windows that can't fit their full exercise explanation. */
  function estimateSpeechSeconds(text, rate = 0.95) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const wordsPerSecond = 2.4 * rate;
    return words / wordsPerSecond;
  }

  return { speak, unlock, cancelAll, setVolume, getVolume, estimateSpeechSeconds, pickVoice };
})();

const BeepEngine = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, startTime, duration, gainPeak = 0.22) {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
    gain.gain.linearRampToValueAtTime(0, startTime + duration);
    osc.connect(gain).connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  function beep() {
    try {
      const c = getCtx();
      tone(880, c.currentTime, 0.15);
    } catch (e) { /* no-op */ }
  }

  function tripleBeep() {
    try {
      const c = getCtx();
      const now = c.currentTime;
      tone(880, now, 0.14);
      tone(1046, now + 0.2, 0.14);
      tone(1318, now + 0.4, 0.22);
    } catch (e) { /* no-op */ }
  }

  function unlock() {
    try { getCtx(); } catch (e) { /* no-op */ }
  }

  return { beep, tripleBeep, unlock };
})();

const WakeLockManager = (() => {
  let sentinel = null;
  let wanted = false;

  async function request() {
    wanted = true;
    if (!('wakeLock' in navigator)) return;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
    } catch (e) { sentinel = null; }
  }

  async function release() {
    wanted = false;
    if (sentinel) {
      try { await sentinel.release(); } catch (e) { /* no-op */ }
      sentinel = null;
    }
  }

  document.addEventListener('visibilitychange', async () => {
    if (wanted && document.visibilityState === 'visible' && !sentinel) {
      await request();
    }
  });

  return { request, release };
})();
