-- Migration 0037: Phase 11 — Exercise Library & Exercise Details
-- Adds library metadata to exercises, creates favorite_exercises,
-- expands reference data, and seeds a comprehensive exercise catalog.

-- ============================================================
-- 1. EXTEND exercises TABLE
-- ============================================================

-- New columns for library metadata
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS short_description TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_type TEXT DEFAULT 'strength';
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS default_sets INT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS default_reps INT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS default_rest_seconds INT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS calories_estimate INT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS form_tips TEXT[];
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS safety_notes TEXT[];

-- Generated full-text search vector on exercise name + description
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

-- Backfill slugs for existing exercises
UPDATE exercises
SET slug = lower(replace(replace(trim(name), ' ', '-'), '.', ''))
WHERE slug IS NULL;

-- Now enforce NOT NULL + UNIQUE on slug
ALTER TABLE exercises ALTER COLUMN slug SET NOT NULL;
ALTER TABLE exercises ADD CONSTRAINT exercises_slug_unique UNIQUE (slug);

-- Add CHECK constraints for new enum-like columns
ALTER TABLE exercises ADD CONSTRAINT exercises_exercise_type_check
  CHECK (exercise_type IN ('strength','cardio','mobility','stretching','warm_up','cool_down','core','balance'));

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT 'beginner';
UPDATE exercises SET difficulty = 'beginner' WHERE difficulty IS NULL;
ALTER TABLE exercises ALTER COLUMN difficulty SET NOT NULL;
ALTER TABLE exercises ADD CONSTRAINT exercises_difficulty_check
  CHECK (difficulty IN ('beginner','intermediate','advanced'));

-- Ensure boolean defaults for new rows
ALTER TABLE exercises ALTER COLUMN is_active SET DEFAULT true;
ALTER TABLE exercises ALTER COLUMN is_featured SET DEFAULT false;

-- Indexes for library performance
CREATE INDEX IF NOT EXISTS idx_exercises_slug ON exercises (slug);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON exercises (difficulty);
CREATE INDEX IF NOT EXISTS idx_exercises_exercise_type ON exercises (exercise_type);
CREATE INDEX IF NOT EXISTS idx_exercises_is_featured ON exercises (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_exercises_search ON exercises USING GIN (search_vector);

-- ============================================================
-- 2. EXPAND REFERENCE DATA
-- ============================================================

-- Additional equipment
INSERT INTO equipment (name, slug, description) VALUES
  ('Barbell', 'barbell', 'Olympic or standard barbell'),
  ('Kettlebell', 'kettlebell', 'Cast iron kettlebell'),
  ('Pull-up Bar', 'pull_up_bar', 'Doorway or mounted pull-up bar'),
  ('Cable Machine', 'cable_machine', 'Cable pulley machine'),
  ('Medicine Ball', 'medicine_ball', 'Weighted medicine ball'),
  ('Ab Roller', 'ab_roller', 'Ab wheel roller'),
  ('Jump Rope', 'jump_rope', 'Skipping rope')
ON CONFLICT (slug) DO NOTHING;

-- Additional muscles
INSERT INTO muscles (name, slug) VALUES
  ('Upper Back', 'upper_back'),
  ('Lower Back', 'lower_back')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 3. CREATE favorite_exercises TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS favorite_exercises (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);

ALTER TABLE favorite_exercises ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own exercise favorites"
  ON favorite_exercises FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add own exercise favorites"
  ON favorite_exercises FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own exercise favorites"
  ON favorite_exercises FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorite_exercises_user ON favorite_exercises (user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_exercises_exercise ON favorite_exercises (exercise_id);

-- ============================================================
-- 4. SEED EXERCISES
-- ============================================================
-- Exercises are seeded with correct reference slugs.
-- ON CONFLICT (slug) DO NOTHING makes this safe to re-run.
-- is_featured is omitted from INSERTs (defaults false); set via UPDATE below.

-- ── CHEST ───────────────────────────────────────────────────

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Push-Up', 'push-up',
 'A classic upper-body bodyweight exercise targeting the chest, shoulders, and triceps.',
 'The push-up is one of the most effective bodyweight exercises for building upper-body strength. It primarily targets the chest (pectoralis major), shoulders (anterior deltoids), and triceps, while also engaging the core for stability.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 12, 45, NULL, 8,
 ARRAY['Keep your core tight throughout the movement', 'Maintain a neutral neck position', 'Lower your body under control', 'Do not let your hips sag or pike up'],
 ARRAY['Stop if you experience sharp shoulder pain', 'Keep wrists aligned under shoulders'],
 ARRAY['Start in a high plank position with hands slightly wider than shoulder-width apart.', 'Lower your body until your chest nearly touches the floor, keeping your elbows at a 45-degree angle.', 'Push through your palms to extend your arms and return to the starting position.', 'Keep your core tight and body in a straight line throughout the movement.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Incline Push-Up', 'incline-push-up',
 'An easier push-up variation with hands elevated on a surface.',
 'The incline push-up reduces the load by elevating your hands, making it ideal for beginners building upper-body strength. It targets the same muscles as a standard push-up at a lower intensity.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 10, 45, NULL, 6,
 ARRAY['Keep your body in a straight line', 'Place hands on a sturdy elevated surface', 'Control the lowering phase'],
 ARRAY['Ensure the surface is stable and will not slip'],
 ARRAY['Place your hands on an elevated surface like a bench or countertop.', 'Step your feet back until your body forms a straight line.', 'Lower your chest toward the surface by bending your elbows.', 'Push back up to the starting position.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Knee Push-Up', 'knee-push-up',
 'A beginner-friendly push-up performed from the knees.',
 'The knee push-up is an excellent entry point for building the pushing strength needed for full push-ups. It reduces the amount of body weight you need to lift while maintaining proper form.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 10, 45, NULL, 5,
 ARRAY['Keep your back flat', 'Do not hinge at the hips', 'Lower all the way down'],
 ARRAY['Use a mat for knee comfort'],
 ARRAY['Start on all fours, then walk your hands forward until your body forms a straight line from head to knees.', 'Lower your chest toward the floor by bending your elbows.', 'Push back up to the starting position.', 'Keep your core engaged throughout.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Diamond Push-Up', 'diamond-push-up',
 'A challenging push-up variation that emphasizes the triceps.',
 'The diamond push-up places your hands close together under your chest, significantly increasing tricep engagement. It is an advanced bodyweight exercise for arm and chest development.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 10, 45, NULL, 9,
 ARRAY['Keep elbows close to your body', 'Do not flare elbows outward', 'Maintain a straight body line'],
 ARRAY['Warm up wrists before attempting', 'Skip if you have wrist pain'],
 ARRAY['Place your hands together under your chest forming a diamond shape with your thumbs and index fingers.', 'Lower your body until your chest touches your hands.', 'Push back up to the starting position.', 'Keep your elbows tracking close to your body throughout.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Dumbbell Bench Press', 'dumbbell-bench-press',
 'A chest exercise using dumbbells on a flat bench.',
 'The dumbbell bench press allows each arm to work independently, correcting muscle imbalances while building chest strength. It targets the pectoralis major, anterior deltoids, and triceps.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 10, 60, NULL, 10,
 ARRAY['Keep feet flat on the floor', 'Do not arch your lower back excessively', 'Press dumbbells up in a slight arc'],
 ARRAY['Use a spotter for heavy weights', 'Start with lighter weights to master form'],
 ARRAY['Lie on a flat bench holding a dumbbell in each hand at chest level.', 'Press the dumbbells upward until your arms are fully extended.', 'Lower the dumbbells back to chest level with control.', 'Keep your shoulder blades pressed into the bench throughout.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Dumbbell Fly', 'dumbbell-fly',
 'An isolation exercise that stretches and contracts the chest muscles.',
 'The dumbbell fly isolates the pectoral muscles through a hugging motion, providing an excellent chest stretch and contraction. It is best performed with moderate weight and controlled form.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 12, 45, NULL, 8,
 ARRAY['Keep a slight bend in your elbows', 'Do not lower the dumbbells below shoulder level', 'Squeeze your chest at the top'],
 ARRAY['Avoid heavy weights — this is an isolation movement', 'Stop if you feel shoulder pain'],
 ARRAY['Lie on a flat bench holding dumbbells above your chest with palms facing each other.', 'Lower the dumbbells out to the sides in a wide arc, keeping a slight bend in your elbows.', 'Squeeze your chest to bring the dumbbells back together above your chest.', 'Focus on the stretch at the bottom and the squeeze at the top.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Chest Dip', 'chest-dip',
 'A bodyweight exercise using parallel bars to target the lower chest.',
 'Chest dips are a challenging bodyweight exercise that targets the lower chest and triceps. Leaning forward during the movement shifts emphasis to the pectoral muscles.',
 'strength', 'advanced', 'reps', true, false, true,
 3, 10, 60, NULL, 10,
 ARRAY['Lean your torso forward to target chest', 'Lower until upper arms are parallel to the floor', 'Keep shoulders down and back'],
 ARRAY['Warm up shoulders thoroughly', 'Skip if you have shoulder issues'],
 ARRAY['Grip parallel bars and lift yourself up with arms straight.', 'Lean your torso slightly forward.', 'Lower your body by bending your elbows until your upper arms are parallel to the floor.', 'Push back up to the starting position.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Wide Grip Push-Up', 'wide-grip-push-up',
 'A push-up variation with hands placed wider than shoulder-width.',
 'The wide grip push-up shifts emphasis to the outer chest and front deltoids. The wider hand placement increases the range of motion for the pectoral muscles.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 10, 45, NULL, 8,
 ARRAY['Place hands wider than shoulder width', 'Keep your body straight', 'Lower slowly for maximum engagement'],
 ARRAY['Ensure wrists can handle the wider angle', 'Reduce range of motion if needed'],
 ARRAY['Start in a plank position with hands placed wider than shoulder-width apart.', 'Lower your chest toward the floor by bending your elbows.', 'Push back up to the starting position.', 'Keep your core tight and hips level throughout.'])
ON CONFLICT (slug) DO NOTHING;

-- ── ARMS ────────────────────────────────────────────────────

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Dumbbell Bicep Curl', 'dumbbell-bicep-curl',
 'A classic arm exercise targeting the biceps with dumbbells.',
 'The dumbbell bicep curl is the foundational exercise for building arm strength and size. It isolates the biceps brachii through a controlled elbow flexion movement.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 12, 45, NULL, 6,
 ARRAY['Keep elbows pinned to your sides', 'Do not swing the weights', 'Control both the lifting and lowering phases'],
 ARRAY['Start with lighter weights to learn the form', 'Avoid locking out your elbows at the bottom'],
 ARRAY['Stand holding a dumbbell in each hand with arms fully extended and palms facing forward.', 'Curl the dumbbells up by bending at the elbows, keeping your upper arms stationary.', 'Squeeze your biceps at the top of the movement.', 'Lower the dumbbells back down with control.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Hammer Curl', 'hammer-curl',
 'A bicep exercise with palms facing inward throughout the movement.',
 'The hammer curl targets the brachialis and brachioradialis in addition to the biceps, creating well-rounded arm development. The neutral grip also places less stress on the wrists.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 12, 45, NULL, 6,
 ARRAY['Keep palms facing each other throughout', 'Do not swing or use momentum', 'Pause briefly at the top'],
 ARRAY['Keep a slight bend in your knees for stability'],
 ARRAY['Stand holding dumbbells at your sides with palms facing your body.', 'Curl the dumbbells up by bending at the elbows, keeping palms facing each other.', 'Squeeze at the top, then lower with control.', 'Keep your elbows stationary throughout the movement.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Tricep Dips', 'tricep-dips',
 'A bodyweight exercise using a bench or chair to target the triceps.',
 'Tricep dips are an effective bodyweight exercise for building tricep strength. By using a bench or chair, you can perform them anywhere without equipment.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 12, 45, NULL, 7,
 ARRAY['Keep your back close to the bench', 'Lower until elbows are at 90 degrees', 'Press through your palms, not your shoulders'],
 ARRAY['Avoid if you have shoulder issues', 'Keep hands close to your body'],
 ARRAY['Sit on the edge of a bench and place your hands beside your hips.', 'Slide your hips off the bench with legs extended.', 'Lower your body by bending your elbows to about 90 degrees.', 'Push back up by straightening your arms.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Overhead Tricep Extension', 'overhead-tricep-extension',
 'An exercise that isolates the triceps by extending the arms overhead.',
 'The overhead tricep extension targets the long head of the triceps, which is the largest portion of the muscle. It creates excellent arm development when combined with other tricep exercises.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 12, 45, NULL, 6,
 ARRAY['Keep elbows close to your head', 'Extend fully at the top', 'Do not arch your lower back'],
 ARRAY['Use a weight you can control', 'Keep your core braced'],
 ARRAY['Hold a dumbbell with both hands above your head, arms fully extended.', 'Lower the dumbbell behind your head by bending at the elbows.', 'Extend your arms back to the starting position.', 'Keep your upper arms stationary and close to your head throughout.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Tricep Kickback', 'tricep-kickback',
 'An isolation exercise targeting the triceps through elbow extension.',
 'The tricep kickback isolates the triceps through a controlled extension of the elbow. It is excellent for building the horseshoe shape of the triceps.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 12, 45, NULL, 6,
 ARRAY['Keep upper arm parallel to the floor', 'Extend fully and squeeze', 'Avoid swinging the weight'],
 ARRAY['Use light weight for best results', 'Maintain a flat back'],
 ARRAY['Hinge forward at the hips with a dumbbell in one hand, upper arm parallel to your torso.', 'Extend your forearm back until your arm is fully straight.', 'Squeeze your tricep at the top.', 'Lower the dumbbell back to 90 degrees with control.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Barbell Curl', 'barbell-curl',
 'A compound bicep exercise using a barbell for heavier loading.',
 'The barbell curl allows you to lift heavier loads than dumbbell curls, making it effective for building bicep mass and strength. It targets both heads of the biceps simultaneously.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 10, 60, NULL, 8,
 ARRAY['Keep elbows close to your body', 'Do not swing the bar', 'Use an appropriate grip width'],
 ARRAY['Warm up your elbows first', 'Start with a manageable weight'],
 ARRAY['Stand holding a barbell with an underhand grip at shoulder width.', 'Curl the bar up by bending at the elbows, keeping upper arms still.', 'Squeeze your biceps at the top of the movement.', 'Lower the bar back down with control.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Skull Crusher', 'skull-crusher',
 'A tricep exercise performed lying down with a barbell or dumbbells.',
 'The skull crusher (lying tricep extension) is one of the most effective exercises for building tricep mass. It primarily targets the long head of the triceps.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 10, 60, NULL, 8,
 ARRAY['Keep upper arms vertical throughout', 'Lower the bar to your forehead or just behind', 'Control the weight on the way down'],
 ARRAY['Use a spotter when learning', 'Do not flare elbows outward'],
 ARRAY['Lie on a bench holding a barbell with arms extended above your chest.', 'Lower the bar toward your forehead by bending only at the elbows.', 'Extend your arms back to the starting position.', 'Keep your upper arms perpendicular to the floor throughout.'])
ON CONFLICT (slug) DO NOTHING;

-- ── SHOULDERS ───────────────────────────────────────────────

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Lateral Raise', 'lateral-raise',
 'An isolation exercise that targets the medial deltoid for wider shoulders.',
 'The lateral raise is the primary exercise for building the medial head of the deltoid, creating the wide-shoulder look. It uses light weight with strict form for best results.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 15, 45, NULL, 5,
 ARRAY['Raise arms to shoulder height, no higher', 'Lead with your elbows, not your hands', 'Use a slight forward lean for better activation'],
 ARRAY['Use light weight — this is not a power movement', 'Avoid shrugging your shoulders'],
 ARRAY['Stand holding dumbbells at your sides with a slight bend in your elbows.', 'Raise the dumbbells out to the sides until your arms are parallel to the floor.', 'Lower the dumbbells back to your sides with control.', 'Imagine pouring water from a pitcher at the top of the movement.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Front Raise', 'front-raise',
 'An isolation exercise targeting the anterior deltoid.',
 'The front raise targets the front head of the shoulder, which is heavily used in pressing movements. It helps build balanced shoulder development and improves overhead strength.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 12, 45, NULL, 5,
 ARRAY['Raise to eye level, not higher', 'Keep a slight bend in your elbows', 'Avoid using momentum'],
 ARRAY['Use moderate weight for best results', 'Keep your core engaged'],
 ARRAY['Stand holding dumbbells in front of your thighs with palms facing your body.', 'Raise one or both dumbbells in front of you until arms are parallel to the floor.', 'Lower with control back to the starting position.', 'Keep your torso stationary throughout the movement.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Arnold Press', 'arnold-press',
 'A shoulder press variation that rotates the dumbbells during the movement.',
 'The Arnold Press combines a front raise with a shoulder press through a rotational movement, hitting all three heads of the deltoid in one exercise. It is excellent for building well-rounded shoulders.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 10, 60, NULL, 8,
 ARRAY['Rotate smoothly as you press up', 'Start with palms facing you', 'Press fully overhead'],
 ARRAY['Start with lighter weight to master the rotation', 'Keep your core braced'],
 ARRAY['Hold dumbbells at chest level with palms facing you.', 'As you press the dumbbells up, rotate your palms to face forward.', 'Continue pressing until arms are fully extended overhead.', 'Lower and reverse the rotation back to the starting position.'])
ON CONFLICT (slug) DO NOTHING;

-- ── ABS ─────────────────────────────────────────────────────

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Plank', 'plank',
 'An isometric core exercise that builds stability and endurance.',
 'The plank is the gold standard for core stability. It strengthens the entire core including the rectus abdominis, transverse abdominis, and obliques while also engaging the shoulders and back.',
 'core', 'beginner', 'duration', true, false, true,
 3, NULL, 45, 30, 5,
 ARRAY['Keep your body in a perfectly straight line', 'Do not let your hips sag or pike up', 'Breathe steadily throughout'],
 ARRAY['Stop if you feel lower back pain', 'Modify on knees if needed'],
 ARRAY['Start in a forearm plank position with elbows under your shoulders.', 'Engage your core and squeeze your glutes.', 'Hold the position, keeping your body in a straight line from head to heels.', 'Breathe steadily and maintain tension throughout.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Side Plank', 'side-plank',
 'A lateral core exercise that targets the obliques and hip stabilizers.',
 'The side plank specifically targets the obliques and quadratus lumborum, muscles that are often neglected in traditional core training. It also improves lateral stability and balance.',
 'core', 'intermediate', 'duration', true, false, true,
 3, NULL, 45, 20, 4,
 ARRAY['Keep hips lifted and body straight', 'Stack your feet or stagger them for balance', 'Do not let your top shoulder roll forward'],
 ARRAY['Modify on knee if needed', 'Keep neck neutral'],
 ARRAY['Lie on your side with your elbow directly under your shoulder.', 'Lift your hips off the floor until your body forms a straight line.', 'Hold the position, keeping your core engaged.', 'Lower your hips back down with control.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Bicycle Crunch', 'bicycle-crunch',
 'A dynamic core exercise that targets the abs and obliques simultaneously.',
 'The bicycle crunch is one of the most effective abdominal exercises, activating both the rectus abdominis and obliques through a rotational pedaling motion.',
 'core', 'intermediate', 'reps', true, false, true,
 3, 20, 45, NULL, 8,
 ARRAY['Extend each leg fully', 'Rotate through your torso, not just your elbows', 'Keep your lower back pressed into the floor'],
 ARRAY['Do not pull on your neck', 'Move slowly for maximum engagement'],
 ARRAY['Lie on your back with hands behind your head and knees bent.', 'Lift your shoulder blades off the floor.', 'Rotate your torso to bring your right elbow toward your left knee while extending your right leg.', 'Alternate sides in a pedaling motion.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Dead Bug', 'dead-bug',
 'A core stability exercise that teaches anti-extension control.',
 'The dead bug trains core stability by challenging you to resist arching your lower back while moving your limbs. It is excellent for building deep core strength and coordination.',
 'core', 'beginner', 'reps', true, false, true,
 3, 10, 45, NULL, 5,
 ARRAY['Press your lower back firmly into the floor', 'Move slowly and with control', 'Breathe out as you extend each limb'],
 ARRAY['Keep the movement small if you feel your back arching'],
 ARRAY['Lie on your back with arms extended toward the ceiling and knees bent at 90 degrees.', 'Press your lower back into the floor.', 'Slowly extend your right arm overhead and left leg toward the floor.', 'Return to start and repeat on the opposite side.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Mountain Climber', 'mountain-climber',
 'A dynamic core and cardio exercise that elevates the heart rate.',
 'Mountain climbers combine core strengthening with cardiovascular conditioning. They target the abdominals, hip flexors, and shoulders while providing an excellent calorie burn.',
 'cardio', 'intermediate', 'both', false, true, true,
 3, NULL, 45, 30, 12,
 ARRAY['Keep your hips level with your shoulders', 'Drive knees toward your chest', 'Maintain a strong plank position throughout'],
 ARRAY['Start slowly and build speed gradually', 'Skip if you have knee issues'],
 ARRAY['Start in a high plank position with your body in a straight line.', 'Drive your right knee toward your chest.', 'Quickly switch legs, driving your left knee forward.', 'Continue alternating legs at a pace you can control.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Russian Twist', 'russian-twist',
 'A rotational core exercise targeting the obliques.',
 'The Russian twist strengthens the obliques and transverse abdominis through a rotational movement. Adding weight increases the challenge and builds rotational power.',
 'core', 'intermediate', 'reps', true, false, true,
 3, 20, 45, NULL, 7,
 ARRAY['Rotate from your torso, not just your arms', 'Keep your chest lifted', 'Feet can be on the floor or elevated for more challenge'],
 ARRAY['Keep your lower back straight', 'Use a light weight or no weight initially'],
 ARRAY['Sit with knees bent and lean back slightly, keeping your back straight.', 'Hold your hands together or hold a weight at chest level.', 'Rotate your torso to the right, then to the left.', 'That counts as one repetition.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Leg Raise', 'leg-raise',
 'A lower-abdominal exercise performed lying on the floor.',
 'The leg raise targets the lower portion of the rectus abdominis and the hip flexors. It is effective for building core strength and definition in the lower abdominal region.',
 'core', 'intermediate', 'reps', true, false, true,
 3, 12, 45, NULL, 6,
 ARRAY['Press your lower back into the floor', 'Lower legs slowly for maximum engagement', 'Keep legs as straight as possible'],
 ARRAY['Bend your knees slightly if you have lower back discomfort', 'Place hands under your hips for support'],
 ARRAY['Lie on your back with legs straight and arms at your sides.', 'Press your lower back into the floor.', 'Raise your legs until they are perpendicular to the floor.', 'Lower your legs slowly back down without letting your back arch.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Flutter Kick', 'flutter-kick',
 'A core endurance exercise targeting the lower abs and hip flexors.',
 'Flutter kicks maintain constant tension on the lower abdominals through rapid alternating leg movements. They build core endurance and hip flexor strength.',
 'core', 'beginner', 'duration', true, false, true,
 3, NULL, 45, 30, 6,
 ARRAY['Keep your lower back pressed into the floor', 'Make small, controlled kicks', 'Breathe steadily throughout'],
 ARRAY['Place hands under your hips for lower back support if needed'],
 ARRAY['Lie on your back with legs extended and hands at your sides.', 'Press your lower back into the floor.', 'Lift both legs slightly off the ground.', 'Alternate kicking your legs up and down in small, quick motions.'])
ON CONFLICT (slug) DO NOTHING;

-- ── BUTT & LEGS ─────────────────────────────────────────────

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Bodyweight Squat', 'bodyweight-squat',
 'A fundamental lower-body exercise targeting the quads, glutes, and hamstrings.',
 'The bodyweight squat is the foundation of lower-body training. It builds leg strength, improves mobility, and activates the entire posterior chain without any equipment.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 15, 45, NULL, 10,
 ARRAY['Keep your chest up and core braced', 'Push your knees out over your toes', 'Descend until thighs are at least parallel to the floor'],
 ARRAY['Do not let your knees cave inward', 'Keep weight in your heels and mid-foot'],
 ARRAY['Stand with feet shoulder-width apart and toes slightly turned out.', 'Lower your body by pushing your hips back and bending your knees.', 'Descend until your thighs are at least parallel to the floor.', 'Push through your heels to stand back up to the starting position.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Lunges', 'lunges',
 'A unilateral leg exercise that builds strength and balance.',
 'Lunges develop single-leg strength, balance, and coordination. They target the quadriceps, glutes, and hamstrings while correcting muscle imbalances between legs.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 12, 45, NULL, 8,
 ARRAY['Keep your front knee tracking over your ankle', 'Lower until both knees are at 90 degrees', 'Keep your torso upright throughout'],
 ARRAY['Start with bodyweight before adding weight', 'Step far enough forward to protect your knees'],
 ARRAY['Stand with feet together and take a large step forward with your right foot.', 'Lower your body until both knees are bent at 90 degrees.', 'Push through your right heel to return to the starting position.', 'Repeat on the left side.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Glute Bridge', 'glute-bridge',
 'A floor-based exercise that activates and strengthens the glutes.',
 'The glute bridge is one of the best exercises for activating dormant glute muscles. It strengthens the glutes and hamstrings while also improving hip mobility.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 15, 45, NULL, 6,
 ARRAY['Squeeze your glutes hard at the top', 'Drive through your heels', 'Do not hyperextend your lower back'],
 ARRAY['Keep the movement controlled', 'Pause at the top for maximum activation'],
 ARRAY['Lie on your back with knees bent and feet flat on the floor, hip-width apart.', 'Press through your heels and squeeze your glutes to lift your hips.', 'Raise until your body forms a straight line from knees to shoulders.', 'Hold briefly at the top, then lower with control.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Calf Raise', 'calf-raise',
 'An isolation exercise that targets the calf muscles.',
 'Calf raises strengthen the gastrocnemius and soleus muscles of the lower leg. They are essential for improving ankle stability and calf definition.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 15, 30, NULL, 5,
 ARRAY['Rise onto the balls of your feet fully', 'Hold the top position briefly', 'Lower slowly for a full stretch'],
 ARRAY['Use a wall or railing for balance if needed'],
 ARRAY['Stand on a flat surface or the edge of a step with feet hip-width apart.', 'Rise up onto the balls of your feet as high as possible.', 'Hold the top position for a second.', 'Lower your heels back down with control.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Wall Sit', 'wall-sit',
 'An isometric lower-body exercise that builds muscular endurance.',
 'The wall sit is a challenging isometric exercise that targets the quadriceps, glutes, and calves. It builds muscular endurance and mental toughness through sustained contraction.',
 'strength', 'beginner', 'duration', true, false, true,
 3, NULL, 45, 30, 7,
 ARRAY['Keep your back flat against the wall', 'Thighs should be parallel to the floor', 'Breathe steadily throughout'],
 ARRAY['Do not lock your knees', 'Come out of the position if your legs shake uncontrollably'],
 ARRAY['Stand with your back against a wall.', 'Slide down until your thighs are parallel to the floor.', 'Hold the position with your knees at 90 degrees.', 'Push through your heels to stand back up.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Romanian Deadlift', 'romanian-deadlift',
 'A hip-hinge exercise that targets the hamstrings and glutes.',
 'The Romanian deadlift is one of the most effective exercises for building hamstring and glute strength. It teaches the hip-hinge pattern while loading the posterior chain.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 10, 60, NULL, 10,
 ARRAY['Push your hips back, do not round your back', 'Keep the weights close to your legs', 'Feel the stretch in your hamstrings at the bottom'],
 ARRAY['Start with lighter weight to master the hip hinge', 'Keep a slight bend in your knees'],
 ARRAY['Stand holding dumbbells in front of your thighs with feet hip-width apart.', 'Push your hips back while keeping your back straight.', 'Lower the dumbbells along your legs until you feel a stretch in your hamstrings.', 'Drive your hips forward to return to the starting position.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Bulgarian Split Squat', 'bulgarian-split-squat',
 'A challenging single-leg squat with the rear foot elevated.',
 'The Bulgarian split squat is an advanced single-leg exercise that builds quad and glute strength while improving balance and correcting muscle imbalances.',
 'strength', 'advanced', 'reps', true, false, true,
 3, 10, 60, NULL, 10,
 ARRAY['Keep your front knee tracking over your ankle', 'Lower until your back knee nearly touches the floor', 'Keep your torso upright'],
 ARRAY['Start with bodyweight only', 'Use a bench at the right height for your flexibility'],
 ARRAY['Stand about two feet in front of a bench with your back to it.', 'Place the top of your rear foot on the bench.', 'Lower your body until your front thigh is parallel to the floor.', 'Push through your front heel to stand back up.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Hip Thrust', 'hip-thrust',
 'A glute-focused exercise performed with upper back on a bench.',
 'The hip thrust is the most effective exercise for building glute strength and size. It directly loads the glutes through full hip extension against gravity.',
 'strength', 'intermediate', 'reps', true, false, true,
 3, 12, 45, NULL, 9,
 ARRAY['Squeeze your glutes hard at the top', 'Drive through your heels', 'Do not hyperextend your lower back'],
 ARRAY['Start without weight to learn the movement', 'Keep your chin slightly tucked'],
 ARRAY['Sit on the floor with your upper back against a bench and knees bent.', 'Roll a barbell over your hips or use bodyweight.', 'Drive your hips up by squeezing your glutes.', 'Hold at the top for a second, then lower with control.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Sumo Squat', 'sumo-squat',
 'A wide-stance squat that emphasizes the inner thighs and glutes.',
 'The sumo squat uses a wide stance to shift emphasis to the inner thighs (adductors) and glutes. It is a great variation for targeting muscles that standard squats may underwork.',
 'strength', 'beginner', 'reps', true, false, true,
 3, 15, 45, NULL, 9,
 ARRAY['Point toes outward at 45 degrees', 'Push knees out over your toes', 'Keep your chest lifted'],
 ARRAY['Keep your back straight throughout', 'Start with bodyweight before adding weight'],
 ARRAY['Stand with feet wider than shoulder-width apart and toes pointed outward.', 'Lower your body by pushing your hips back and bending your knees.', 'Descend until your thighs are parallel to the floor.', 'Push through your heels to return to the starting position.'])
ON CONFLICT (slug) DO NOTHING;

-- ── FULL BODY ───────────────────────────────────────────────

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Burpee', 'burpee',
 'A full-body exercise combining a squat, plank, and jump.',
 'The burpee is a high-intensity full-body exercise that builds cardiovascular endurance, strength, and explosive power. It engages virtually every muscle in the body.',
 'cardio', 'advanced', 'both', false, true, true,
 3, 10, 60, NULL, 14,
 ARRAY['Land softly on each jump', 'Keep your back straight during the plank', 'Move at a pace you can sustain'],
 ARRAY['Start with a modified version if needed', 'Skip the jump if you have joint issues'],
 ARRAY['Stand with feet shoulder-width apart.', 'Drop into a squat and place your hands on the floor.', 'Jump your feet back into a plank position.', 'Perform a push-up, then jump your feet forward and explode upward.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Jumping Jack', 'jumping-jack',
 'A classic full-body cardio exercise that elevates the heart rate.',
 'Jumping jacks are a simple yet effective full-body exercise that improves cardiovascular fitness, coordination, and endurance. They are perfect as a warm-up or standalone cardio exercise.',
 'cardio', 'beginner', 'duration', false, true, true,
 3, NULL, 45, 45, 10,
 ARRAY['Land softly on the balls of your feet', 'Keep a slight bend in your knees', 'Coordinate arm and leg movements smoothly'],
 ARRAY['Use low-impact stepping if jumping is uncomfortable'],
 ARRAY['Stand with feet together and arms at your sides.', 'Jump your feet apart while raising your arms overhead.', 'Jump your feet back together while lowering your arms.', 'Repeat at a steady pace.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('High Knees', 'high-knees',
 'A dynamic cardio exercise that drives the knees up quickly.',
 'High knees are a high-intensity cardio drill that strengthens the hip flexors, improves coordination, and burns calories rapidly. They simulate a running motion with exaggerated knee drive.',
 'cardio', 'intermediate', 'duration', false, true, true,
 3, NULL, 45, 30, 12,
 ARRAY['Drive knees to hip height', 'Pump your arms in sync', 'Land softly on the balls of your feet'],
 ARRAY['Reduce intensity if needed', 'Skip if you have knee issues'],
 ARRAY['Stand with feet hip-width apart.', 'Drive your right knee up toward your chest.', 'Quickly switch and drive your left knee up.', 'Continue alternating at a rapid pace.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Bear Crawl', 'bear-crawl',
 'A full-body movement that builds coordination and core stability.',
 'The bear crawl is a functional movement that builds full-body strength, coordination, and core stability. It challenges your shoulders, core, and legs simultaneously.',
 'strength', 'intermediate', 'duration', true, false, true,
 3, NULL, 45, 30, 10,
 ARRAY['Keep your knees close to the floor', 'Move opposite hand and foot together', 'Keep your back flat like a table'],
 ARRAY['Start with small movements', 'Keep your core braced throughout'],
 ARRAY['Start on all fours with knees hovering just above the floor.', 'Step your right hand and left foot forward simultaneously.', 'Step your left hand and right foot forward.', 'Continue crawling forward, keeping your back flat and knees low.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Inchworm', 'inchworm',
 'A dynamic stretching and strength exercise that moves from standing to plank.',
 'The inchworm is a dynamic exercise that stretches the hamstrings while building shoulder and core strength. It serves as an excellent warm-up or active recovery movement.',
 'warm_up', 'beginner', 'reps', true, false, true,
 3, 8, 45, NULL, 5,
 ARRAY['Keep your legs as straight as possible', 'Walk your hands out slowly', 'Hold the plank briefly at full extension'],
 ARRAY['Go slowly if you have tight hamstrings', 'Modify by bending knees slightly'],
 ARRAY['Stand with feet hip-width apart.', 'Bend forward and place your hands on the floor.', 'Walk your hands forward until you reach a high plank position.', 'Walk your hands back toward your feet and stand up.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Jump Rope', 'jump-rope',
 'A high-intensity cardio exercise that builds coordination and endurance.',
 'Jumping rope is one of the most efficient calorie-burning exercises. It improves coordination, cardiovascular fitness, and calf endurance while being compact enough to do anywhere.',
 'cardio', 'beginner', 'duration', false, true, true,
 3, NULL, 60, 60, 16,
 ARRAY['Keep jumps small and efficient', 'Rotate the rope with your wrists, not your arms', 'Land softly on the balls of your feet'],
 ARRAY['Use a rope of appropriate length', 'Start with shorter intervals if new to jumping rope'],
 ARRAY['Hold the rope handles at hip height with elbows close to your body.', 'Swing the rope over your head and jump as it approaches your feet.', 'Land softly and immediately prepare for the next jump.', 'Maintain a steady rhythm and pace.'])
ON CONFLICT (slug) DO NOTHING;

-- ── STRETCHING ──────────────────────────────────────────────

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Hip Flexor Stretch', 'hip-flexor-stretch',
 'A standing stretch that targets the hip flexors and quads.',
 'Tight hip flexors are common from prolonged sitting. This stretch opens the front of the hip, improving posture and reducing lower back strain.',
 'stretching', 'beginner', 'duration', true, false, true,
 2, NULL, 30, 30, 2,
 ARRAY['Keep your torso upright', 'Squeeze the glute of the back leg', 'Do not arch your lower back'],
 ARRAY['Move gently into the stretch', 'Never bounce'],
 ARRAY['Stand in a lunge position with your right foot forward.', 'Lower your left knee toward the floor.', 'Tuck your pelvis and push your hips forward.', 'Hold for 30 seconds, then switch sides.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Hamstring Stretch', 'hamstring-stretch',
 'A seated or standing stretch targeting the back of the thighs.',
 'Tight hamstrings contribute to lower back pain and poor posture. This stretch improves flexibility in the posterior chain and reduces injury risk.',
 'stretching', 'beginner', 'duration', true, false, true,
 2, NULL, 30, 30, 2,
 ARRAY['Keep your back straight, do not round forward', 'Feel the stretch in the back of your thigh', 'Breathe deeply and relax into the stretch'],
 ARRAY['Never bounce or force the stretch', 'Stop at mild tension, not pain'],
 ARRAY['Sit on the floor with one leg extended and the other bent.', 'Reach toward your toes on the extended leg.', 'Keep your back straight and hinge at the hips.', 'Hold for 30 seconds, then switch legs.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Chest Stretch', 'chest-stretch',
 'A doorway or standing stretch that opens the chest and shoulders.',
 'The chest stretch counteracts the hunched posture from desk work and phone use. It opens the chest, improves shoulder mobility, and reduces upper back tension.',
 'stretching', 'beginner', 'duration', true, false, true,
 2, NULL, 30, 30, 2,
 ARRAY['Keep your elbow at shoulder height', 'Lean gently forward into the stretch', 'Breathe deeply and relax'],
 ARRAY['Do not overstretch — stop at mild tension', 'Keep the movement gentle'],
 ARRAY['Stand in a doorway with your arms at 90 degrees on the frame.', 'Step forward gently until you feel a stretch across your chest.', 'Hold the position while breathing deeply.', 'Release slowly and repeat.'])
ON CONFLICT (slug) DO NOTHING;

INSERT INTO exercises (name, slug, short_description, description, exercise_type, difficulty, exercise_mode, is_low_impact, requires_jumping, is_active, default_sets, default_reps, default_rest_seconds, duration_seconds, calories_estimate, form_tips, safety_notes, instructions) VALUES
('Cat-Cow Stretch', 'cat-cow-stretch',
 'A gentle spinal mobility exercise alternating between arching and rounding the back.',
 'The cat-cow stretch improves spinal flexibility and relieves tension in the back and neck. It is an excellent warm-up or cool-down movement for any workout.',
 'mobility', 'beginner', 'duration', true, false, true,
 2, NULL, 30, 30, 2,
 ARRAY['Move slowly and smoothly between positions', 'Breathe in during cow, out during cat', 'Articulate through each vertebra'],
 ARRAY['Keep the movement gentle if you have back issues'],
 ARRAY['Start on all fours with wrists under shoulders and knees under hips.', 'Inhale and arch your back, lifting your head and tailbone (cow).', 'Exhale and round your spine, tucking your chin and tailbone (cat).', 'Flow smoothly between the two positions.'])
ON CONFLICT (slug) DO NOTHING;

-- ── MARK FEATURED EXERCISES ─────────────────────────────────

UPDATE exercises SET is_featured = true WHERE slug IN (
  'push-up',
  'lateral-raise',
  'plank',
  'bodyweight-squat',
  'lunges',
  'glute-bridge',
  'burpee',
  'hip-flexor-stretch'
);
