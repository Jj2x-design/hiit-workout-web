/* Minimalist neon stick-figure illustration system.
   Each pose is a small set of joint coordinates in a 110x120 local box
   (ground at y=118). Two poses (start + movement) are rendered side by
   side with a motion glyph between them. Single cyan stroke, no fill,
   to match the neon line-art aesthetic. */

const POSES = {
  /* ---------- FRONT VIEW (standing / moving) ---------- */
  standNeutral: { view: 'front', head: [55, 16, 7], neck: [55, 25], lSh: [47, 28], rSh: [63, 28], hip: [55, 64],
    lEl: [40, 46], rEl: [70, 46], lHa: [37, 64], rHa: [73, 64], lKn: [50, 92], rKn: [60, 92], lFo: [49, 118], rFo: [61, 118] },

  standArmsUp: { view: 'front', head: [55, 14, 7], neck: [55, 23], lSh: [46, 26], rSh: [64, 26], hip: [55, 62],
    lEl: [30, 12], rEl: [80, 12], lHa: [20, 2], rHa: [90, 2], lKn: [42, 92], rKn: [68, 92], lFo: [32, 118], rFo: [78, 118] },

  standFeetOutArmsMid: { view: 'front', head: [55, 15, 7], neck: [55, 24], lSh: [46, 27], rSh: [64, 27], hip: [55, 63],
    lEl: [32, 30], rEl: [78, 30], lHa: [26, 16], rHa: [84, 16], lKn: [44, 92], rKn: [66, 92], lFo: [36, 118], rFo: [74, 118] },

  squatBottom: { view: 'front', head: [55, 32, 7], neck: [55, 41], lSh: [45, 44], rSh: [65, 44], hip: [55, 84],
    lEl: [30, 56], rEl: [80, 56], lHa: [20, 58], rHa: [90, 58], lKn: [39, 96], rKn: [71, 96], lFo: [38, 118], rFo: [72, 118] },

  jumpSquatAir: { view: 'front', head: [55, 10, 7], neck: [55, 19], lSh: [46, 22], rSh: [64, 22], hip: [55, 48],
    lEl: [30, 8], rEl: [80, 8], lHa: [20, 0], rHa: [90, 0], lKn: [45, 62], rKn: [65, 62], lFo: [42, 78], rFo: [68, 78] },

  lungeFront: { view: 'front', head: [48, 20, 7], neck: [48, 29], lSh: [40, 32], rSh: [56, 32], hip: [48, 66],
    lEl: [26, 46], rEl: [64, 40], lHa: [20, 60], rHa: [70, 28], lKn: [30, 96], rKn: [66, 100], lFo: [28, 118], rFo: [82, 110] },

  sideLungeBottom: { view: 'front', head: [50, 20, 7], neck: [50, 29], lSh: [40, 32], rSh: [60, 32], hip: [50, 68],
    lEl: [22, 50], rEl: [78, 44], lHa: [14, 60], rHa: [88, 40], lKn: [26, 96], rKn: [72, 84], lFo: [22, 118], rFo: [92, 112] },

  speedSkaterSide: { view: 'front', head: [58, 18, 7], neck: [58, 27], lSh: [49, 30], rSh: [67, 30], hip: [58, 64],
    lEl: [36, 42], rEl: [82, 54], lHa: [26, 30], rHa: [90, 70], lKn: [45, 90], lFo: [40, 118], rKn: [70, 96], rFo: [22, 108] },

  highKneeLift: { view: 'front', head: [55, 14, 7], neck: [55, 23], lSh: [46, 26], rSh: [64, 26], hip: [55, 60],
    lEl: [32, 32], rEl: [72, 52], lHa: [22, 16], rHa: [76, 66], lKn: [40, 58], lFo: [38, 74], rKn: [62, 92], rFo: [64, 118] },

  wallLean: { view: 'front', head: [55, 20, 7], neck: [55, 29], lSh: [46, 32], rSh: [64, 32], hip: [55, 68],
    lEl: [40, 32], rEl: [70, 32], lHa: [40, 20], rHa: [70, 20], lKn: [50, 96], rKn: [60, 96], lFo: [46, 118], rFo: [64, 118] },

  wallPushBottom: { view: 'front', head: [55, 26, 7], neck: [55, 35], lSh: [46, 38], rSh: [64, 38], hip: [55, 70],
    lEl: [34, 24], rEl: [76, 24], lHa: [42, 18], rHa: [68, 18], lKn: [50, 96], rKn: [60, 96], lFo: [47, 118], rFo: [63, 118] },

  standingQuadStretch: { view: 'front', head: [55, 15, 7], neck: [55, 24], lSh: [47, 27], rSh: [63, 27], hip: [55, 63],
    lEl: [38, 44], rEl: [70, 66], lHa: [34, 60], rHa: [66, 92], lKn: [50, 90], lFo: [49, 118], rKn: [70, 88], rFo: [66, 92] },

  chestClaspBehind: { view: 'front', head: [55, 15, 7], neck: [55, 24], lSh: [46, 27], rSh: [64, 27], hip: [55, 63],
    lEl: [40, 46], rEl: [70, 46], lHa: [54, 56], rHa: [58, 56], lKn: [50, 90], rKn: [60, 90], lFo: [49, 118], rFo: [61, 118] },

  shoulderCrossPull: { view: 'front', head: [55, 15, 7], neck: [55, 24], lSh: [46, 27], rSh: [64, 27], hip: [55, 63],
    lEl: [66, 24], rEl: [40, 36], lHa: [34, 30], rHa: [30, 22], lKn: [50, 90], rKn: [60, 90], lFo: [49, 118], rFo: [61, 118] },

  /* ---------- SIDE VIEW (floor / plank family) ---------- */
  plankTop: { view: 'side', head: [14, 46, 7], shoulder: [26, 50], hip: [70, 54],
    elbowF: [27, 68], handF: [29, 88], kneeF: [90, 68], footF: [104, 88] },

  pushupBottom: { view: 'side', head: [14, 62, 7], shoulder: [26, 64], hip: [68, 62],
    elbowF: [22, 78], handF: [30, 88], kneeF: [90, 70], footF: [104, 88] },

  mountainClimberKneeIn: { view: 'side', head: [14, 46, 7], shoulder: [26, 50], hip: [66, 54],
    elbowF: [27, 68], handF: [29, 88], kneeF: [50, 66], footF: [40, 88] },

  situpDown: { view: 'side', head: [16, 78, 7], shoulder: [30, 82], hip: [66, 86],
    elbowF: [22, 74], handF: [24, 82], kneeF: [86, 66], footF: [104, 86] },

  situpUp: { view: 'side', head: [40, 58, 7], shoulder: [50, 66], hip: [66, 86],
    elbowF: [44, 62], handF: [50, 70], kneeF: [86, 66], footF: [104, 86] },

  gluteBridgeFlat: { view: 'side', head: [16, 90, 7], shoulder: [30, 90], hip: [66, 90],
    elbowF: [24, 82], handF: [22, 90], kneeF: [86, 68], footF: [104, 88] },

  gluteBridgeUp: { view: 'side', head: [16, 90, 7], shoulder: [30, 90], hip: [64, 62],
    elbowF: [24, 82], handF: [22, 90], kneeF: [86, 68], footF: [104, 88] },

  supermanFlat: { view: 'side', head: [10, 88, 6], shoulder: [24, 88], hip: [70, 90],
    elbowF: [4, 88], handF: [-6, 88], kneeF: [92, 90], footF: [108, 90] },

  supermanLift: { view: 'side', head: [10, 70, 6], shoulder: [24, 76], hip: [70, 88],
    elbowF: [2, 62], handF: [-10, 54], kneeF: [94, 78], footF: [110, 68] },

  birdDogNeutral: { view: 'side', head: [16, 56, 7], shoulder: [28, 60], hip: [70, 62],
    elbowF: [28, 78], handF: [30, 92], kneeF: [82, 80], footF: [84, 92] },

  birdDogExtend: { view: 'side', head: [8, 52, 7], shoulder: [26, 60], hip: [70, 62],
    elbowF: [12, 54], handF: [-6, 48], kneeF: [82, 80], footF: [84, 92], kneeB: [88, 66], footB: [108, 60] },

  deadBugStart: { view: 'side', head: [16, 90, 7], shoulder: [30, 90], hip: [66, 90],
    elbowF: [30, 70], handF: [28, 52], kneeF: [78, 70], footF: [90, 70] },

  deadBugExtend: { view: 'side', head: [16, 90, 7], shoulder: [30, 90], hip: [66, 90],
    elbowF: [46, 60], handF: [62, 44], kneeF: [92, 84], footF: [112, 92] },

  tricepDipUp: { view: 'side', head: [18, 48, 7], shoulder: [28, 54], hip: [58, 58],
    elbowF: [28, 74], handF: [26, 90], kneeF: [80, 74], footF: [100, 84] },

  tricepDipDown: { view: 'side', head: [18, 62, 7], shoulder: [26, 68], hip: [54, 72],
    elbowF: [24, 84], handF: [26, 92], kneeF: [80, 78], footF: [102, 86] },

  downwardDog: { view: 'side', head: [40, 46, 7], shoulder: [46, 56], hip: [66, 40],
    elbowF: [40, 74], handF: [40, 90], kneeF: [92, 66], footF: [98, 90] },

  cobraUp: { view: 'side', head: [14, 58, 7], shoulder: [26, 68], hip: [66, 88],
    elbowF: [24, 80], handF: [28, 90], kneeF: [92, 88], footF: [108, 84] },

  childsPose: { view: 'side', head: [88, 90, 7], shoulder: [76, 84], hip: [34, 70],
    elbowF: [96, 88], handF: [110, 90], kneeF: [30, 88], footF: [24, 92] },

  proneTDown: { view: 'side', head: [10, 88, 6], shoulder: [24, 88], hip: [70, 90],
    elbowF: [4, 88], handF: [-6, 88], kneeF: [92, 90], footF: [108, 90] },

  proneTUp: { view: 'side', head: [10, 76, 6], shoulder: [24, 80], hip: [70, 90],
    elbowF: [0, 66], handF: [-10, 58], kneeF: [92, 90], footF: [108, 90] },

  reverseSnowAngelDown: { view: 'side', head: [10, 86, 6], shoulder: [24, 86], hip: [70, 90],
    elbowF: [-2, 90], handF: [-14, 92], kneeF: [92, 90], footF: [108, 90] },

  reverseSnowAngelUp: { view: 'side', head: [10, 74, 6], shoulder: [24, 78], hip: [70, 90],
    elbowF: [4, 54], handF: [-4, 40], kneeF: [92, 90], footF: [108, 90] },

  invertedRowHang: { view: 'side', head: [16, 70, 7], shoulder: [28, 74], hip: [64, 62],
    elbowF: [30, 52], handF: [30, 34], kneeF: [82, 72], footF: [102, 82] },

  invertedRowPull: { view: 'side', head: [22, 50, 7], shoulder: [30, 56], hip: [62, 60],
    elbowF: [22, 46], handF: [30, 34], kneeF: [80, 70], footF: [100, 80] },

  commandoPlank: { view: 'side', head: [14, 46, 7], shoulder: [26, 50], hip: [70, 54],
    elbowF: [26, 70], handF: [40, 74], kneeF: [90, 68], footF: [104, 88] },

  renegadeRowHold: { view: 'side', head: [14, 46, 7], shoulder: [26, 50], hip: [70, 54],
    elbowF: [30, 38], handF: [32, 22], kneeF: [90, 68], footF: [104, 88] },

  plankFeetTogether: { view: 'side', head: [14, 46, 7], shoulder: [26, 50], hip: [70, 54],
    elbowF: [27, 68], handF: [29, 88], kneeF: [90, 68], footF: [104, 88] },

  plankFeetWide: { view: 'side', head: [14, 46, 7], shoulder: [26, 50], hip: [70, 54],
    elbowF: [27, 68], handF: [29, 88], kneeF: [88, 72], footF: [106, 96], kneeB: [92, 62], footB: [108, 78] },

  catPose: { view: 'side', head: [18, 76, 7], shoulder: [28, 62], hip: [70, 60],
    elbowF: [28, 78], handF: [30, 92], kneeF: [82, 80], footF: [84, 92] },

  cowPose: { view: 'side', head: [10, 42, 7], shoulder: [26, 56], hip: [70, 68],
    elbowF: [28, 78], handF: [30, 92], kneeF: [82, 80], footF: [84, 92] },

  seatedHamstringReach: { view: 'side', head: [64, 44, 7], shoulder: [58, 54], hip: [70, 84],
    elbowF: [46, 58], handF: [30, 66], kneeF: [88, 84], footF: [108, 84] },

  seatedTallSpine: { view: 'side', head: [24, 40, 7], shoulder: [28, 52], hip: [70, 84],
    elbowF: [22, 68], handF: [20, 82], kneeF: [88, 84], footF: [108, 84] },

  seatedTwist: { view: 'side', head: [40, 40, 7], shoulder: [40, 52], hip: [70, 84],
    elbowF: [22, 56], handF: [10, 60], kneeF: [88, 84], footF: [50, 90] },
};

/* exercise/stretch id -> { start, end, mirror?, prop?, dir } */
const ILLUSTRATIONS = {
  // Cardio
  marching_in_place:      { start: 'standNeutral', end: 'highKneeLift', dir: '▲' },
  bodyweight_squats:      { start: 'standNeutral', end: 'squatBottom', dir: '▼' },
  situps:                 { start: 'situpDown', end: 'situpUp', dir: '▲' },
  modified_jumping_jacks: { start: 'standNeutral', end: 'standFeetOutArmsMid', dir: '↔' },
  chest_press_wall:       { start: 'wallLean', end: 'wallPushBottom', dir: '▼', prop: 'wall' },
  jumping_jacks:          { start: 'standNeutral', end: 'standArmsUp', dir: '↔' },
  high_knees:             { start: 'standNeutral', end: 'highKneeLift', dir: '▲' },
  speed_skaters:          { start: 'standNeutral', end: 'speedSkaterSide', dir: '↔' },
  chest_press_incline:    { start: 'plankTop', end: 'pushupBottom', dir: '▼', prop: 'chair' },
  burpees:                { start: 'plankTop', end: 'standArmsUp', dir: '▲' },
  jump_squats:            { start: 'squatBottom', end: 'jumpSquatAir', dir: '▲' },
  mountain_climbers:      { start: 'plankTop', end: 'mountainClimberKneeIn', dir: '↔' },
  chest_press_floor:      { start: 'plankTop', end: 'pushupBottom', dir: '▼' },

  // Back
  superman_holds:         { start: 'supermanFlat', end: 'supermanLift', dir: '▲' },
  prone_t_raises:         { start: 'proneTDown', end: 'proneTUp', dir: '▲' },
  bird_dogs:               { start: 'birdDogNeutral', end: 'birdDogExtend', dir: '↔' },
  glute_bridges:           { start: 'gluteBridgeFlat', end: 'gluteBridgeUp', dir: '▲' },
  quadruped_arm_raises:    { start: 'birdDogNeutral', end: 'birdDogExtend', dir: '▲' },
  supermans_pulse:         { start: 'supermanFlat', end: 'supermanLift', dir: '▲' },
  prone_iyt_raises:        { start: 'proneTDown', end: 'proneTUp', dir: '▲' },
  plank_shoulder_taps:     { start: 'plankTop', end: 'renegadeRowHold', dir: '↔' },
  reverse_snow_angels:     { start: 'reverseSnowAngelDown', end: 'reverseSnowAngelUp', dir: '▲' },
  bird_dogs_slow:          { start: 'birdDogNeutral', end: 'birdDogExtend', dir: '↔' },
  inverted_rows:           { start: 'invertedRowHang', end: 'invertedRowPull', dir: '▲', prop: 'table' },
  commandos:               { start: 'commandoPlank', end: 'plankTop', dir: '↔' },
  renegade_row_holds:      { start: 'plankTop', end: 'renegadeRowHold', dir: '▲' },
  plank_to_downward_dog:   { start: 'plankTop', end: 'downwardDog', dir: '▲' },
  superman_swimmers:       { start: 'supermanFlat', end: 'supermanLift', dir: '↔' },

  // Full body strength
  wall_pushups:            { start: 'wallLean', end: 'wallPushBottom', dir: '▼', prop: 'wall' },
  forward_lunges:          { start: 'standNeutral', end: 'lungeFront', dir: '▼' },
  dead_bugs:               { start: 'deadBugStart', end: 'deadBugExtend', dir: '↔' },
  pushups:                 { start: 'plankTop', end: 'pushupBottom', dir: '▼' },
  split_squats:            { start: 'standNeutral', end: 'lungeFront', dir: '▼' },
  plank_hold:              { start: 'plankTop', end: 'plankTop', dir: '→' },
  lateral_lunges:          { start: 'standNeutral', end: 'sideLungeBottom', dir: '↔' },
  tricep_dips_chair:       { start: 'tricepDipUp', end: 'tricepDipDown', dir: '▼', prop: 'chair' },
  burpee_pushups:          { start: 'plankTop', end: 'standArmsUp', dir: '▲' },
  jump_lunges:             { start: 'lungeFront', end: 'jumpSquatAir', dir: '▲' },
  pike_pushups:            { start: 'downwardDog', end: 'pushupBottom', dir: '▼' },
  single_leg_glute_bridges:{ start: 'gluteBridgeFlat', end: 'gluteBridgeUp', dir: '▲' },
  plank_jacks:             { start: 'plankFeetTogether', end: 'plankFeetWide', dir: '↔' },

  // Stretches
  stretch_quad_right:      { start: 'standNeutral', end: 'standingQuadStretch', dir: '→' },
  stretch_quad_left:       { start: 'standNeutral', end: 'standingQuadStretch', dir: '→', mirror: true },
  stretch_hamstring:       { start: 'seatedTallSpine', end: 'seatedHamstringReach', dir: '→' },
  stretch_chest:           { start: 'standNeutral', end: 'chestClaspBehind', dir: '→' },
  stretch_shoulder_right:  { start: 'standNeutral', end: 'shoulderCrossPull', dir: '→' },
  stretch_shoulder_left:   { start: 'standNeutral', end: 'shoulderCrossPull', dir: '→', mirror: true },
  stretch_cobra:           { start: 'supermanFlat', end: 'cobraUp', dir: '▲' },
  stretch_childs_pose:     { start: 'birdDogNeutral', end: 'childsPose', dir: '→' },
  stretch_cat_cow:         { start: 'cowPose', end: 'catPose', dir: '↔' },
  stretch_spinal_twist_right: { start: 'seatedTallSpine', end: 'seatedTwist', dir: '↔' },
  stretch_spinal_twist_left:  { start: 'seatedTallSpine', end: 'seatedTwist', dir: '↔', mirror: true },
};

function propMarkup(type) {
  switch (type) {
    case 'wall': return '<line x1="4" y1="0" x2="4" y2="118" class="ill-prop" />';
    case 'chair': return '<path d="M78 82 L100 82 L100 118" class="ill-prop" fill="none" />';
    case 'table': return '<path d="M20 30 L90 30 L90 38 M20 30 L20 38" class="ill-prop" fill="none" />';
    default: return '';
  }
}

function poseMarkup(pose) {
  const g = [];
  if (pose.view === 'front') {
    g.push(`<line x1="${pose.neck[0]}" y1="${pose.neck[1]}" x2="${pose.hip[0]}" y2="${pose.hip[1]}" class="ill-bone" />`);
    g.push(`<line x1="${pose.lSh[0]}" y1="${pose.lSh[1]}" x2="${pose.rSh[0]}" y2="${pose.rSh[1]}" class="ill-bone" />`);
    g.push(`<polyline points="${pose.lSh}  ${pose.lEl} ${pose.lHa}" class="ill-bone" />`);
    g.push(`<polyline points="${pose.rSh} ${pose.rEl} ${pose.rHa}" class="ill-bone" />`);
    g.push(`<polyline points="${pose.hip} ${pose.lKn} ${pose.lFo}" class="ill-bone" />`);
    g.push(`<polyline points="${pose.hip} ${pose.rKn} ${pose.rFo}" class="ill-bone" />`);
    g.push(`<circle cx="${pose.head[0]}" cy="${pose.head[1]}" r="${pose.head[2]}" class="ill-head" />`);
  } else {
    g.push(`<line x1="${pose.shoulder[0]}" y1="${pose.shoulder[1]}" x2="${pose.hip[0]}" y2="${pose.hip[1]}" class="ill-bone" />`);
    g.push(`<polyline points="${pose.shoulder} ${pose.elbowF} ${pose.handF}" class="ill-bone" />`);
    if (pose.elbowB) g.push(`<polyline points="${pose.shoulder} ${pose.elbowB} ${pose.handB}" class="ill-bone" />`);
    g.push(`<polyline points="${pose.hip} ${pose.kneeF} ${pose.footF}" class="ill-bone" />`);
    if (pose.kneeB) g.push(`<polyline points="${pose.hip} ${pose.kneeB} ${pose.footB}" class="ill-bone" />`);
    g.push(`<circle cx="${pose.head[0]}" cy="${pose.head[1]}" r="${pose.head[2]}" class="ill-head" />`);
  }
  return g.join('');
}

function dirGlyph(dir) {
  return `<text x="0" y="6" text-anchor="middle" class="ill-arrow">${dir}</text>`;
}

/* Returns a full inline <svg> string for the given illustration id. */
function illustrationSVG(id) {
  const spec = ILLUSTRATIONS[id];
  if (!spec) return '';
  const startPose = POSES[spec.start];
  const endPose = POSES[spec.end];
  const propA = propMarkup(spec.prop);
  const endTransform = spec.mirror ? 'translate(230,0) scale(-1,1)' : 'translate(130,0)';
  return `<svg viewBox="0 0 260 128" class="illustration" role="img" aria-label="${id}">
    <g class="ill-panel">
      <line x1="0" y1="118" x2="110" y2="118" class="ill-floor" />
      ${propA}
      ${poseMarkup(startPose)}
    </g>
    <g transform="${endTransform}" class="ill-panel">
      <line x1="0" y1="118" x2="110" y2="118" class="ill-floor" />
      ${propA}
      ${poseMarkup(endPose)}
    </g>
    <g transform="translate(128,64)">${dirGlyph(spec.dir)}</g>
  </svg>`;
}
