/* UI controller: screens, navigation, workout runtime wiring. */

const State = {
  category: null,
  difficulty: 'Beginner',
  duration: 20,
  plan: null,
  engine: null,
};

function $(sel) { return document.querySelector(sel); }
function $id(id) { return document.getElementById(id); }

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $id(id).classList.add('active');
  window.scrollTo(0, 0);
}

function fmtTime(totalSec) {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/* ---------------- HOME ---------------- */
function renderHome() {
  const grid = $id('category-grid');
  grid.innerHTML = '';
  Object.keys(WORKOUTS).forEach(cat => {
    const card = document.createElement('button');
    card.className = 'category-card';
    card.style.setProperty('--accent', CATEGORY_COLOR[cat]);
    card.innerHTML = `<span class="category-dot"></span><span class="category-name">${cat}</span>`;
    card.addEventListener('click', () => {
      State.category = cat;
      State.difficulty = 'Beginner';
      State.duration = 20;
      renderCategoryScreen();
      showScreen('screen-category');
    });
    grid.appendChild(card);
  });
}

/* ---------------- CATEGORY / DIFFICULTY / DURATION ---------------- */
function renderCategoryScreen() {
  $id('category-title').textContent = State.category;
  $id('category-title').style.setProperty('--accent', CATEGORY_COLOR[State.category]);

  const tabs = $id('difficulty-tabs');
  tabs.innerHTML = '';
  Object.keys(DIFFICULTIES).forEach(diff => {
    const btn = document.createElement('button');
    btn.className = 'tab' + (diff === State.difficulty ? ' active' : '');
    btn.textContent = diff;
    btn.addEventListener('click', () => { State.difficulty = diff; renderCategoryScreen(); });
    tabs.appendChild(btn);
  });

  const durRow = $id('duration-row');
  durRow.innerHTML = '';
  [15, 20, 30].forEach(mins => {
    const plan = computeWorkoutPlan(State.category, State.difficulty, mins);
    const actualMin = Math.round(exactWorkoutSeconds(plan) / 60);
    const btn = document.createElement('button');
    btn.className = 'duration-btn' + (mins === State.duration ? ' active' : '');
    btn.innerHTML = `<span class="duration-label">${mins} min</span><span class="duration-real">${actualMin} min actual</span>`;
    btn.addEventListener('click', () => { State.duration = mins; renderCategoryScreen(); });
    durRow.appendChild(btn);
  });

  const plan = computeWorkoutPlan(State.category, State.difficulty, State.duration);
  const exactSec = exactWorkoutSeconds(plan);
  const { workSec, restSec, ratio } = DIFFICULTIES[State.difficulty];
  $id('circuit-summary').innerHTML = `
    <div class="summary-chip">${plan.rounds} round${plan.rounds > 1 ? 's' : ''}</div>
    <div class="summary-chip">${workSec}s work / ${restSec}s rest <span class="ratio">(${ratio})</span></div>
    <div class="summary-chip">~${Math.round(exactSec / 60)} min + ${Math.round(plan.stretchSec / 60)} min stretch</div>
  `;

  const list = $id('circuit-list');
  list.innerHTML = '';
  plan.exercises.forEach(exId => {
    const ex = EXERCISES[exId];
    const row = document.createElement('div');
    row.className = 'circuit-row';
    row.innerHTML = `<div class="circuit-ill">${illustrationSVG(exId)}</div><div class="circuit-name">${ex.name}</div>`;
    list.appendChild(row);
  });

  $id('btn-go-preworkout').onclick = () => {
    State.plan = computeWorkoutPlan(State.category, State.difficulty, State.duration);
    renderPreworkoutScreen();
    showScreen('screen-preworkout');
  };
}

/* ---------------- PRE-WORKOUT ---------------- */
function renderPreworkoutScreen() {
  const plan = State.plan;
  const exactMin = Math.round(exactWorkoutSeconds(plan) / 60);
  $id('preworkout-meta').innerHTML = `
    <div class="chrome-title small">${plan.category} · ${plan.difficulty}</div>
    <div class="summary-chip">${plan.rounds} round${plan.rounds > 1 ? 's' : ''} · ~${exactMin} min</div>
  `;
  const list = $id('preworkout-list');
  list.innerHTML = '';
  plan.exercises.forEach(exId => {
    const ex = EXERCISES[exId];
    const row = document.createElement('div');
    row.className = 'circuit-row';
    row.innerHTML = `<div class="circuit-ill">${illustrationSVG(exId)}</div><div class="circuit-name">${ex.name}</div>`;
    list.appendChild(row);
  });
}

$id('btn-start-workout').addEventListener('click', () => {
  // User gesture: unlock speech + audio context, then acquire wake lock.
  VoiceEngine.unlock();
  BeepEngine.unlock();
  WakeLockManager.request();
  startWorkoutRun();
});

/* ---------------- WORKOUT RUNTIME ---------------- */
const PHASE_META = {
  prep:        { label: 'GET READY',   cls: 'phase-rest' },
  work:        { label: 'WORK',        cls: 'phase-work' },
  rest:        { label: 'REST',        cls: 'phase-rest' },
  roundbreak:  { label: 'ROUND BREAK', cls: 'phase-roundbreak' },
  workout_end: { label: 'COMPLETE',    cls: 'phase-complete' },
  stretch:     { label: 'STRETCH',     cls: 'phase-stretch' },
  stretch_end: { label: 'DONE',        cls: 'phase-complete' },
};

function startWorkoutRun() {
  const plan = State.plan;
  const workoutScreen = $id('screen-workout');
  workoutScreen.className = 'screen active';

  State.engine = new WorkoutEngine(plan, {
    onSegmentChange: (seg, idx, timeline) => renderSegment(seg, idx, timeline),
    onTick: ({ seg, remaining }) => {
      $id('phase-timer').textContent = fmtTime(remaining);
      const total = State.engine.totalDurationSec();
      const elapsedTotal = seg.cumStart + (seg.durationSec - remaining);
      $id('progress-bar-fill').style.width = `${Math.min(100, (elapsedTotal / total) * 100)}%`;
    },
    onComplete: onWorkoutComplete,
  });

  $id('btn-pause').textContent = 'Pause';
  showScreen('screen-workout');
  State.engine.start();
}

function renderSegment(seg, idx, timeline) {
  const meta = PHASE_META[seg.type];
  const workoutScreen = $id('screen-workout');
  workoutScreen.classList.remove('phase-work', 'phase-rest', 'phase-roundbreak', 'phase-complete', 'phase-stretch');
  workoutScreen.classList.add(meta.cls);
  $id('phase-label').textContent = meta.label;
  $id('phase-timer').textContent = fmtTime(seg.durationSec);

  const currentBlock = $id('exercise-current');
  const nextBlock = $id('exercise-next');
  currentBlock.hidden = true;
  nextBlock.hidden = true;

  if (seg.type === 'work') {
    const ex = EXERCISES[seg.exerciseId];
    currentBlock.hidden = false;
    $id('exercise-current-name').textContent = ex.name;
    $id('exercise-current-ill').innerHTML = illustrationSVG(seg.exerciseId);
  } else if (seg.type === 'prep' || seg.type === 'rest' || seg.type === 'roundbreak') {
    const exId = seg.type === 'roundbreak' ? seg.nextExerciseId : seg.exerciseId;
    const ex = EXERCISES[exId];
    nextBlock.hidden = false;
    $id('exercise-next-name').textContent = ex.name;
    $id('exercise-next-ill').innerHTML = illustrationSVG(exId);
  } else if (seg.type === 'stretch') {
    currentBlock.hidden = false;
    $id('exercise-current-name').textContent = seg.stretch.name;
    $id('exercise-current-ill').innerHTML = illustrationSVG(seg.stretch.id);
  }

  // Progress label
  let label = '';
  if (seg.type === 'stretch') {
    label = `Stretch ${seg.stretchIndex + 1} of ${seg.stretchTotal}`;
  } else if (seg.type === 'stretch_end' || seg.type === 'workout_end') {
    label = '';
  } else if (seg.round != null) {
    label = `Round ${seg.round} of ${State.plan.rounds}, Exercise ${seg.exerciseIndex + 1} of 5`;
  }
  $id('progress-label').textContent = label;
}

$id('btn-pause').addEventListener('click', () => {
  const paused = State.engine.togglePause();
  $id('btn-pause').textContent = paused ? 'Resume' : 'Pause';
});

$id('btn-end').addEventListener('click', () => {
  showConfirm('End this workout? Your progress will not be saved.', () => {
    State.engine.end();
    WakeLockManager.release();
    VoiceEngine.cancelAll();
    showScreen('screen-home');
  });
});

function onWorkoutComplete() {
  WakeLockManager.release();
  const plan = State.plan;
  HistoryStore.save({
    date: new Date().toISOString(),
    category: plan.category,
    difficulty: plan.difficulty,
    durationMinutes: plan.targetMinutes,
    rounds: plan.rounds,
  });
  renderSummaryScreen();
  showScreen('screen-summary');
}

/* ---------------- SUMMARY ---------------- */
function renderSummaryScreen() {
  const plan = State.plan;
  const monthCount = HistoryStore.thisMonthCount();
  const totalSec = State.engine ? State.engine.timeline.reduce((a, s) => a + s.durationSec, 0) : plan.totalSec + plan.stretchSec;
  $id('summary-body').innerHTML = `
    <div class="summary-chip big">${plan.category} · ${plan.difficulty}</div>
    <div class="summary-chip">${plan.rounds} rounds · ${plan.exercises.length} exercises</div>
    <div class="summary-chip">~${Math.round(totalSec / 60)} min total</div>
    <div class="saved-note">Workout saved &mdash; ${monthCount} this month</div>
  `;
}

$id('btn-summary-done').addEventListener('click', () => {
  showScreen('screen-home');
});

/* ---------------- HISTORY ---------------- */
function renderHistoryScreen() {
  const monthCount = HistoryStore.thisMonthCount();
  const streak = HistoryStore.currentStreakWeeks();
  $id('history-stats').innerHTML = `
    <div class="stat-box"><div class="stat-num">${monthCount}</div><div class="stat-label">this month</div></div>
    <div class="stat-box"><div class="stat-num">${streak}</div><div class="stat-label">week streak</div></div>
  `;
  const list = $id('history-list');
  const entries = HistoryStore.all().slice().reverse();
  if (entries.length === 0) {
    list.innerHTML = '<div class="empty-note">No workouts yet.</div>';
  } else {
    list.innerHTML = entries.map(e => {
      const d = new Date(e.date);
      const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      const dotColor = CATEGORY_COLOR[e.category] || '#888';
      return `<div class="history-row">
        <span class="history-dot" style="background:${dotColor}"></span>
        <span class="history-date">${dateStr}</span>
        <span class="history-detail">${e.category} · ${e.difficulty} · ${e.durationMinutes} min</span>
      </div>`;
    }).join('');
  }
}

$id('btn-history').addEventListener('click', () => { renderHistoryScreen(); showScreen('screen-history'); });

$id('btn-clear-history').addEventListener('click', () => {
  showConfirm('Clear all workout history? This cannot be undone.', () => {
    HistoryStore.clear();
    renderHistoryScreen();
  });
});

/* ---------------- SETTINGS ---------------- */
function renderSettingsScreen() {
  const v = VoiceEngine.getVolume();
  $id('volume-slider').value = v;
  $id('volume-value').textContent = `${Math.round(v * 100)}%`;
}

$id('btn-settings').addEventListener('click', () => { renderSettingsScreen(); showScreen('screen-settings'); });

$id('volume-slider').addEventListener('input', (e) => {
  const v = parseFloat(e.target.value);
  VoiceEngine.setVolume(v);
  $id('volume-value').textContent = `${Math.round(v * 100)}%`;
});

$id('btn-voice-test').addEventListener('click', () => {
  VoiceEngine.unlock();
  VoiceEngine.speak('This is your coaching voice at the current volume.');
});

/* ---------------- BACK BUTTONS / MODAL ---------------- */
document.querySelectorAll('[data-back]').forEach(btn => {
  btn.addEventListener('click', () => showScreen(btn.getAttribute('data-back')));
});

function showConfirm(message, onConfirm) {
  $id('confirm-message').textContent = message;
  $id('confirm-modal').hidden = false;
  const okBtn = $id('confirm-ok');
  const cancelBtn = $id('confirm-cancel');
  const cleanup = () => {
    $id('confirm-modal').hidden = true;
    okBtn.removeEventListener('click', onOk);
    cancelBtn.removeEventListener('click', onCancel);
  };
  const onOk = () => { cleanup(); onConfirm(); };
  const onCancel = () => cleanup();
  okBtn.addEventListener('click', onOk);
  cancelBtn.addEventListener('click', onCancel);
}

/* ---------------- INIT ---------------- */
renderHome();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
