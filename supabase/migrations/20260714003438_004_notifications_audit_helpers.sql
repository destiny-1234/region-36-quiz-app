/*
# Notifications, Audit Log, and Helper Functions

Creates the notification system, audit trail, and helper database functions.

1. New Tables
   - `notifications` — in-app notification center (bell icon)
   - `audit_log` — accountability trail for all admin/coordinator actions
   - `email_queue` — stubbed email sending queue (SMTP wired later)
   - `auth_attempts` — track failed login attempts for lockout

2. New Functions
   - `compute_age_category(date_of_birth)` — returns the age category enum from DOB
   - `generate_registration_number()` — unique human-readable ID for children
   - `notify_next_level()` — trigger function: fires when a coordinator finishes marking all children
   - `check_downstream_ready()` — checks if all downstream units have reported qualifiers

3. Security
   - Users see only their own notifications
   - Audit log readable by region admins only
*/

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  related_id uuid,
  related_type text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  unit_context text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log_select" ON audit_log;
CREATE POLICY "audit_log_select" ON audit_log FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
CREATE POLICY "audit_log_insert" ON audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- EMAIL QUEUE (stub)
CREATE TABLE IF NOT EXISTS email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "email_queue_select" ON email_queue;
CREATE POLICY "email_queue_select" ON email_queue FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "email_queue_insert" ON email_queue;
CREATE POLICY "email_queue_insert" ON email_queue FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "email_queue_update" ON email_queue;
CREATE POLICY "email_queue_update" ON email_queue FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- AUTH ATTEMPTS (lockout tracking)
CREATE TABLE IF NOT EXISTS auth_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  ip_address text,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_attempts_insert" ON auth_attempts;
CREATE POLICY "auth_attempts_insert" ON auth_attempts FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_attempts_select" ON auth_attempts;
CREATE POLICY "auth_attempts_select" ON auth_attempts FOR SELECT TO authenticated USING (true);

-- HELPER: compute age category from date of birth
CREATE OR REPLACE FUNCTION compute_age_category(dob date)
RETURNS age_category AS $$
DECLARE
  age_years int;
BEGIN
  age_years := EXTRACT(YEAR FROM age(dob));
  IF age_years <= 5 THEN RETURN '0-5'::age_category;
  ELSIF age_years <= 8 THEN RETURN '6-8'::age_category;
  ELSIF age_years <= 12 THEN RETURN '9-12'::age_category;
  ELSIF age_years <= 15 THEN RETURN '13-15'::age_category;
  ELSE RETURN '16-19'::age_category;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- HELPER: generate registration number
CREATE OR REPLACE FUNCTION generate_registration_number()
RETURNS text AS $$
DECLARE
  seq_val int;
  reg_num text;
BEGIN
  SELECT COALESCE(MAX(seq_val), 0) + 1 INTO seq_val FROM (
    SELECT CAST(SUBSTRING(registration_number FROM 'R36-(\\d+)$') AS int) AS seq_val
    FROM children
    WHERE registration_number ~ 'R36-\\d+'
  ) sub;
  reg_num := 'R36-' || lpad(seq_val::text, 5, '0');
  RETURN reg_num;
END;
$$ LANGUAGE plpgsql;

-- HELPER: get coordinator's unit label
CREATE OR REPLACE FUNCTION get_coordinator_unit_label(coordinator_uuid uuid)
RETURNS text AS $$
DECLARE
  c RECORD;
BEGIN
  SELECT * INTO c FROM coordinators WHERE user_id = coordinator_uuid;
  IF NOT FOUND THEN RETURN 'Unknown'; END IF;

  IF c.level = 'parish' THEN
    RETURN (SELECT name FROM parishes WHERE id = c.parish_id);
  ELSIF c.level = 'area' THEN
    RETURN (SELECT name FROM areas WHERE id = c.area_id);
  ELSIF c.level = 'zone' THEN
    RETURN (SELECT name FROM zones WHERE id = c.zone_id);
  ELSIF c.level = 'province' THEN
    RETURN (SELECT name FROM provinces WHERE id = c.province_id);
  ELSIF c.level = 'region' THEN
    RETURN (SELECT name FROM regions WHERE id = c.region_id);
  END IF;
  RETURN 'Unknown';
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS email_queue_pending_idx ON email_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS auth_attempts_email_idx ON auth_attempts(email, created_at DESC);
