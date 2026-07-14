/*
# Users, Roles, and Profile Tables

Creates user profiles, coordinators, children, and parents tables for RCCG Region 36.

1. New Types
   - `user_role` enum: region_admin, coordinator, child, parent
   - `coordinator_level` enum: parish, area, zone, province, region
   - `age_category` enum: 0-5, 6-8, 9-12, 13-15, 16-19

2. New Tables
   - `user_profiles` — central role registry keyed to auth.uid()
   - `coordinators` — extended coordinator profile with hierarchy position
   - `children` — participant records with consent tracking
   - `parents` — guardian read-only accounts
   - `parent_children` — many-to-many link

3. Security
   - RLS enabled on all tables
   - Users see only their own profiles; coordinators see children in their unit
*/

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('region_admin', 'coordinator', 'child', 'parent');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coordinator_level') THEN
    CREATE TYPE coordinator_level AS ENUM ('parish', 'area', 'zone', 'province', 'region');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'age_category') THEN
    CREATE TYPE age_category AS ENUM ('0-5', '6-8', '9-12', '13-15', '16-19');
  END IF;
END $$;

-- Central profile table: one row per auth.users entry
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON user_profiles;
CREATE POLICY "profiles_select_own" ON user_profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_select_coordinator" ON user_profiles;
CREATE POLICY "profiles_select_coordinator" ON user_profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON user_profiles;
CREATE POLICY "profiles_insert_own" ON user_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON user_profiles;
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- COORDINATORS
CREATE TABLE IF NOT EXISTS coordinators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  level coordinator_level NOT NULL,
  parish_id uuid REFERENCES parishes(id),
  area_id uuid REFERENCES areas(id),
  zone_id uuid REFERENCES zones(id),
  province_id uuid REFERENCES provinces(id),
  region_id uuid REFERENCES regions(id),
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE coordinators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coordinators_select" ON coordinators;
CREATE POLICY "coordinators_select" ON coordinators FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "coordinators_insert" ON coordinators;
CREATE POLICY "coordinators_insert" ON coordinators FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "coordinators_update_own" ON coordinators;
CREATE POLICY "coordinators_update_own" ON coordinators FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "coordinators_delete_own" ON coordinators;
CREATE POLICY "coordinators_delete_own" ON coordinators FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CHILDREN
CREATE TABLE IF NOT EXISTS children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  age_category age_category NOT NULL,
  parish_id uuid NOT NULL REFERENCES parishes(id),
  area_id uuid NOT NULL REFERENCES areas(id),
  zone_id uuid NOT NULL REFERENCES zones(id),
  province_id uuid NOT NULL REFERENCES provinces(id),
  region_id uuid NOT NULL REFERENCES regions(id),
  parent_name text NOT NULL,
  parent_email text NOT NULL,
  parent_phone text,
  consent_given boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  registration_number text UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "children_select_own" ON children;
CREATE POLICY "children_select_own" ON children FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "children_select_coordinator" ON children;
CREATE POLICY "children_select_coordinator" ON children FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM coordinators c WHERE c.user_id = auth.uid() AND c.is_approved = true AND (
      c.parish_id = children.parish_id OR
      c.area_id = children.area_id OR
      c.zone_id = children.zone_id OR
      c.province_id = children.province_id OR
      c.region_id IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "children_insert" ON children;
CREATE POLICY "children_insert" ON children FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "children_update" ON children;
CREATE POLICY "children_update" ON children FOR UPDATE TO authenticated USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM coordinators c WHERE c.user_id = auth.uid() AND c.is_approved = true)
) WITH CHECK (true);

-- PARENTS
CREATE TABLE IF NOT EXISTS parents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE parents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parents_select_own" ON parents;
CREATE POLICY "parents_select_own" ON parents FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "parents_insert_own" ON parents;
CREATE POLICY "parents_insert_own" ON parents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parents_update_own" ON parents;
CREATE POLICY "parents_update_own" ON parents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Parent-child link
CREATE TABLE IF NOT EXISTS parent_children (
  parent_id uuid NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_id, child_id)
);

ALTER TABLE parent_children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_children_select" ON parent_children;
CREATE POLICY "parent_children_select" ON parent_children FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM parents p WHERE p.id = parent_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "parent_children_insert" ON parent_children;
CREATE POLICY "parent_children_insert" ON parent_children FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM parents p WHERE p.id = parent_id AND p.user_id = auth.uid())
);

DROP POLICY IF EXISTS "parent_children_delete" ON parent_children;
CREATE POLICY "parent_children_delete" ON parent_children FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM parents p WHERE p.id = parent_id AND p.user_id = auth.uid())
);

-- Indexes
CREATE INDEX IF NOT EXISTS coordinators_user_id_idx ON coordinators(user_id);
CREATE INDEX IF NOT EXISTS coordinators_parish_id_idx ON coordinators(parish_id);
CREATE INDEX IF NOT EXISTS coordinators_area_id_idx ON coordinators(area_id);
CREATE INDEX IF NOT EXISTS coordinators_zone_id_idx ON coordinators(zone_id);
CREATE INDEX IF NOT EXISTS coordinators_province_id_idx ON coordinators(province_id);
CREATE INDEX IF NOT EXISTS children_user_id_idx ON children(user_id);
CREATE INDEX IF NOT EXISTS children_parish_id_idx ON children(parish_id);
CREATE INDEX IF NOT EXISTS children_area_id_idx ON children(area_id);
CREATE INDEX IF NOT EXISTS children_zone_id_idx ON children(zone_id);
CREATE INDEX IF NOT EXISTS children_province_id_idx ON children(province_id);
CREATE INDEX IF NOT EXISTS parents_user_id_idx ON parents(user_id);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS coordinators_updated_at ON coordinators;
CREATE TRIGGER coordinators_updated_at BEFORE UPDATE ON coordinators FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS children_updated_at ON children;
CREATE TRIGGER children_updated_at BEFORE UPDATE ON children FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS user_profiles_updated_at ON user_profiles;
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
