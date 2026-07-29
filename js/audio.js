/* Pre-recorded voice clip playback, beeps, and wake lock utilities.

   Voice lines are rendered offline (tools/gen_clips.py, macOS `say`) rather
   than spoken live via speechSynthesis. iOS treats speechSynthesis as an
   interrupting audio session that pauses/ducks background music (Spotify,
   Apple Music); regular decoded-buffer playback through Web Audio does not
   trigger that same interruption, which is the whole reason this exists. */

const AudioEngine = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function unlock() {
    try { getCtx(); } catch (e) { /* no-op */ }
  }
  return { getCtx, unlock };
})();

const BeepEngine = (() => {
  function tone(freq, startTime, duration, gainPeak = 0.22) {
    const c = AudioEngine.getCtx();
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
      const c = AudioEngine.getCtx();
      tone(880, c.currentTime, 0.15);
    } catch (e) { /* no-op */ }
  }

  function tripleBeep() {
    try {
      const c = AudioEngine.getCtx();
      const now = c.currentTime;
      tone(880, now, 0.14);
      tone(1046, now + 0.2, 0.14);
      tone(1318, now + 0.4, 0.22);
    } catch (e) { /* no-op */ }
  }

  return { beep, tripleBeep, unlock: AudioEngine.unlock };
})();

const ClipVoice = (() => {
  let volume = parseFloat(localStorage.getItem('hiit_voice_volume')) || 0.8;
  const bufferCache = new Map(); // key -> decoded AudioBuffer
  const inflight = new Map();    // key -> in-progress decode promise
  let activeSources = [];        // currently scheduled/playing source nodes

  function setVolume(v) {
    volume = Math.min(1, Math.max(0.5, v));
    localStorage.setItem('hiit_voice_volume', String(volume));
  }
  function getVolume() { return volume; }

  async function loadBuffer(key) {
    if (bufferCache.has(key)) return bufferCache.get(key);
    if (inflight.has(key)) return inflight.get(key);
    const entry = AUDIO_CLIPS[key];
    if (!entry) return null;
    const promise = fetch(entry.file)
      .then(res => res.arrayBuffer())
      .then(ab => AudioEngine.getCtx().decodeAudioData(ab))
      .then(buf => { bufferCache.set(key, buf); inflight.delete(key); return buf; })
      .catch(() => { inflight.delete(key); return null; });
    inflight.set(key, promise);
    return promise;
  }

  /* Warms the decode cache for a set of clip keys ahead of time so playback
     during the workout has zero latency. Fire-and-forget. */
  function preload(keys) {
    keys.forEach(k => { if (k) loadBuffer(k); });
  }

  function clipDuration(key) {
    const entry = AUDIO_CLIPS[key];
    return entry ? entry.duration : 0;
  }

  /* Schedules a list of clip keys to play back-to-back, gapless, starting
     as close to "now" as decoding allows. Returns the total duration. */
  function playSequence(keys) {
    const list = keys.filter(Boolean);
    if (!list.length) return 0;
    const c = AudioEngine.getCtx();
    const gain = c.createGain();
    gain.gain.value = volume;
    gain.connect(c.destination);

    let cursor = c.currentTime + 0.02;
    const startCursor = cursor;

    list.reduce((chain, key) => chain.then(async () => {
      const buf = await loadBuffer(key);
      if (!buf) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(gain);
      const startAt = Math.max(cursor, c.currentTime);
      src.start(startAt);
      activeSources.push(src);
      cursor = startAt + buf.duration;
    }), Promise.resolve());

    return list.reduce((sum, k) => sum + clipDuration(k), 0);
  }

  function play(key) {
    return playSequence([key]);
  }

  function cancelAll() {
    activeSources.forEach(src => { try { src.stop(); } catch (e) { /* already stopped */ } });
    activeSources = [];
  }

  return { preload, playSequence, play, clipDuration, cancelAll, setVolume, getVolume };
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
