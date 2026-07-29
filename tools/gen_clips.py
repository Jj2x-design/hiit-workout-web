#!/usr/bin/env python3
"""Generates pre-recorded voice clips (macOS `say` -> AAC) for every spoken
line in the app, plus a JS manifest with exact durations. This replaces live
speechSynthesis (which iOS treats as an interrupting audio session and pauses
background music) with regular decoded-audio playback through Web Audio,
which does not trigger the same interruption.

Run from anywhere: python3 tools/gen_clips.py
"""
import subprocess
import os
import sys
import json
import wave
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIPS_DIR = os.path.join(ROOT, 'audio', 'clips')
TMP_DIR = '/tmp/hiit_clip_gen'
VOICE = 'Samantha'
RATE_WPM = 172  # approximates speechSynthesis rate ~0.95

os.makedirs(CLIPS_DIR, exist_ok=True)
os.makedirs(TMP_DIR, exist_ok=True)

# ---- Source content (mirrors js/data.js exactly) ----

EXERCISES = {
    'marching_in_place': ('Marching in Place',
        "Stand tall with good posture. Lift your knees alternately toward hip height, swinging your opposite arm as you go, like a slow jog in place. Keep your core braced and land softly on the balls of your feet.",
        "Knees up, arms driving, land soft."),
    'bodyweight_squats': ('Bodyweight Squats',
        "Stand with feet shoulder width apart, toes slightly out. Push your hips back and bend your knees like sitting into a chair, keeping your chest up and weight in your heels. Drive back up to standing by pushing through your heels.",
        "Chest up, sit back, drive through the heels."),
    'situps': ('Sit-Ups',
        "Lie on your back with knees bent and feet flat on the floor. Cross your hands on your chest or place them lightly behind your ears. Engage your core and lift your upper body toward your knees, exhaling as you rise. Lower back down with control. Never pull on your neck.",
        "Exhale up, control the way down."),
    'modified_jumping_jacks': ('Modified Jumping Jacks',
        "Stand with feet together, arms at your sides. Step one foot out to the side while raising both arms overhead, then step back to center as you lower your arms. Alternate sides at a steady pace, keeping your core engaged.",
        "Step and reach, arms overhead."),
    'chest_press_wall': ('Chest-Shoulder Press (Wall)',
        "Stand facing a wall, arms length away. Place your hands on the wall slightly wider than your shoulders, just below shoulder height. Keep your body in a straight line and your core tight. Bend your elbows and bring your chest toward the wall, then press back with power until your arms are almost straight. Do not lock your elbows. Move with control: two seconds in, one second hold, press out.",
        "Chest to the wall, press out with power."),
    'jumping_jacks': ('Jumping Jacks',
        "Start standing with feet together and arms at your sides. Jump your feet out wide while raising your arms overhead, then jump back to the start position. Keep your knees soft and land quietly.",
        "Feet out, arms up, land soft."),
    'high_knees': ('High Knees',
        "Stand tall with your core braced. Drive your knees up toward your chest one at a time as quickly as you can, pumping your arms like a sprint. Stay light on your feet and keep your chest up.",
        "Drive the knees, pump the arms."),
    'speed_skaters': ('Speed Skaters',
        "Stand with feet hip width apart. Push off one foot and leap sideways onto the other, letting your trailing leg sweep behind you like a speed skater. Swing your arms across your body for momentum and land soft with a bent knee.",
        "Leap side to side, land soft."),
    'chest_press_incline': ('Chest-Shoulder Press (Incline)',
        "Place your hands on a low, sturdy table or chair, slightly wider than shoulder width. Walk your feet back so your body forms a straight line. Bend your elbows and bring your chest toward the edge, then press back with power until your arms are almost straight. Move with control: two seconds in, one second hold, press out.",
        "Chest to the edge, press out with power."),
    'burpees': ('Burpees',
        "Start standing. Drop into a squat, place your hands on the floor, and jump your feet back into a plank. Do one push-up, jump your feet back to your hands, then explode straight up into a jump with arms overhead. Move at your own pace and keep your core tight throughout.",
        "Plank, push-up, jump up."),
    'jump_squats': ('Jump Squats',
        "Start in a bodyweight squat position, chest up and hips back. Explode straight up into a jump, reaching arms overhead, then land softly back into the squat position, absorbing the landing with bent knees.",
        "Explode up, land soft and low."),
    'mountain_climbers': ('Mountain Climbers',
        "Start in a high plank with hands under your shoulders and body in a straight line. Drive one knee toward your chest, then quickly switch legs, like running in place on the floor. Keep your hips level and core braced.",
        "Drive the knees, hips stay level."),
    'chest_press_floor': ('Chest-Shoulder Press (Floor)',
        "Start in a high plank, hands slightly wider than shoulders. Lower your chest toward the floor with control for two seconds, pause for one second at the bottom, then drive up explosively with power. Keep your body in a straight line throughout.",
        "Lower with control, drive up with power."),
    'superman_holds': ('Superman Holds',
        "Lie face down with arms extended overhead and legs straight. Simultaneously lift your arms, chest, and legs off the floor, squeezing your glutes and lower back. Hold the lifted position, keeping your neck neutral, then lower with control.",
        "Lift arms and legs, squeeze the back."),
    'prone_t_raises': ('Prone T Raises',
        "Lie face down with arms out to the sides at shoulder height, forming a T shape. Squeeze your shoulder blades together and lift your arms and chest slightly off the floor. Lower with control and repeat.",
        "Squeeze shoulder blades, lift the T."),
    'bird_dogs': ('Bird Dogs',
        "Start on your hands and knees, hands under shoulders and knees under hips. Extend one arm straight forward and the opposite leg straight back, keeping your hips level and core braced. Return to start and switch sides.",
        "Opposite arm and leg, hips stay square."),
    'glute_bridges': ('Glute Bridges',
        "Lie on your back with knees bent and feet flat on the floor, hip width apart. Squeeze your glutes and lift your hips toward the ceiling until your body forms a straight line from shoulders to knees. Lower with control.",
        "Squeeze glutes, hips to the ceiling."),
    'quadruped_arm_raises': ('Quadruped Arm Raises',
        "Start on your hands and knees, back flat like a tabletop. Slowly raise one arm straight forward to shoulder height, keeping your hips and shoulders square. Lower with control and switch arms.",
        "One arm forward, hips stay steady."),
    'supermans_pulse': ('Supermans with Pulse',
        "Lie face down, arms extended overhead, legs straight. Lift your arms, chest, and legs off the floor, then add small quick pulses at the top, squeezing your lower back and glutes. Keep breathing steadily throughout.",
        "Small pulses at the top, squeeze tight."),
    'prone_iyt_raises': ('Prone I-Y-T Raises',
        "Lie face down with arms extended. Move through three positions: arms overhead in a line for I, arms angled up in a Y, then out to the sides for T, lifting your chest slightly with each. Squeeze your upper back throughout.",
        "I, Y, T, squeeze the upper back."),
    'plank_shoulder_taps': ('Plank Shoulder Taps',
        "Start in a high plank, hands under shoulders, feet a little wider than hip width for stability. Tap your left hand to your right shoulder, then your right hand to your left shoulder, keeping your hips as still as possible.",
        "Tap and stabilize, hips stay still."),
    'reverse_snow_angels': ('Reverse Snow Angels',
        "Lie face down with arms at your sides, palms down. Sweep your arms out and up along the floor toward overhead, like making a snow angel, lifting your chest slightly as your arms rise. Reverse the motion back to start.",
        "Sweep arms overhead, lift the chest."),
    'bird_dogs_slow': ('Bird Dogs (Slow Hold)',
        "Start on hands and knees, hands under shoulders, knees under hips. Extend one arm forward and the opposite leg back, and hold that fully extended position for three full seconds before switching. Keep your hips level throughout.",
        "Extend, hold three seconds, switch."),
    'inverted_rows': ('Inverted Rows',
        "Lie under a sturdy table or fixed bar at chest height. Grip the edge with both hands, body straight from head to heels. Pull your chest up toward the table by squeezing your shoulder blades together, then lower with control.",
        "Pull chest up, squeeze the blades."),
    'commandos': ('Commandos',
        "Start in a high plank on your hands. Lower one arm at a time down to your forearms into an elbow plank, then press back up one arm at a time to the high plank. Keep your hips steady and avoid rocking side to side.",
        "Down one arm at a time, hips steady."),
    'renegade_row_holds': ('Renegade Row Position Holds',
        "Start in a high plank with hands under your shoulders, feet wide for stability. Lift one hand slightly off the floor as if rowing, holding the shifted plank position, keeping your hips square and core braced.",
        "Lift and hold, hips square."),
    'plank_to_downward_dog': ('Plank to Downward Dog',
        "Start in a high plank, body in a straight line. Push your hips up and back into an inverted V, straightening your legs and pressing your heels toward the floor. Flow back to plank with control.",
        "Hips up and back, heels reach down."),
    'superman_swimmers': ('Superman Swimmers',
        "Lie face down, arms extended overhead, legs straight, lifted off the floor. Alternate raising opposite arm and leg in a slow fluttering swim motion, keeping your core braced and neck neutral.",
        "Alternate arms and legs, swim it out."),
    'wall_pushups': ('Wall Push-Ups',
        "Stand facing a wall, arms length away. Place your hands on the wall slightly wider than your shoulders. Keep your body in a straight line and core tight as you bend your elbows and bring your chest toward the wall. Press back to start without locking your elbows.",
        "Chest to the wall, press back out."),
    'forward_lunges': ('Forward Lunges',
        "Stand tall with feet hip width apart. Step forward with one leg and lower your hips until both knees are bent around ninety degrees, front knee tracking over your toes. Push through your front heel to return to standing, then alternate legs.",
        "Front knee over toes, push through the heel."),
    'dead_bugs': ('Dead Bugs',
        "Lie on your back with arms reaching straight up and knees bent at ninety degrees over your hips, like a tabletop. Slowly lower one arm overhead and the opposite leg straight out, keeping your lower back pressed into the floor. Return and switch sides.",
        "Opposite arm and leg, low back stays flat."),
    'pushups': ('Push-Ups',
        "Start in a high plank, hands slightly wider than shoulders. Keep your body in a straight line from head to heels as you bend your elbows and lower your chest toward the floor. Press back up to full extension without locking your elbows.",
        "Straight line, elbows track back, press up."),
    'split_squats': ('Split Squats',
        "Stand in a staggered stance, one foot forward and one foot back. Lower straight down until both knees form roughly ninety degree angles, keeping your front knee over your toes and torso upright. Push through the front heel to rise.",
        "Straight down, front knee over toes."),
    'plank_hold': ('Plank Hold',
        "Start face down, propped up on your forearms or hands, elbows under shoulders. Form a straight line from your head to your heels by bracing your core and squeezing your glutes. Hold the position without letting your hips sag or pike up.",
        "Straight line head to heels, don't let hips sag."),
    'lateral_lunges': ('Lateral Lunges',
        "Stand tall with feet together. Step one leg out wide to the side and bend that knee, pushing your hips back while keeping the other leg straight. Push off the bent leg to return to standing, then alternate sides.",
        "Bend one knee, other leg stays straight."),
    'tricep_dips_chair': ('Tricep Dips (Chair)',
        "Sit on the edge of a sturdy chair, hands gripping the edge beside your hips, fingers forward. Slide your hips off the chair and lower your body by bending your elbows straight back, then press through your palms to rise. Keep your elbows pointing behind you, not out to the sides.",
        "Elbows straight back, press through the palms."),
    'burpee_pushups': ('Burpee Push-Ups',
        "Start standing, drop into a squat and place your hands on the floor, then jump your feet back into a plank. Perform a full push-up, chest to the floor, then jump your feet back to your hands and explode up into a jump.",
        "Push-up in the plank, then explode up."),
    'jump_lunges': ('Jump Lunges',
        "Start in a lunge position, one foot forward and one back, both knees bent. Jump explosively and switch legs in the air, landing softly back into a lunge with the opposite leg forward. Absorb each landing with bent knees.",
        "Switch legs in the air, land soft."),
    'pike_pushups': ('Pike Push-Ups',
        "Start in a downward dog position, hips high and body forming an inverted V, hands under shoulders. Bend your elbows and lower the top of your head toward the floor between your hands, then press back up. This targets your shoulders more than a flat push-up.",
        "Hips high, lower the head, press up."),
    'single_leg_glute_bridges': ('Single Leg Glute Bridges',
        "Lie on your back with knees bent, feet flat. Extend one leg straight out, then drive through the heel of your planted foot to lift your hips, keeping them level. Lower with control and complete reps before switching legs.",
        "One leg extended, drive through the heel."),
    'plank_jacks': ('Plank Jacks',
        "Start in a high plank with feet together. Jump your feet out wide and back together, like a jumping jack for your lower body, while keeping your hips steady and core braced.",
        "Feet jump wide, hips stay steady."),
}

STRETCHES = {
    'stretch_quad_right': ('Standing Quad Stretch (Right)',
        "Stand tall. Bend your right knee and bring your heel toward your glutes. Hold your ankle with your right hand. Keep your knees together and push your hips slightly forward. You should feel this along the front of your thigh."),
    'stretch_quad_left': ('Standing Quad Stretch (Left)',
        "Switch sides. Left heel to glutes, hold with your left hand. Knees together, hips forward."),
    'stretch_hamstring': ('Hamstring Stretch',
        "Sit on the floor, legs straight in front of you. Hinge at your hips and reach toward your toes. Keep your back long, do not round it. Go only as far as comfortable. You should feel the back of your thighs."),
    'stretch_chest': ('Chest Stretch',
        "Stand or kneel. Clasp your hands behind your back and straighten your arms. Lift your chest and squeeze your shoulder blades together. Feel it open across your chest and shoulders."),
    'stretch_shoulder_right': ('Shoulder Stretch (Right)',
        "Bring your right arm straight across your chest. Use your left hand above the elbow to gently pull it closer. Keep the shoulder down, away from your ear."),
    'stretch_shoulder_left': ('Shoulder Stretch (Left)',
        "Switch. Left arm across your chest, gently pull with the right hand."),
    'stretch_cobra': ('Cobra Stretch',
        "Lie face down. Place your hands under your shoulders and gently push your chest up, hips staying on the floor. Feel the stretch through your abs and lower back. Only go as high as comfortable."),
    'stretch_childs_pose': ("Child's Pose",
        "Kneel down and sit back on your heels. Reach your arms far forward along the floor and lower your forehead. Breathe deeply and let your back relax."),
    'stretch_cat_cow': ('Cat-Cow',
        "On hands and knees. Arch your back up like a cat, tuck your chin. Then drop your belly and lift your chest. Move slowly with your breath."),
    'stretch_spinal_twist_right': ('Seated Spinal Twist (Right)',
        "Sit with your legs extended. Cross your right foot over your left knee, place your right hand behind you, and gently twist toward the right, looking over your shoulder. Keep your spine tall."),
    'stretch_spinal_twist_left': ('Seated Spinal Twist (Left)',
        "Switch sides. Cross your left foot over your right knee, twist gently to the left, looking over your shoulder. Keep your spine tall."),
}

FIXED_PHRASES = {
    'get_ready': "Get ready.",
    'rest': "Rest.",
    'go': "Go!",
    'halfway': "Halfway.",
    'five_seconds': "Five seconds.",
    'count_three': "Three",
    'count_two': "Two",
    'count_one': "One",
    'round_complete': "Round complete. Sixty seconds rest. Grab some water.",
    'thirty_seconds': "Thirty seconds.",
    'next_round_soon': "Next round starting soon.",
    'workout_complete': "Workout complete. Time to stretch.",
    'relax_breathe': "Relax into it. Breathe.",
    'stretching_complete': "Stretching complete. Well done today.",
    'voice_test': "This is your coaching voice at the current volume.",
}


def make_clip(key, text):
    wav_path = os.path.join(TMP_DIR, f'{key}.wav')
    m4a_path = os.path.join(CLIPS_DIR, f'{key}.m4a')
    subprocess.run(['say', '-v', VOICE, '-r', str(RATE_WPM), '--data-format=LEI16@22050',
                     '--file-format=WAVE', '-o', wav_path, text], check=True)
    subprocess.run(['afconvert', '-f', 'mp4f', '-d', 'aac', '-b', '48000', wav_path, m4a_path],
                    check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    with wave.open(wav_path, 'rb') as wf:
        duration = wf.getnframes() / wf.getframerate()
    os.remove(wav_path)
    size = os.path.getsize(m4a_path)
    return round(duration, 3), size


def main():
    manifest = {}
    total_size = 0
    count = 0

    jobs = []
    for eid, (name, full, brief) in EXERCISES.items():
        jobs.append((f'lead_first_{eid}', f'First up: {name}.'))
        jobs.append((f'lead_next_{eid}', f'Next up: {name}.'))
        jobs.append((f'lead_final_{eid}', f'Final exercise: {name}. Make it count.'))
        jobs.append((f'full_{eid}', full))
        jobs.append((f'brief_{eid}', brief))
    for sid, (name, script) in STRETCHES.items():
        jobs.append((f'stretch_name_{sid}', f'{name}.'))
        jobs.append((f'stretch_script_{sid}', script))
    for key, text in FIXED_PHRASES.items():
        jobs.append((key, text))

    print(f'Generating {len(jobs)} clips...')
    for key, text in jobs:
        duration, size = make_clip(key, text)
        manifest[key] = {'file': f'audio/clips/{key}.m4a', 'duration': duration}
        total_size += size
        count += 1
        if count % 25 == 0:
            print(f'  {count}/{len(jobs)}...')

    manifest_path = os.path.join(ROOT, 'js', 'audioClips.js')
    with open(manifest_path, 'w') as f:
        f.write('/* Auto-generated by tools/gen_clips.py. Do not hand-edit. */\n\n')
        f.write('const AUDIO_CLIPS = ')
        f.write(json.dumps(manifest, indent=2))
        f.write(';\n')

    print(f'\nDone: {count} clips, {total_size / 1024 / 1024:.2f} MB total')
    print(f'Manifest written to {manifest_path}')


if __name__ == '__main__':
    main()
