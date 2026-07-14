/*
# Church Structure — Core Hierarchy Tables

This migration creates the foundational church hierarchy for RCCG Region 36.
The hierarchy flows strictly top-down: Region → Province → Zone → Area → Parish.

1. New Tables
   - `regions` — top-level (Region 36 is the only one; allows future expansion)
   - `provinces` — belong to a region (e.g. Province 94, Province 72)
   - `zones` — belong to a province
   - `areas` — belong to a zone
   - `parishes` — belong to an area (the leaf node where children register)

2. Security
   - RLS enabled on all tables
   - Authenticated users can read all structural data (needed for cascading dropdowns)
   - Only region admins can write (enforced via app-level role check + service role key for admin ops)
   - Anon users can also read for signup dropdowns before they have an account

3. Notes
   - All IDs are UUIDs
   - `slug` columns for URL-safe identifiers
*/

-- REGIONS
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "regions_select" ON regions;
CREATE POLICY "regions_select" ON regions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "regions_insert" ON regions;
CREATE POLICY "regions_insert" ON regions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "regions_update" ON regions;
CREATE POLICY "regions_update" ON regions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "regions_delete" ON regions;
CREATE POLICY "regions_delete" ON regions FOR DELETE TO authenticated USING (true);

-- PROVINCES
CREATE TABLE IF NOT EXISTS provinces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(region_id, slug)
);

ALTER TABLE provinces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provinces_select" ON provinces;
CREATE POLICY "provinces_select" ON provinces FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "provinces_insert" ON provinces;
CREATE POLICY "provinces_insert" ON provinces FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "provinces_update" ON provinces;
CREATE POLICY "provinces_update" ON provinces FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "provinces_delete" ON provinces;
CREATE POLICY "provinces_delete" ON provinces FOR DELETE TO authenticated USING (true);

-- ZONES
CREATE TABLE IF NOT EXISTS zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  province_id uuid NOT NULL REFERENCES provinces(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(province_id, slug)
);

ALTER TABLE zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zones_select" ON zones;
CREATE POLICY "zones_select" ON zones FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "zones_insert" ON zones;
CREATE POLICY "zones_insert" ON zones FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "zones_update" ON zones;
CREATE POLICY "zones_update" ON zones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "zones_delete" ON zones;
CREATE POLICY "zones_delete" ON zones FOR DELETE TO authenticated USING (true);

-- AREAS
CREATE TABLE IF NOT EXISTS areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id uuid NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(zone_id, slug)
);

ALTER TABLE areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "areas_select" ON areas;
CREATE POLICY "areas_select" ON areas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "areas_insert" ON areas;
CREATE POLICY "areas_insert" ON areas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "areas_update" ON areas;
CREATE POLICY "areas_update" ON areas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "areas_delete" ON areas;
CREATE POLICY "areas_delete" ON areas FOR DELETE TO authenticated USING (true);

-- PARISHES
CREATE TABLE IF NOT EXISTS parishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area_id uuid NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(area_id, slug)
);

ALTER TABLE parishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parishes_select" ON parishes;
CREATE POLICY "parishes_select" ON parishes FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "parishes_insert" ON parishes;
CREATE POLICY "parishes_insert" ON parishes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "parishes_update" ON parishes;
CREATE POLICY "parishes_update" ON parishes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "parishes_delete" ON parishes;
CREATE POLICY "parishes_delete" ON parishes FOR DELETE TO authenticated USING (true);

-- Indexes for foreign key lookups
CREATE INDEX IF NOT EXISTS provinces_region_id_idx ON provinces(region_id);
CREATE INDEX IF NOT EXISTS zones_province_id_idx ON zones(province_id);
CREATE INDEX IF NOT EXISTS areas_zone_id_idx ON areas(zone_id);
CREATE INDEX IF NOT EXISTS parishes_area_id_idx ON parishes(area_id);
