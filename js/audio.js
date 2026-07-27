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

/* iOS Safari treats speechSynthesis as an interrupting audio session, which
   pauses/ducks background music (Spotify, Apple Music) whenever a line is
   spoken. Keeping a continuous, near-silent audio track playing for the
   whole workout nudges Safari toward an "ambient/mixable" session instead
   of a fully exclusive one, which can soften that interruption. This is a
   best-effort mitigation, not a guaranteed fix — there is no public web API
   to set AVAudioSession's mixWithOthers option from a web page. */
const AmbientKeepAlive = (() => {
  const SILENCE_DATA_URI = 'data:audio/wav;base64,UklGRqQ+AABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYA+AAAAAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADAANAA4ADwAQABEAEgASABMAFAAVABYAFwAXABgAGQAZABoAGwAcABwAHQAeAB4AHwAfACAAIAAhACEAIgAiACMAIwAkACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAIwAjACMAIgAiACEAIQAgAB8AHwAeAB4AHQAcABwAGwAaABoAGQAYABgAFwAWABUAFAAUABMAEgARABAADwAPAA4ADQAMAAsACgAJAAgABwAGAAUABQAEAAMAAgABAAAAAAD///7//f/8//v/+v/5//j/9//3//b/9f/0//P/8v/x//D/7//v/+7/7f/s/+v/6//q/+n/6P/n/+f/5v/l/+X/5P/j/+P/4v/h/+H/4P/g/9//3//e/97/3f/d/9z/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Y/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/c/93/3f/e/97/3//f/+D/4P/h/+H/4v/j/+P/5P/l/+X/5v/n/+f/6P/p/+r/6//r/+z/7f/u/+//7//w//H/8v/z//T/9f/2//f/9//4//n/+v/7//z//f/+////AAAAAAEAAgADAAQABQAFAAYABwAIAAkACgALAAwADQAOAA8AEAARABEAEgATABQAFAAVABYAFwAYABgAGQAaABoAGwAcABwAHQAeAB4AHwAfACAAIQAhACIAIgAjACMAIwAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACQAIwAjACIAIgAhACEAIAAgAB8AHwAeAB4AHQAcABwAGwAaABkAGQAYABcAFwAWABUAFAATABIAEgARABAADwAOAA0ADAAMAAsACgAJAAgABwAGAAUABAADAAIAAQAAAAAAAAD///7//f/8//v/+v/5//j/9//2//X/9P/0//P/8v/x//D/7//u/+7/7f/s/+v/6v/p/+n/6P/n/+f/5v/l/+T/5P/j/+L/4v/h/+H/4P/g/9//3//e/97/3f/d/9z/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/d/93/3f/e/97/3//f/+D/4f/h/+L/4v/j/+T/5P/l/+b/5v/n/+j/6P/p/+r/6//s/+z/7f/u/+//8P/x//H/8v/z//T/9f/2//f/+P/5//r/+//7//z//f/+////AAAAAAEAAgADAAQABQAGAAcACAAJAAkACgALAAwADQAOAA8AEAARABEAEgATABQAFQAVABYAFwAYABkAGQAaABsAGwAcAB0AHQAeAB8AHwAgACAAIQAhACIAIgAjACMAJAAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAoACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACQAIwAjACIAIgAhACEAIAAgAB8AHwAeAB0AHQAcABsAGwAaABkAGQAYABcAFgAVABUAFAATABIAEQARABAADwAOAA0ADAALAAoACQAJAAgABwAGAAUABAADAAIAAQAAAAAA///+//3//P/7//v/+v/5//j/9//2//X/9P/z//L/8f/x//D/7//u/+3/7P/s/+v/6v/p/+j/6P/n/+b/5v/l/+T/5P/j/+L/4v/h/+H/4P/f/9//3v/e/93/3f/d/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3P/d/93/3v/e/9//3//g/+D/4f/h/+L/4v/j/+T/5P/l/+b/5//n/+j/6f/p/+r/6//s/+3/7v/u/+//8P/x//L/8//0//T/9f/2//f/+P/5//r/+//8//3//v///wAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAAwADQAOAA8AEAARABIAEgATABQAFQAWABcAFwAYABkAGQAaABsAHAAcAB0AHgAeAB8AHwAgACAAIQAhACIAIgAjACMAJAAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACMAIwAjACIAIgAhACEAIAAfAB8AHgAeAB0AHAAcABsAGgAaABkAGAAYABcAFgAVABQAFAATABIAEQAQAA8ADwAOAA0ADAALAAoACQAIAAcABgAFAAUABAADAAIAAQAAAAAA///+//3//P/7//r/+f/4//f/9//2//X/9P/z//L/8f/w/+//7//u/+3/7P/r/+v/6v/p/+j/5//n/+b/5f/l/+T/4//j/+L/4f/h/+D/4P/f/9//3v/e/93/3f/c/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9j/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3P/d/93/3v/e/9//3//g/+D/4f/h/+L/4//j/+T/5f/l/+b/5//n/+j/6f/q/+v/6//s/+3/7v/v/+//8P/x//L/8//0//X/9v/3//f/+P/5//r/+//8//3//v///wAAAAABAAIAAwAEAAUABQAGAAcACAAJAAoACwAMAA0ADgAPAA8AEAARABIAEwAUABQAFQAWABcAGAAYABkAGgAaABsAHAAcAB0AHgAeAB8AHwAgACEAIQAiACIAIwAjACMAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAkACMAIwAiACIAIQAhACAAIAAfAB8AHgAeAB0AHAAcABsAGgAZABkAGAAXABcAFgAVABQAEwASABIAEQAQAA8ADgANAAwADAALAAoACQAIAAcABgAFAAQAAwACAAEAAAAAAAAA///+//3//P/7//r/+f/4//f/9v/1//T/9P/z//L/8f/w/+//7v/u/+3/7P/r/+r/6f/p/+j/5//n/+b/5f/k/+T/4//i/+L/4f/h/+D/4P/f/9//3v/e/93/3f/c/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3f/d/93/3v/e/9//3//g/+H/4f/i/+L/4//k/+T/5f/m/+b/5//o/+j/6f/q/+v/7P/s/+3/7v/v//D/8f/x//L/8//0//X/9v/3//j/+f/6//v/+//8//3//v///wAAAAABAAIAAwAEAAUABgAHAAgACQAJAAoACwAMAA0ADgAPABAAEQARABIAEwAUABUAFQAWABcAGAAZABkAGgAbABsAHAAdAB0AHgAfAB8AIAAgACEAIQAiACIAIwAjACQAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAKAAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAkACMAIwAiACIAIQAhACAAIAAfAB8AHgAdAB0AHAAbABsAGgAZABkAGAAXABYAFQAVABQAEwASABEAEQAQAA8ADgANAAwACwAKAAkACQAIAAcABgAFAAQAAwACAAEAAAAAAP///v/9//z/+//7//r/+f/4//f/9v/1//T/8//y//H/8f/w/+//7v/t/+z/7P/r/+r/6f/o/+j/5//m/+b/5f/k/+T/4//i/+L/4f/h/+D/3//f/97/3v/d/93/3f/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/9z/3f/d/97/3v/f/9//4P/g/+H/4f/i/+L/4//k/+T/5f/m/+f/5//o/+n/6f/q/+v/7P/t/+7/7v/v//D/8f/y//P/9P/0//X/9v/3//j/+f/6//v//P/9//7///8AAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAAMAA0ADgAPABAAEQASABIAEwAUABUAFgAXABcAGAAZABkAGgAbABwAHAAdAB4AHgAfAB8AIAAgACEAIQAiACIAIwAjACQAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAjACMAIwAiACIAIQAhACAAHwAfAB4AHgAdABwAHAAbABoAGgAZABgAGAAXABYAFQAUABQAEwASABEAEAAPAA8ADgANAAwACwAKAAkACAAHAAYABQAFAAQAAwACAAEAAAAAAP///v/9//z/+//6//n/+P/3//f/9v/1//T/8//y//H/8P/v/+//7v/t/+z/6//r/+r/6f/o/+f/5//m/+X/5f/k/+P/4//i/+H/4f/g/+D/3//f/97/3v/d/93/3P/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Y/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/9z/3f/d/97/3v/f/9//4P/g/+H/4f/i/+P/4//k/+X/5f/m/+f/5//o/+n/6v/r/+v/7P/t/+7/7//v//D/8f/y//P/9P/1//b/9//3//j/+f/6//v//P/9//7///8AAAAAAQACAAMABAAFAAUABgAHAAgACQAKAAsADAANAA4ADwAPABAAEQASABMAFAAUABUAFgAXABgAGAAZABoAGgAbABwAHAAdAB4AHgAfAB8AIAAhACEAIgAiACMAIwAjACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAJAAjACMAIgAiACEAIQAgACAAHwAfAB4AHgAdABwAHAAbABoAGQAZABgAFwAXABYAFQAUABMAEgASABEAEAAPAA4ADQAMAAwACwAKAAkACAAHAAYABQAEAAMAAgABAAAAAAAAAP///v/9//z/+//6//n/+P/3//b/9f/0//T/8//y//H/8P/v/+7/7v/t/+z/6//q/+n/6f/o/+f/5//m/+X/5P/k/+P/4v/i/+H/4f/g/+D/3//f/97/3v/d/93/3P/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/93/3f/d/97/3v/f/9//4P/h/+H/4v/i/+P/5P/k/+X/5v/m/+f/6P/o/+n/6v/r/+z/7P/t/+7/7//w//H/8f/y//P/9P/1//b/9//4//n/+v/7//v//P/9//7///8AAAAAAQACAAMABAAFAAYABwAIAAkACQAKAAsADAANAA4ADwAQABEAEQASABMAFAAVABUAFgAXABgAGQAZABoAGwAbABwAHQAdAB4AHwAfACAAIAAhACEAIgAiACMAIwAkACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACgAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAJAAjACMAIgAiACEAIQAgACAAHwAfAB4AHQAdABwAGwAbABoAGQAZABgAFwAWABUAFQAUABMAEgARABEAEAAPAA4ADQAMAAsACgAJAAkACAAHAAYABQAEAAMAAgABAAAAAAD///7//f/8//v/+//6//n/+P/3//b/9f/0//P/8v/x//H/8P/v/+7/7f/s/+z/6//q/+n/6P/o/+f/5v/m/+X/5P/k/+P/4v/i/+H/4f/g/9//3//e/97/3f/d/93/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/c/93/3f/e/97/3//f/+D/4P/h/+H/4v/i/+P/5P/k/+X/5v/n/+f/6P/p/+n/6v/r/+z/7f/u/+7/7//w//H/8v/z//T/9P/1//b/9//4//n/+v/7//z//f/+////AAAAAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADAANAA4ADwAQABEAEgASABMAFAAVABYAFwAXABgAGQAZABoAGwAcABwAHQAeAB4AHwAfACAAIAAhACEAIgAiACMAIwAkACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAIwAjACMAIgAiACEAIQAgAB8AHwAeAB4AHQAcABwAGwAaABoAGQAYABgAFwAWABUAFAAUABMAEgARABAADwAPAA4ADQAMAAsACgAJAAgABwAGAAUABQAEAAMAAgABAAAAAAD///7//f/8//v/+v/5//j/9//3//b/9f/0//P/8v/x//D/7//v/+7/7f/s/+v/6//q/+n/6P/n/+f/5v/l/+X/5P/j/+P/4v/h/+H/4P/g/9//3//e/97/3f/d/9z/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2P/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/c/93/3f/e/97/3//f/+D/4P/h/+H/4v/j/+P/5P/l/+X/5v/n/+f/6P/p/+r/6//r/+z/7f/u/+//7//w//H/8v/z//T/9f/2//f/9//4//n/+v/7//z//f/+////AAAAAAEAAgADAAQABQAFAAYABwAIAAkACgALAAwADQAOAA8ADwAQABEAEgATABQAFAAVABYAFwAYABgAGQAaABoAGwAcABwAHQAeAB4AHwAfACAAIQAhACIAIgAjACMAIwAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACQAIwAjACIAIgAhACEAIAAgAB8AHwAeAB4AHQAcABwAGwAaABkAGQAYABcAFwAWABUAFAATABIAEgARABAADwAOAA0ADAAMAAsACgAJAAgABwAGAAUABAADAAIAAQAAAAAAAAD///7//f/8//v/+v/5//j/9//2//X/9P/0//P/8v/x//D/7//u/+7/7f/s/+v/6v/p/+n/6P/n/+f/5v/l/+T/5P/j/+L/4v/h/+H/4P/g/9//3//e/97/3f/d/9z/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/d/93/3f/e/97/3//f/+D/4f/h/+L/4v/j/+T/5P/l/+b/5v/n/+j/6P/p/+r/6//s/+z/7f/u/+//8P/x//H/8v/z//T/9f/2//f/+P/5//r/+//7//z//f/+////AAAAAAEAAgADAAQABQAGAAcACAAJAAkACgALAAwADQAOAA8AEAARABEAEgATABQAFQAVABYAFwAYABkAGQAaABsAGwAcAB0AHQAeAB8AHwAgACAAIQAhACIAIgAjACMAJAAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAoACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACQAIwAjACIAIgAhACEAIAAgAB8AHwAeAB0AHQAcABsAGgAaABkAGQAYABcAFgAVABUAFAATABIAEQARABAADwAOAA0ADAALAAoACQAJAAgABwAGAAUABAADAAIAAQAAAAAA///+//3//P/7//v/+v/5//j/9//2//X/9P/z//L/8f/x//D/7//u/+3/7P/s/+v/6v/p/+j/6P/n/+b/5v/l/+T/5P/j/+L/4v/h/+H/4P/f/9//3v/e/93/3f/d/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3P/d/93/3v/e/9//3//g/+D/4f/h/+L/4v/j/+T/5P/l/+b/5//n/+j/6f/p/+r/6//s/+3/7v/u/+//8P/x//L/8//0//T/9f/2//f/+P/5//r/+//8//3//v///wAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAAwADQAOAA8AEAARABIAEgATABQAFQAWABcAFwAYABkAGQAaABsAHAAcAB0AHgAeAB8AHwAgACAAIQAhACIAIgAjACMAJAAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACMAIwAjACIAIgAhACEAIAAfAB8AHgAeAB0AHAAcABsAGgAaABkAGAAYABcAFgAVABQAFAATABIAEQAQAA8ADwAOAA0ADAALAAoACQAIAAcABgAFAAUABAADAAIAAQAAAAAA///+//3//P/7//r/+f/4//f/9//2//X/9P/z//L/8f/w/+//7//u/+3/7P/r/+v/6v/p/+j/5//n/+b/5f/l/+T/4//j/+L/4f/h/+D/4P/f/9//3v/e/93/3f/c/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9j/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3P/d/93/3v/e/9//3//g/+D/4f/h/+L/4//j/+T/5f/l/+b/5//n/+j/6f/q/+v/6//s/+3/7v/v/+//8P/x//L/8//0//X/9v/3//f/+P/5//r/+//8//3//v///wAAAAABAAIAAwAEAAUABQAGAAcACAAJAAoACwAMAA0ADgAPAA8AEAARABIAEwAUABQAFQAWABcAGAAYABkAGgAaABsAHAAcAB0AHgAeAB8AHwAgACEAIQAiACIAIwAjACMAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAkACMAIwAiACIAIQAhACAAIAAfAB8AHgAeAB0AHAAcABsAGgAZABkAGAAXABcAFgAVABQAEwASABIAEQAQAA8ADgANAAwADAALAAoACQAIAAcABgAFAAQAAwACAAEAAAAAAAAA///+//3//P/7//r/+f/4//f/9v/1//T/9P/z//L/8f/w/+//7v/u/+3/7P/r/+r/6f/p/+j/5//n/+b/5f/k/+T/4//i/+L/4f/h/+D/4P/f/9//3v/e/93/3f/c/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3f/d/93/3v/e/9//3//g/+H/4f/i/+L/4//k/+T/5f/m/+b/5//o/+j/6f/q/+v/7P/s/+3/7v/v//D/8f/x//L/8//0//X/9v/3//j/+f/6//v/+//8//3//v///wAAAAABAAIAAwAEAAUABgAHAAgACQAJAAoACwAMAA0ADgAPABAAEQARABIAEwAUABUAFQAWABcAGAAZABkAGgAbABsAHAAdAB0AHgAfAB8AIAAgACEAIQAiACIAIwAjACQAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAKAAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAkACMAIwAiACIAIQAhACAAIAAfAB8AHgAdAB0AHAAbABsAGgAZABkAGAAXABYAFQAVABQAEwASABEAEQAQAA8ADgANAAwACwAKAAkACQAIAAcABgAFAAQAAwACAAEAAAAAAP///v/9//z/+//7//r/+f/4//f/9v/1//T/8//y//H/8f/w/+//7v/t/+z/7P/r/+r/6f/o/+j/5//m/+b/5f/k/+T/4//i/+L/4f/h/+D/3//f/97/3v/d/93/3f/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/9z/3f/d/97/3v/f/9//4P/g/+H/4f/i/+L/4//k/+T/5f/m/+f/5//o/+n/6f/q/+v/7P/t/+7/7v/v//D/8f/y//P/9P/0//X/9v/3//j/+f/6//v//P/9//7///8AAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAAMAA0ADgAPABAAEQASABIAEwAUABUAFgAXABcAGAAZABkAGgAbABwAHAAdAB4AHgAfAB8AIAAgACEAIQAiACIAIwAjACQAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAjACMAIwAiACIAIQAhACAAHwAfAB4AHgAdABwAHAAbABoAGgAZABgAGAAXABYAFQAUABQAEwASABEAEAAPAA8ADgANAAwACwAKAAkACAAHAAYABQAFAAQAAwACAAEAAAAAAP///v/9//z/+//6//n/+P/3//f/9v/1//T/8//y//H/8P/v/+//7v/t/+z/6//r/+r/6f/o/+f/5//m/+X/5f/k/+P/4//i/+H/4f/g/+D/3//f/97/3v/d/93/3P/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Y/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/9z/3f/d/97/3v/f/9//4P/g/+H/4f/i/+P/4//k/+X/5f/m/+f/5//o/+n/6v/r/+v/7P/t/+7/7//v//D/8f/y//P/9P/1//b/9//3//j/+f/6//v//P/9//7///8AAAAAAQACAAMABAAFAAUABgAHAAgACQAKAAsADAANAA4ADwAPABAAEQASABMAFAAUABUAFgAXABgAGAAZABoAGgAbABwAHAAdAB4AHgAfAB8AIAAhACEAIgAiACMAIwAjACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAJAAjACMAIgAiACEAIQAgACAAHwAfAB4AHgAdABwAHAAbABoAGQAZABgAFwAXABYAFQAUABMAEgASABEAEAAPAA4ADQAMAAwACwAKAAkACAAHAAYABQAEAAMAAgABAAAAAAAAAP///v/9//z/+//6//n/+P/3//b/9f/0//T/8//y//H/8P/v/+7/7v/t/+z/6//q/+n/6f/o/+f/5//m/+X/5P/k/+P/4v/i/+H/4f/g/+D/3//f/97/3v/d/93/3P/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/93/3f/d/97/3v/f/9//4P/h/+H/4v/i/+P/5P/k/+X/5v/m/+f/6P/o/+n/6v/r/+z/7P/t/+7/7//w//H/8f/y//P/9P/1//b/9//4//n/+v/7//v//P/9//7///8AAAAAAQACAAMABAAFAAYABwAIAAkACQAKAAsADAANAA4ADwAQABEAEQASABMAFAAVABUAFgAXABgAGQAZABoAGwAbABwAHQAdAB4AHwAfACAAIAAhACEAIgAiACMAIwAkACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACgAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAJAAjACMAIgAiACEAIQAgACAAHwAfAB4AHQAdABwAGwAbABoAGQAZABgAFwAWABUAFQAUABMAEgARABEAEAAPAA4ADQAMAAsACgAJAAkACAAHAAYABQAEAAMAAgABAAAAAAD///7//f/8//v/+//6//n/+P/3//b/9f/0//P/8v/x//H/8P/v/+7/7f/s/+z/6//q/+n/6P/o/+f/5v/m/+X/5P/k/+P/4v/i/+H/4f/g/9//3//e/97/3f/d/93/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/c/93/3f/e/97/3//f/+D/4P/h/+H/4v/i/+P/5P/k/+X/5v/n/+f/6P/p/+n/6v/r/+z/7f/u/+7/7//w//H/8v/z//T/9P/1//b/9//4//n/+v/7//z//f/+////AAAAAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADAANAA4ADwAQABEAEgASABMAFAAVABYAFwAXABgAGQAZABoAGwAcABwAHQAeAB4AHwAfACAAIAAhACEAIgAiACMAIwAkACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAIwAjACMAIgAiACEAIQAgAB8AHwAeAB4AHQAcABwAGwAaABoAGQAYABgAFwAWABUAFAAUABMAEgARABAADwAPAA4ADQAMAAsACgAJAAgABwAGAAUABQAEAAMAAgABAAAAAAD///7//f/8//v/+v/5//j/9//3//b/9f/0//P/8v/x//D/7//v/+7/7f/s/+v/6//q/+n/6P/n/+f/5v/l/+X/5P/j/+P/4v/h/+H/4P/g/9//3//e/97/3f/d/9z/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2P/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/c/93/3f/e/97/3//f/+D/4P/h/+H/4v/j/+P/5P/l/+X/5v/n/+f/6P/p/+r/6//r/+z/7f/u/+//7//w//H/8v/z//T/9f/2//f/9//4//n/+v/7//z//f/+////AAAAAAEAAgADAAQABQAFAAYABwAIAAkACgALAAwADQAOAA8ADwAQABEAEgATABQAFAAVABYAFwAYABgAGQAaABoAGwAcABwAHQAeAB4AHwAfACAAIQAhACIAIgAjACMAIwAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACQAIwAjACIAIgAhACEAIAAgAB8AHwAeAB4AHQAcABwAGwAaABkAGQAYABcAFwAWABUAFAATABIAEgARABAADwAOAA0ADAAMAAsACgAJAAgABwAGAAUABAADAAIAAQAAAAAAAAD///7//f/8//v/+v/5//j/9//2//X/9P/0//P/8v/x//D/7//u/+7/7f/s/+v/6v/p/+n/6P/n/+f/5v/l/+T/5P/j/+L/4v/h/+H/4P/g/9//3//e/97/3f/d/9z/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/d/93/3f/e/97/3//f/+D/4f/h/+L/4v/j/+T/5P/l/+b/5v/n/+j/6P/p/+r/6//s/+z/7f/u/+//8P/x//H/8v/z//T/9f/2//f/+P/5//r/+//7//z//f/+////AAAAAAEAAgADAAQABQAGAAcACAAJAAkACgALAAwADQAOAA8AEAARABEAEgATABQAFQAVABYAFwAYABkAGQAaABsAGwAcAB0AHQAeAB8AHwAgACAAIQAhACIAIgAjACMAJAAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAoACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACQAIwAjACIAIgAhACEAIAAgAB8AHwAeAB0AHQAcABsAGgAaABkAGQAYABcAFgAVABUAFAATABIAEQARABAADwAOAA0ADAALAAoACQAJAAgABwAGAAUABAADAAIAAQAAAAAA///+//3//P/7//v/+v/5//j/9//2//X/9P/z//L/8f/x//D/7//u/+3/7P/s/+v/6v/p/+j/6P/n/+b/5v/l/+T/5P/j/+L/4v/h/+H/4P/f/9//3v/e/93/3f/d/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3P/d/93/3v/e/9//3//g/+D/4f/h/+L/4v/j/+T/5P/l/+b/5//n/+j/6f/p/+r/6//s/+3/7v/u/+//8P/x//L/8//0//T/9f/2//f/+P/5//r/+//8//3//v///wAAAAAAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAAwADQAOAA8AEAARABIAEgATABQAFQAWABcAFwAYABkAGQAaABsAHAAcAB0AHgAeAB8AHwAgACAAIQAhACIAIgAjACMAJAAkACQAJQAlACUAJgAmACYAJgAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACYAJgAmACYAJQAlACUAJAAkACMAIwAjACIAIgAhACEAIAAfAB8AHgAeAB0AHAAcABsAGgAaABkAGAAYABcAFgAVABQAFAATABIAEQAQAA8ADwAOAA0ADAALAAoACQAIAAcABgAFAAUABAADAAIAAQAAAAAA///+//3//P/7//r/+f/4//f/9//2//X/9P/z//L/8f/w/+//7//u/+3/7P/r/+v/6v/p/+j/5//n/+b/5f/l/+T/4//j/+L/4f/h/+D/4P/f/9//3v/e/93/3f/c/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9j/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3P/d/93/3v/e/9//3//g/+D/4f/h/+L/4//j/+T/5f/l/+b/5//n/+j/6f/q/+v/6//s/+3/7v/v/+//8P/x//L/8//0//X/9v/3//f/+P/5//r/+//8//3//v///wAAAAABAAIAAwAEAAUABQAGAAcACAAJAAoACwAMAA0ADgAPAA8AEAARABIAEwAUABQAFQAWABcAGAAYABkAGgAaABsAHAAcAB0AHgAeAB8AHwAgACEAIQAiACIAIwAjACMAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAkACMAIwAiACIAIQAhACAAIAAfAB8AHgAeAB0AHAAcABsAGgAZABkAGAAXABcAFgAVABQAEwASABIAEQAQAA8ADgANAAwADAALAAoACQAIAAcABgAFAAQAAwACAAEAAAAAAAAA///+//3//P/7//r/+f/4//f/9v/1//T/9P/z//L/8f/w/+//7v/u/+3/7P/r/+r/6f/p/+j/5//n/+b/5f/k/+T/4//i/+L/4f/h/+D/4P/f/9//3v/e/93/3f/c/9z/3P/b/9v/2//a/9r/2v/a/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2v/a/9r/2v/b/9v/2//c/9z/3f/d/93/3v/e/9//3//g/+H/4f/i/+L/4//k/+T/5f/m/+b/5//o/+j/6f/q/+v/7P/s/+3/7v/v//D/8f/x//L/8//0//X/9v/3//j/+f/6//v/+//8//3//v///wAAAAABAAIAAwAEAAUABgAHAAgACQAJAAoACwAMAA0ADgAPABAAEQARABIAEwAUABUAFQAWABcAGAAZABkAGgAbABsAHAAdAB0AHgAfAB8AIAAgACEAIQAiACIAIwAjACQAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAKAAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAkACMAIwAiACIAIQAhACAAIAAfAB8AHgAdAB0AHAAbABsAGgAZABkAGAAXABYAFQAVABQAEwASABEAEQAQAA8ADgANAAwACwAKAAkACQAIAAcABgAFAAQAAwACAAEAAAAAAP///v/9//z/+//7//r/+f/4//f/9v/1//T/8//y//H/8f/w/+//7v/t/+z/7P/r/+r/6f/o/+j/5//m/+b/5f/k/+T/4//i/+L/4f/h/+D/3//f/97/3v/d/93/3f/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/9z/3f/d/97/3v/f/9//4P/g/+H/4f/i/+L/4//k/+T/5f/m/+f/5//o/+n/6f/q/+v/7P/t/+7/7v/v//D/8f/y//P/9P/0//X/9v/3//j/+f/6//v//P/9//7///8AAAAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAAMAA0ADgAPABAAEQASABIAEwAUABUAFgAXABcAGAAZABkAGgAbABwAHAAdAB4AHgAfAB8AIAAgACEAIQAiACIAIwAjACQAJAAkACUAJQAlACYAJgAmACYAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAmACYAJgAmACUAJQAlACQAJAAjACMAIwAiACIAIQAhACAAHwAfAB4AHgAdABwAHAAbABoAGgAZABgAGAAXABYAFQAUABQAEwASABEAEAAPAA8ADgANAAwACwAKAAkACAAHAAYABQAFAAQAAwACAAEAAAAAAP///v/9//z/+//6//n/+P/3//f/9v/1//T/8//y//H/8P/v/+//7v/t/+z/6//r/+r/6f/o/+f/5//m/+X/5f/k/+P/4//i/+H/4f/g/+D/3//f/97/3v/d/93/3P/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Y/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/9z/3f/d/97/3v/f/9//4P/g/+H/4f/i/+P/4//k/+X/5f/m/+f/5//o/+n/6v/r/+v/7P/t/+7/7//v//D/8f/y//P/9P/1//b/9//3//j/+f/6//v//P/9//7///8AAAAAAQACAAMABAAFAAUABgAHAAgACQAKAAsADAANAA4ADwAPABAAEQASABMAFAAUABUAFgAXABgAGAAZABoAGgAbABwAHAAdAB4AHgAfAB8AIAAhACEAIgAiACMAIwAjACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAJAAjACMAIgAiACEAIQAgACAAHwAfAB4AHgAdABwAHAAbABoAGQAZABgAFwAXABYAFQAUABMAEgASABEAEAAPAA4ADQAMAAwACwAKAAkACAAHAAYABQAEAAMAAgABAAAAAAAAAP///v/9//z/+//6//n/+P/3//b/9f/0//T/8//y//H/8P/v/+7/7v/t/+z/6//q/+n/6f/o/+f/5//m/+X/5P/k/+P/4v/i/+H/4f/g/+D/3//f/97/3v/d/93/3P/c/9z/2//b/9v/2v/a/9r/2v/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9r/2v/a/9r/2//b/9v/3P/c/93/3f/d/97/3v/f/9//4P/h/+H/4v/i/+P/5P/k/+X/5v/m/+f/6P/o/+n/6v/r/+z/7P/t/+7/7//w//H/8f/y//P/9P/1//b/9//4//n/+v/7//v//P/9//7///8AAAAAAQACAAMABAAFAAYABwAIAAkACQAKAAsADAANAA4ADwAQABEAEQASABMAFAAVABUAFgAXABgAGQAZABoAGwAbABwAHQAdAB4AHwAfACAAIAAhACEAIgAiACMAIwAkACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACgAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAJAAjACMAIgAiACEAIQAgACAAHwAfAB4AHQAdABwAGwAbABoAGQAZABgAFwAWABUAFQAUABMAEgARABEAEAAPAA4ADQAMAAsACgAJAAkACAAHAAYABQAEAAMAAgABAAAAAAD///7//f/8//v/+//6//n/+P/3//b/9f/0//P/8v/x//H/8P/v/+7/7f/s/+z/6//q/+n/6P/o/+f/5v/m/+X/5P/k/+P/4v/i/+H/4f/g/9//3//e/97/3f/d/93/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/c/93/3f/e/97/3//f/+D/4P/h/+H/4v/i/+P/5P/k/+X/5v/n/+f/6P/p/+n/6v/r/+z/7f/u/+7/7//w//H/8v/z//T/9P/1//b/9//4//n/+v/7//z//f/+////AAAAAAAAAQACAAMABAAFAAYABwAIAAkACgALAAwADAANAA4ADwAQABEAEgASABMAFAAVABYAFwAXABgAGQAZABoAGwAcABwAHQAeAB4AHwAfACAAIAAhACEAIgAiACMAIwAkACQAJAAlACUAJQAmACYAJgAmACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJwAnACcAJgAmACYAJgAlACUAJQAkACQAIwAjACMAIgAiACEAIQAgAB8AHwAeAB4AHQAcABwAGwAaABoAGQAYABgAFwAWABUAFAAUABMAEgARABAADwAPAA4ADQAMAAsACgAJAAgABwAGAAUABQAEAAMAAgABAAAAAAD///7//f/8//v/+v/5//j/9//3//b/9f/0//P/8v/x//D/7//v/+7/7f/s/+v/6//q/+n/6P/n/+f/5v/l/+X/5P/j/+P/4v/h/+H/4P/g/9//3//e/97/3f/d/9z/3P/c/9v/2//b/9r/2v/a/9r/2f/Z/9n/2f/Z/9n/2f/Z/9n/2P/Z/9n/2f/Z/9n/2f/Z/9n/2f/a/9r/2v/a/9v/2//b/9z/3P/c/93/3f/e/97/3//f/+D/4P/h/+H/4v/j/+P/5P/l/+X/5v/n/+f/6P/p/+r/6//r/+z/7f/u/+//7//w//H/8v/z//T/9f/2//f/9//4//n/+v/7//z//f/+////AAA=';

  let el = null;

  function start() {
    if (!el) {
      el = new Audio(SILENCE_DATA_URI);
      el.loop = true;
      el.volume = 0.15;
      el.setAttribute('playsinline', 'true');
      el.setAttribute('webkit-playsinline', 'true');
    }
    el.play().catch(() => { /* no-op */ });
  }

  function stop() {
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }

  return { start, stop };
})();
