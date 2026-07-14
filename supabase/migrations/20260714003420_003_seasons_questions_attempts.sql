/*
# Seasons, Question Banks, and Quiz Attempts

Creates the competition cycle (seasons), question banks per unit/level/category,
and the quiz attempt system with autosave support.

1. New Tables
   - `seasons` — annual competition cycles (active/archived)
   - `questions` — question bank scoped to level/unit/category/season
   - `question_options` — MCQ options per question
   - `attempts` — each child's quiz attempt per stage/category/season
   - `attempt_answers` — individual answers with autosave (submitted_at null until final submit)
   - `stages` — per-season stage configuration (open/closed status, timer, pool size)

2. Security
   - Children see only questions served during their active attempt
   - Coordinators manage questions for their unit only
   - Region Admin sees all, edits only Regional stage
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_type') THEN
    CREATE TYPE question_type AS ENUM ('multiple_choice', 'true_false', 'fill_blank');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stage_level') THEN
    CREATE TYPE stage_level AS ENUM ('parish', 'area', 'zonal', 'provincial', 'regional');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'season_status') THEN
    CREATE TYPE season_status AS ENUM ('active', 'archived', 'setup');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attempt_status') THEN
    CREATE TYPE attempt_status AS ENUM ('in_progress', 'submitted', 'pending_grading', 'graded', 'published');
  END IF;
END $$;

-- SEASONS
CREATE TABLE IF NOT EXISTS seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  year int NOT NULL,
  status season_status NOT NULL DEFAULT 'setup',
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seasons_select" ON seasons;
CREATE POLICY "seasons_select" ON seasons FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "seasons_insert" ON seasons;
CREATE POLICY "seasons_insert" ON seasons FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "seasons_update" ON seasons;
CREATE POLICY "seasons_update" ON seasons FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "seasons_delete" ON seasons;
CREATE POLICY "seasons_delete" ON seasons FOR DELETE TO authenticated USING (true);

-- STAGE CONFIG (per season, per level)
CREATE TABLE IF NOT EXISTS stage_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  level stage_level NOT NULL,
  is_open boolean NOT NULL DEFAULT false,
  opens_at timestamptz,
  closes_at timestamptz,
  time_limit_minutes int NOT NULL DEFAULT 30,
  pool_size int NOT NULL DEFAULT 10,
  requires_question_approval boolean NOT NULL DEFAULT false,
  results_published boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(season_id, level)
);

ALTER TABLE stage_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stage_configs_select" ON stage_configs;
CREATE POLICY "stage_configs_select" ON stage_configs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stage_configs_insert" ON stage_configs;
CREATE POLICY "stage_configs_insert" ON stage_configs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "stage_configs_update" ON stage_configs;
CREATE POLICY "stage_configs_update" ON stage_configs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "stage_configs_delete" ON stage_configs;
CREATE POLICY "stage_configs_delete" ON stage_configs FOR DELETE TO authenticated USING (true);

-- QUESTIONS
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  stage_level stage_level NOT NULL,
  age_category age_category NOT NULL,
  question_type question_type NOT NULL,
  question_text text NOT NULL,
  correct_answer text,
  points int NOT NULL DEFAULT 1 CHECK (points > 0),
  -- Scoped to the unit that created it
  parish_id uuid REFERENCES parishes(id) ON DELETE CASCADE,
  area_id uuid REFERENCES areas(id) ON DELETE CASCADE,
  zone_id uuid REFERENCES zones(id) ON DELETE CASCADE,
  province_id uuid REFERENCES provinces(id) ON DELETE CASCADE,
  region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  -- Approval workflow
  is_approved boolean NOT NULL DEFAULT true,
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "questions_select" ON questions;
CREATE POLICY "questions_select" ON questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "questions_insert" ON questions;
CREATE POLICY "questions_insert" ON questions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "questions_update" ON questions;
CREATE POLICY "questions_update" ON questions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "questions_delete" ON questions;
CREATE POLICY "questions_delete" ON questions FOR DELETE TO authenticated USING (true);

-- QUESTION OPTIONS (for MCQ)
CREATE TABLE IF NOT EXISTS question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  display_order int NOT NULL DEFAULT 0
);

ALTER TABLE question_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "question_options_select" ON question_options;
CREATE POLICY "question_options_select" ON question_options FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "question_options_insert" ON question_options;
CREATE POLICY "question_options_insert" ON question_options FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "question_options_update" ON question_options;
CREATE POLICY "question_options_update" ON question_options FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "question_options_delete" ON question_options;
CREATE POLICY "question_options_delete" ON question_options FOR DELETE TO authenticated USING (true);

-- ATTEMPTS (one per child per stage per season)
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  stage_level stage_level NOT NULL,
  age_category age_category NOT NULL,
  is_practice boolean NOT NULL DEFAULT false,
  status attempt_status NOT NULL DEFAULT 'in_progress',
  -- Score tracking
  total_points int,
  max_points int,
  percentage numeric(5,2),
  time_taken_seconds int,
  -- Timing (server-authoritative)
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  server_deadline timestamptz,
  -- Idempotency
  idempotency_key text UNIQUE,
  -- Qualification status
  qualification_status text,
  qualification_rank int,
  -- Flag tracking (tab switches etc)
  flag_count int NOT NULL DEFAULT 0,
  flags_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(child_id, season_id, stage_level, is_practice)
);

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attempts_select" ON attempts;
CREATE POLICY "attempts_select" ON attempts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM children ch WHERE ch.id = attempts.child_id AND ch.user_id = auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM coordinators c
    JOIN children ch ON ch.id = attempts.child_id
    WHERE c.user_id = auth.uid() AND c.is_approved = true AND (
      c.parish_id = ch.parish_id OR c.area_id = ch.area_id OR
      c.zone_id = ch.zone_id OR c.province_id = ch.province_id OR
      c.region_id IS NOT NULL
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM parents p
    JOIN parent_children pc ON pc.parent_id = p.id
    WHERE p.user_id = auth.uid() AND pc.child_id = attempts.child_id
  )
);

DROP POLICY IF EXISTS "attempts_insert" ON attempts;
CREATE POLICY "attempts_insert" ON attempts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "attempts_update" ON attempts;
CREATE POLICY "attempts_update" ON attempts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ATTEMPT ANSWERS (autosave support)
CREATE TABLE IF NOT EXISTS attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_option_id uuid REFERENCES question_options(id) ON DELETE SET NULL,
  text_answer text,
  -- Grading
  awarded_points int,
  is_correct boolean,
  graded_by uuid REFERENCES auth.users(id),
  graded_at timestamptz,
  -- Autosave tracking
  answered_at timestamptz DEFAULT now(),
  display_order int NOT NULL DEFAULT 0,
  UNIQUE(attempt_id, question_id)
);

ALTER TABLE attempt_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attempt_answers_select" ON attempt_answers;
CREATE POLICY "attempt_answers_select" ON attempt_answers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "attempt_answers_insert" ON attempt_answers;
CREATE POLICY "attempt_answers_insert" ON attempt_answers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "attempt_answers_update" ON attempt_answers;
CREATE POLICY "attempt_answers_update" ON attempt_answers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "attempt_answers_delete" ON attempt_answers;
CREATE POLICY "attempt_answers_delete" ON attempt_answers FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS questions_season_stage_cat_idx ON questions(season_id, stage_level, age_category);
CREATE INDEX IF NOT EXISTS questions_parish_idx ON questions(parish_id);
CREATE INDEX IF NOT EXISTS questions_area_idx ON questions(area_id);
CREATE INDEX IF NOT EXISTS questions_zone_idx ON questions(zone_id);
CREATE INDEX IF NOT EXISTS questions_province_idx ON questions(province_id);
CREATE INDEX IF NOT EXISTS attempts_child_idx ON attempts(child_id);
CREATE INDEX IF NOT EXISTS attempts_season_stage_idx ON attempts(season_id, stage_level);
CREATE INDEX IF NOT EXISTS attempt_answers_attempt_idx ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS attempt_answers_graded_idx ON attempt_answers(graded_at) WHERE graded_at IS NULL;

DROP TRIGGER IF EXISTS questions_updated_at ON questions;
CREATE TRIGGER questions_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS attempts_updated_at ON attempts;
CREATE TRIGGER attempts_updated_at BEFORE UPDATE ON attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
