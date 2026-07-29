/* Timestamp-based workout timer engine. Builds a full segment timeline up
   front, then walks it using Date.now() as the source of truth so nothing
   drifts, re-rendering every tick. Announcements are scheduled as offsets
   (seconds) from the start of each segment. */

const MIN_REST_LEAD = 5;     // "Rest." + gap before "Next up: X" begins
const MIN_REST_TAIL = 5;     // buffer after explanation before countdown
const COUNTDOWN_SEC = 3;

function buildSegmentEvents(seg) {
  const events = [];
  const d = seg.durationSec;
  const push = (atSec, fire) => events.push({ atSec: Math.max(0, atSec), fired: false, fire });

  if (seg.type === 'prep' || seg.type === 'rest') {
    const exId = seg.exerciseId;
    const leadKey = seg.finalExercise ? `lead_final_${exId}`
      : seg.isFirstOfWorkout ? `lead_first_${exId}`
      : `lead_next_${exId}`;
    const bodyKey = seg.fullExplanation ? `full_${exId}` : `brief_${exId}`;

    push(0, () => { BeepEngine.beep(); ClipVoice.play(seg.isFirstOfWorkout ? 'get_ready' : 'rest'); });

    if (seg.fullExplanation) {
      push(MIN_REST_LEAD, () => ClipVoice.playSequence([leadKey, bodyKey]));
    } else {
      const mid = Math.max(MIN_REST_LEAD, Math.floor(d / 2));
      push(mid, () => ClipVoice.playSequence([leadKey, bodyKey]));
    }

    push(d - 3, () => ClipVoice.play('count_three'));
    push(d - 2, () => ClipVoice.play('count_two'));
    push(d - 1, () => ClipVoice.play('count_one'));
  }

  if (seg.type === 'work') {
    push(0, () => { BeepEngine.beep(); ClipVoice.play('go'); });
    if (d >= 30) push(Math.floor(d / 2), () => ClipVoice.play('halfway'));
    if (d > 5) push(d - 5, () => ClipVoice.play('five_seconds'));
  }

  if (seg.type === 'roundbreak') {
    push(0, () => { BeepEngine.beep(); ClipVoice.play('round_complete'); });
    push(30, () => ClipVoice.play('thirty_seconds'));
    push(d - 10, () => ClipVoice.playSequence(['next_round_soon', `lead_first_${seg.nextExerciseId}`]));
    push(d - 3, () => ClipVoice.play('count_three'));
    push(d - 2, () => ClipVoice.play('count_two'));
    push(d - 1, () => ClipVoice.play('count_one'));
  }

  if (seg.type === 'workout_end') {
    push(0, () => { BeepEngine.tripleBeep(); ClipVoice.play('workout_complete'); });
  }

  if (seg.type === 'stretch') {
    const sid = seg.stretch.id;
    push(0, () => { BeepEngine.beep(); ClipVoice.playSequence([`stretch_name_${sid}`, `stretch_script_${sid}`]); });
    push(20, () => ClipVoice.play('relax_breathe'));
    push(25, () => ClipVoice.play('five_seconds'));
  }

  if (seg.type === 'stretch_end') {
    push(0, () => ClipVoice.play('stretching_complete'));
  }

  return events;
}

/* Builds the ordered list of segments for a computed workout plan. Extends
   round-1 rest windows automatically if the full explanation can't fit. */
function buildTimeline(plan) {
  const segments = [];
  const { exercises, rounds, workSec, restSec, roundBreakSec } = plan;

  function restDurationFor(exerciseId, fullExplanation) {
    if (!fullExplanation) return restSec;
    // Exact durations from the pre-rendered clips (lead_next used as a
    // close-enough proxy for the lead-in length across all three variants).
    const speechSec = ClipVoice.clipDuration(`lead_next_${exerciseId}`) + ClipVoice.clipDuration(`full_${exerciseId}`);
    const needed = Math.ceil(MIN_REST_LEAD + speechSec + MIN_REST_TAIL + COUNTDOWN_SEC);
    return Math.max(restSec, needed);
  }

  // Prep period: rest-length, full explanation of first exercise.
  segments.push({
    type: 'prep', durationSec: restDurationFor(exercises[0], true),
    exerciseId: exercises[0], fullExplanation: true, isFirstOfWorkout: true, finalExercise: false,
    round: 1, exerciseIndex: 0,
  });

  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < 5; i++) {
      const isLastExerciseOfWorkout = r === rounds && i === 4;
      segments.push({
        type: 'work', durationSec: workSec, exerciseId: exercises[i], round: r, exerciseIndex: i,
        isLastExerciseOfWorkout,
      });

      if (i < 4) {
        const fullExplanation = r === 1;
        const finalExercise = r === rounds && i === 3;
        segments.push({
          type: 'rest', durationSec: restDurationFor(exercises[i + 1], fullExplanation),
          exerciseId: exercises[i + 1], fullExplanation, isFirstOfWorkout: false,
          finalExercise, round: r, exerciseIndex: i + 1,
        });
      } else if (r < rounds) {
        segments.push({
          type: 'roundbreak', durationSec: roundBreakSec, round: r + 1, nextExerciseId: exercises[0],
        });
      } else {
        segments.push({ type: 'workout_end', durationSec: 4 });
      }
    }
  }

  const stretches = getStretchSequence(plan.category);
  stretches.forEach((st, idx) => {
    segments.push({ type: 'stretch', durationSec: 30, stretch: st, stretchIndex: idx, stretchTotal: stretches.length });
  });
  segments.push({ type: 'stretch_end', durationSec: 3 });

  let cum = 0;
  segments.forEach(seg => { seg.cumStart = cum; cum += seg.durationSec; seg.events = buildSegmentEvents(seg); });
  return segments;
}

/* Exact exercise-portion runtime (excludes stretches), accounting for any
   round-1 rest windows that were auto-extended to fit their explanation. */
function exactWorkoutSeconds(plan) {
  return buildTimeline(plan)
    .filter(s => s.type !== 'stretch' && s.type !== 'stretch_end')
    .reduce((a, s) => a + s.durationSec, 0);
}

class WorkoutEngine {
  constructor(plan, callbacks) {
    this.plan = plan;
    this.timeline = buildTimeline(plan);
    this.cb = callbacks || {};
    this.segIndex = -1;
    this.segStartTs = 0;
    this.pausedAt = null;
    this.pausedAccumMs = 0;
    this.rafId = null;
    this.ended = false;
  }

  totalDurationSec() {
    return this.timeline.reduce((s, seg) => s + seg.durationSec, 0);
  }

  start() {
    this.segIndex = 0;
    this._enterSegment(0);
    this._loop();
  }

  _enterSegment(idx) {
    this.segIndex = idx;
    this.segStartTs = Date.now();
    this.pausedAccumMs = 0;
    const seg = this.timeline[idx];
    if (seg) seg.events.forEach(e => { e.fired = false; });
    if (this.cb.onSegmentChange) this.cb.onSegmentChange(seg, idx, this.timeline);
  }

  _elapsedSec() {
    const now = this.pausedAt || Date.now();
    return (now - this.segStartTs - this.pausedAccumMs) / 1000;
  }

  _loop() {
    if (this.ended) return;
    this._tick();
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  _tick() {
    const seg = this.timeline[this.segIndex];
    if (!seg) { this._finish(); return; }
    const elapsed = this._elapsedSec();

    if (!this.pausedAt) {
      seg.events.forEach(e => {
        if (!e.fired && elapsed >= e.atSec) { e.fired = true; e.fire(); }
      });
    }

    const remaining = Math.max(0, seg.durationSec - elapsed);
    if (this.cb.onTick) this.cb.onTick({ seg, segIndex: this.segIndex, elapsed, remaining, timeline: this.timeline });

    if (!this.pausedAt && elapsed >= seg.durationSec) {
      const nextIdx = this.segIndex + 1;
      if (nextIdx >= this.timeline.length) { this._finish(); return; }
      this._enterSegment(nextIdx);
    }
  }

  pause() {
    if (this.pausedAt) return;
    this.pausedAt = Date.now();
    ClipVoice.cancelAll();
  }

  resume() {
    if (!this.pausedAt) return;
    this.pausedAccumMs += Date.now() - this.pausedAt;
    this.pausedAt = null;
  }

  togglePause() {
    if (this.pausedAt) this.resume(); else this.pause();
    return !!this.pausedAt;
  }

  isPaused() { return !!this.pausedAt; }

  end() {
    this.ended = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    ClipVoice.cancelAll();
  }

  _finish() {
    this.ended = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (this.cb.onComplete) this.cb.onComplete();
  }
}
