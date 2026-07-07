/* Exercise, stretch and workout data library. No frameworks, plain objects. */

const EXERCISES = {
  marching_in_place: { name: 'Marching in Place',
    fullScript: "Stand tall with good posture. Lift your knees alternately toward hip height, swinging your opposite arm as you go, like a slow jog in place. Keep your core braced and land softly on the balls of your feet.",
    briefCue: "Knees up, arms driving, land soft." },
  bodyweight_squats: { name: 'Bodyweight Squats',
    fullScript: "Stand with feet shoulder width apart, toes slightly out. Push your hips back and bend your knees like sitting into a chair, keeping your chest up and weight in your heels. Drive back up to standing by pushing through your heels.",
    briefCue: "Chest up, sit back, drive through the heels." },
  situps: { name: 'Sit-Ups',
    fullScript: "Lie on your back with knees bent and feet flat on the floor. Cross your hands on your chest or place them lightly behind your ears. Engage your core and lift your upper body toward your knees, exhaling as you rise. Lower back down with control. Never pull on your neck.",
    briefCue: "Exhale up, control the way down." },
  modified_jumping_jacks: { name: 'Modified Jumping Jacks',
    fullScript: "Stand with feet together, arms at your sides. Step one foot out to the side while raising both arms overhead, then step back to center as you lower your arms. Alternate sides at a steady pace, keeping your core engaged.",
    briefCue: "Step and reach, arms overhead." },
  chest_press_wall: { name: 'Chest-Shoulder Press (Wall)',
    fullScript: "Stand facing a wall, arms length away. Place your hands on the wall slightly wider than your shoulders, just below shoulder height. Keep your body in a straight line and your core tight. Bend your elbows and bring your chest toward the wall, then press back with power until your arms are almost straight. Do not lock your elbows. Move with control: two seconds in, one second hold, press out.",
    briefCue: "Chest to the wall, press out with power." },
  jumping_jacks: { name: 'Jumping Jacks',
    fullScript: "Start standing with feet together and arms at your sides. Jump your feet out wide while raising your arms overhead, then jump back to the start position. Keep your knees soft and land quietly.",
    briefCue: "Feet out, arms up, land soft." },
  high_knees: { name: 'High Knees',
    fullScript: "Stand tall with your core braced. Drive your knees up toward your chest one at a time as quickly as you can, pumping your arms like a sprint. Stay light on your feet and keep your chest up.",
    briefCue: "Drive the knees, pump the arms." },
  speed_skaters: { name: 'Speed Skaters',
    fullScript: "Stand with feet hip width apart. Push off one foot and leap sideways onto the other, letting your trailing leg sweep behind you like a speed skater. Swing your arms across your body for momentum and land soft with a bent knee.",
    briefCue: "Leap side to side, land soft." },
  chest_press_incline: { name: 'Chest-Shoulder Press (Incline)',
    fullScript: "Place your hands on a low, sturdy table or chair, slightly wider than shoulder width. Walk your feet back so your body forms a straight line. Bend your elbows and bring your chest toward the edge, then press back with power until your arms are almost straight. Move with control: two seconds in, one second hold, press out.",
    briefCue: "Chest to the edge, press out with power." },
  burpees: { name: 'Burpees',
    fullScript: "Start standing. Drop into a squat, place your hands on the floor, and jump your feet back into a plank. Do one push-up, jump your feet back to your hands, then explode straight up into a jump with arms overhead. Move at your own pace and keep your core tight throughout.",
    briefCue: "Plank, push-up, jump up." },
  jump_squats: { name: 'Jump Squats',
    fullScript: "Start in a bodyweight squat position, chest up and hips back. Explode straight up into a jump, reaching arms overhead, then land softly back into the squat position, absorbing the landing with bent knees.",
    briefCue: "Explode up, land soft and low." },
  mountain_climbers: { name: 'Mountain Climbers',
    fullScript: "Start in a high plank with hands under your shoulders and body in a straight line. Drive one knee toward your chest, then quickly switch legs, like running in place on the floor. Keep your hips level and core braced.",
    briefCue: "Drive the knees, hips stay level." },
  chest_press_floor: { name: 'Chest-Shoulder Press (Floor)',
    fullScript: "Start in a high plank, hands slightly wider than shoulders. Lower your chest toward the floor with control for two seconds, pause for one second at the bottom, then drive up explosively with power. Keep your body in a straight line throughout.",
    briefCue: "Lower with control, drive up with power." },
  superman_holds: { name: 'Superman Holds',
    fullScript: "Lie face down with arms extended overhead and legs straight. Simultaneously lift your arms, chest, and legs off the floor, squeezing your glutes and lower back. Hold the lifted position, keeping your neck neutral, then lower with control.",
    briefCue: "Lift arms and legs, squeeze the back." },
  prone_t_raises: { name: 'Prone T Raises',
    fullScript: "Lie face down with arms out to the sides at shoulder height, forming a T shape. Squeeze your shoulder blades together and lift your arms and chest slightly off the floor. Lower with control and repeat.",
    briefCue: "Squeeze shoulder blades, lift the T." },
  bird_dogs: { name: 'Bird Dogs',
    fullScript: "Start on your hands and knees, hands under shoulders and knees under hips. Extend one arm straight forward and the opposite leg straight back, keeping your hips level and core braced. Return to start and switch sides.",
    briefCue: "Opposite arm and leg, hips stay square." },
  glute_bridges: { name: 'Glute Bridges',
    fullScript: "Lie on your back with knees bent and feet flat on the floor, hip width apart. Squeeze your glutes and lift your hips toward the ceiling until your body forms a straight line from shoulders to knees. Lower with control.",
    briefCue: "Squeeze glutes, hips to the ceiling." },
  quadruped_arm_raises: { name: 'Quadruped Arm Raises',
    fullScript: "Start on your hands and knees, back flat like a tabletop. Slowly raise one arm straight forward to shoulder height, keeping your hips and shoulders square. Lower with control and switch arms.",
    briefCue: "One arm forward, hips stay steady." },
  supermans_pulse: { name: 'Supermans with Pulse',
    fullScript: "Lie face down, arms extended overhead, legs straight. Lift your arms, chest, and legs off the floor, then add small quick pulses at the top, squeezing your lower back and glutes. Keep breathing steadily throughout.",
    briefCue: "Small pulses at the top, squeeze tight." },
  prone_iyt_raises: { name: 'Prone I-Y-T Raises',
    fullScript: "Lie face down with arms extended. Move through three positions: arms overhead in a line for I, arms angled up in a Y, then out to the sides for T, lifting your chest slightly with each. Squeeze your upper back throughout.",
    briefCue: "I, Y, T — squeeze the upper back." },
  plank_shoulder_taps: { name: 'Plank Shoulder Taps',
    fullScript: "Start in a high plank, hands under shoulders, feet a little wider than hip width for stability. Tap your left hand to your right shoulder, then your right hand to your left shoulder, keeping your hips as still as possible.",
    briefCue: "Tap and stabilize, hips stay still." },
  reverse_snow_angels: { name: 'Reverse Snow Angels',
    fullScript: "Lie face down with arms at your sides, palms down. Sweep your arms out and up along the floor toward overhead, like making a snow angel, lifting your chest slightly as your arms rise. Reverse the motion back to start.",
    briefCue: "Sweep arms overhead, lift the chest." },
  bird_dogs_slow: { name: 'Bird Dogs (Slow Hold)',
    fullScript: "Start on hands and knees, hands under shoulders, knees under hips. Extend one arm forward and the opposite leg back, and hold that fully extended position for three full seconds before switching. Keep your hips level throughout.",
    briefCue: "Extend, hold three seconds, switch." },
  inverted_rows: { name: 'Inverted Rows',
    fullScript: "Lie under a sturdy table or fixed bar at chest height. Grip the edge with both hands, body straight from head to heels. Pull your chest up toward the table by squeezing your shoulder blades together, then lower with control.",
    briefCue: "Pull chest up, squeeze the blades." },
  commandos: { name: 'Commandos',
    fullScript: "Start in a high plank on your hands. Lower one arm at a time down to your forearms into an elbow plank, then press back up one arm at a time to the high plank. Keep your hips steady and avoid rocking side to side.",
    briefCue: "Down one arm at a time, hips steady." },
  renegade_row_holds: { name: 'Renegade Row Position Holds',
    fullScript: "Start in a high plank with hands under your shoulders, feet wide for stability. Lift one hand slightly off the floor as if rowing, holding the shifted plank position, keeping your hips square and core braced.",
    briefCue: "Lift and hold, hips square." },
  plank_to_downward_dog: { name: 'Plank to Downward Dog',
    fullScript: "Start in a high plank, body in a straight line. Push your hips up and back into an inverted V, straightening your legs and pressing your heels toward the floor. Flow back to plank with control.",
    briefCue: "Hips up and back, heels reach down." },
  superman_swimmers: { name: 'Superman Swimmers',
    fullScript: "Lie face down, arms extended overhead, legs straight, lifted off the floor. Alternate raising opposite arm and leg in a slow fluttering swim motion, keeping your core braced and neck neutral.",
    briefCue: "Alternate arms and legs, swim it out." },
  wall_pushups: { name: 'Wall Push-Ups',
    fullScript: "Stand facing a wall, arms length away. Place your hands on the wall slightly wider than your shoulders. Keep your body in a straight line and core tight as you bend your elbows and bring your chest toward the wall. Press back to start without locking your elbows.",
    briefCue: "Chest to the wall, press back out." },
  forward_lunges: { name: 'Forward Lunges',
    fullScript: "Stand tall with feet hip width apart. Step forward with one leg and lower your hips until both knees are bent around ninety degrees, front knee tracking over your toes. Push through your front heel to return to standing, then alternate legs.",
    briefCue: "Front knee over toes, push through the heel." },
  dead_bugs: { name: 'Dead Bugs',
    fullScript: "Lie on your back with arms reaching straight up and knees bent at ninety degrees over your hips, like a tabletop. Slowly lower one arm overhead and the opposite leg straight out, keeping your lower back pressed into the floor. Return and switch sides.",
    briefCue: "Opposite arm and leg, low back stays flat." },
  pushups: { name: 'Push-Ups',
    fullScript: "Start in a high plank, hands slightly wider than shoulders. Keep your body in a straight line from head to heels as you bend your elbows and lower your chest toward the floor. Press back up to full extension without locking your elbows.",
    briefCue: "Straight line, elbows track back, press up." },
  split_squats: { name: 'Split Squats',
    fullScript: "Stand in a staggered stance, one foot forward and one foot back. Lower straight down until both knees form roughly ninety degree angles, keeping your front knee over your toes and torso upright. Push through the front heel to rise.",
    briefCue: "Straight down, front knee over toes." },
  plank_hold: { name: 'Plank Hold',
    fullScript: "Start face down, propped up on your forearms or hands, elbows under shoulders. Form a straight line from your head to your heels by bracing your core and squeezing your glutes. Hold the position without letting your hips sag or pike up.",
    briefCue: "Straight line head to heels, don't let hips sag." },
  lateral_lunges: { name: 'Lateral Lunges',
    fullScript: "Stand tall with feet together. Step one leg out wide to the side and bend that knee, pushing your hips back while keeping the other leg straight. Push off the bent leg to return to standing, then alternate sides.",
    briefCue: "Bend one knee, other leg stays straight." },
  tricep_dips_chair: { name: 'Tricep Dips (Chair)',
    fullScript: "Sit on the edge of a sturdy chair, hands gripping the edge beside your hips, fingers forward. Slide your hips off the chair and lower your body by bending your elbows straight back, then press through your palms to rise. Keep your elbows pointing behind you, not out to the sides.",
    briefCue: "Elbows straight back, press through the palms." },
  burpee_pushups: { name: 'Burpee Push-Ups',
    fullScript: "Start standing, drop into a squat and place your hands on the floor, then jump your feet back into a plank. Perform a full push-up, chest to the floor, then jump your feet back to your hands and explode up into a jump.",
    briefCue: "Push-up in the plank, then explode up." },
  jump_lunges: { name: 'Jump Lunges',
    fullScript: "Start in a lunge position, one foot forward and one back, both knees bent. Jump explosively and switch legs in the air, landing softly back into a lunge with the opposite leg forward. Absorb each landing with bent knees.",
    briefCue: "Switch legs in the air, land soft." },
  pike_pushups: { name: 'Pike Push-Ups',
    fullScript: "Start in a downward dog position, hips high and body forming an inverted V, hands under shoulders. Bend your elbows and lower the top of your head toward the floor between your hands, then press back up. This targets your shoulders more than a flat push-up.",
    briefCue: "Hips high, lower the head, press up." },
  single_leg_glute_bridges: { name: 'Single Leg Glute Bridges',
    fullScript: "Lie on your back with knees bent, feet flat. Extend one leg straight out, then drive through the heel of your planted foot to lift your hips, keeping them level. Lower with control and complete reps before switching legs.",
    briefCue: "One leg extended, drive through the heel." },
  plank_jacks: { name: 'Plank Jacks',
    fullScript: "Start in a high plank with feet together. Jump your feet out wide and back together, like a jumping jack for your lower body, while keeping your hips steady and core braced.",
    briefCue: "Feet jump wide, hips stay steady." },
};

const STRETCHES_STANDARD = [
  { id: 'stretch_quad_right', name: 'Standing Quad Stretch (Right)',
    script: "Stand tall. Bend your right knee and bring your heel toward your glutes. Hold your ankle with your right hand. Keep your knees together and push your hips slightly forward. You should feel this along the front of your thigh." },
  { id: 'stretch_quad_left', name: 'Standing Quad Stretch (Left)',
    script: "Switch sides. Left heel to glutes, hold with your left hand. Knees together, hips forward." },
  { id: 'stretch_hamstring', name: 'Hamstring Stretch',
    script: "Sit on the floor, legs straight in front of you. Hinge at your hips and reach toward your toes. Keep your back long, do not round it. Go only as far as comfortable. You should feel the back of your thighs." },
  { id: 'stretch_chest', name: 'Chest Stretch',
    script: "Stand or kneel. Clasp your hands behind your back and straighten your arms. Lift your chest and squeeze your shoulder blades together. Feel it open across your chest and shoulders." },
  { id: 'stretch_shoulder_right', name: 'Shoulder Stretch (Right)',
    script: "Bring your right arm straight across your chest. Use your left hand above the elbow to gently pull it closer. Keep the shoulder down, away from your ear." },
  { id: 'stretch_shoulder_left', name: 'Shoulder Stretch (Left)',
    script: "Switch. Left arm across your chest, gently pull with the right hand." },
  { id: 'stretch_cobra', name: 'Cobra Stretch',
    script: "Lie face down. Place your hands under your shoulders and gently push your chest up, hips staying on the floor. Feel the stretch through your abs and lower back. Only go as high as comfortable." },
  { id: 'stretch_childs_pose', name: "Child's Pose",
    script: "Kneel down and sit back on your heels. Reach your arms far forward along the floor and lower your forehead. Breathe deeply and let your back relax." },
];

const STRETCHES_BACK = [
  { id: 'stretch_cat_cow', name: 'Cat-Cow',
    script: "On hands and knees. Arch your back up like a cat, tuck your chin. Then drop your belly and lift your chest. Move slowly with your breath." },
  { id: 'stretch_spinal_twist_right', name: 'Seated Spinal Twist (Right)',
    script: "Sit with your legs extended. Cross your right foot over your left knee, place your right hand behind you, and gently twist toward the right, looking over your shoulder. Keep your spine tall." },
  { id: 'stretch_spinal_twist_left', name: 'Seated Spinal Twist (Left)',
    script: "Switch sides. Cross your left foot over your right knee, twist gently to the left, looking over your shoulder. Keep your spine tall." },
  { id: 'stretch_hamstring', name: 'Hamstring Stretch',
    script: "Sit on the floor, legs straight in front of you. Hinge at your hips and reach toward your toes. Keep your back long, do not round it. Go only as far as comfortable. You should feel the back of your thighs." },
  { id: 'stretch_chest', name: 'Chest Stretch',
    script: "Stand or kneel. Clasp your hands behind your back and straighten your arms. Lift your chest and squeeze your shoulder blades together. Feel it open across your chest and shoulders." },
  { id: 'stretch_shoulder_right', name: 'Shoulder Stretch (Right)',
    script: "Bring your right arm straight across your chest. Use your left hand above the elbow to gently pull it closer. Keep the shoulder down, away from your ear." },
  { id: 'stretch_shoulder_left', name: 'Shoulder Stretch (Left)',
    script: "Switch. Left arm across your chest, gently pull with the right hand." },
  { id: 'stretch_cobra', name: 'Cobra Stretch',
    script: "Lie face down. Place your hands under your shoulders and gently push your chest up, hips staying on the floor. Feel the stretch through your abs and lower back. Only go as high as comfortable." },
  { id: 'stretch_childs_pose', name: "Child's Pose",
    script: "Kneel down and sit back on your heels. Reach your arms far forward along the floor and lower your forehead. Breathe deeply and let your back relax." },
];

const DIFFICULTIES = {
  Beginner: { workSec: 30, restSec: 30, ratio: '1:1' },
  Intermediate: { workSec: 40, restSec: 20, ratio: '2:1' },
  Advanced: { workSec: 45, restSec: 15, ratio: '3:1' },
};

/* Fixed round counts chosen so total time lands as close as possible to the
   selected target, per the 6-minute-per-round (5 exercises + 60s break) math
   that holds for every difficulty (work+rest always sums to 60s). */
const ROUNDS_BY_DURATION = { 15: 2, 20: 3, 30: 5 };

const CATEGORY_COLOR = { Cardio: '#00e5ff', Back: '#c724ff', 'Full Body': '#ff6b1a' };

const WORKOUTS = {
  Cardio: {
    Beginner: ['marching_in_place', 'bodyweight_squats', 'situps', 'modified_jumping_jacks', 'chest_press_wall'],
    Intermediate: ['jumping_jacks', 'high_knees', 'situps', 'speed_skaters', 'chest_press_incline'],
    Advanced: ['burpees', 'jump_squats', 'situps', 'mountain_climbers', 'chest_press_floor'],
  },
  Back: {
    Beginner: ['superman_holds', 'prone_t_raises', 'bird_dogs', 'glute_bridges', 'quadruped_arm_raises'],
    Intermediate: ['supermans_pulse', 'prone_iyt_raises', 'plank_shoulder_taps', 'reverse_snow_angels', 'bird_dogs_slow'],
    Advanced: ['inverted_rows', 'commandos', 'renegade_row_holds', 'plank_to_downward_dog', 'superman_swimmers'],
  },
  'Full Body': {
    Beginner: ['bodyweight_squats', 'wall_pushups', 'glute_bridges', 'forward_lunges', 'dead_bugs'],
    Intermediate: ['pushups', 'split_squats', 'plank_hold', 'lateral_lunges', 'tricep_dips_chair'],
    Advanced: ['burpee_pushups', 'jump_lunges', 'pike_pushups', 'single_leg_glute_bridges', 'plank_jacks'],
  },
};

function getStretchSequence(category) {
  return category === 'Back' ? STRETCHES_BACK : STRETCHES_STANDARD;
}

/* Computes round count + real total seconds (excluding stretches) for a
   given category/difficulty/target duration selection. */
function computeWorkoutPlan(category, difficulty, targetMinutes) {
  const { workSec, restSec } = DIFFICULTIES[difficulty];
  const rounds = ROUNDS_BY_DURATION[targetMinutes] || 3;
  const exercises = WORKOUTS[category][difficulty];
  const roundBreakSec = 60;
  const prepSec = restSec; // rest-length prep period before the very first exercise
  const totalSec = prepSec + rounds * 5 * (workSec + restSec) + Math.max(0, rounds - 1) * roundBreakSec;
  return {
    category, difficulty, targetMinutes, rounds, exercises,
    workSec, restSec, roundBreakSec, prepSec, totalSec,
    stretchSec: getStretchSequence(category).length * 30,
  };
}
