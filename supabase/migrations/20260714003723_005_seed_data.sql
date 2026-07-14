/*
# Seed Data — Region 36 Structure, Season, and Sample Questions
*/

DELETE FROM questions WHERE region_id IS NOT NULL OR parish_id IS NOT NULL;
DELETE FROM stage_configs WHERE season_id IN (SELECT id FROM seasons WHERE name = 'RCCG Region 36 Quiz 2025');
DELETE FROM seasons WHERE name = 'RCCG Region 36 Quiz 2025';
DELETE FROM parishes WHERE area_id IN (
  SELECT a.id FROM areas a JOIN zones z ON a.zone_id = z.id
  JOIN provinces p ON z.province_id = p.id
  WHERE p.slug IN ('province-94', 'province-72')
);
DELETE FROM areas WHERE zone_id IN (
  SELECT z.id FROM zones z JOIN provinces p ON z.province_id = p.id
  WHERE p.slug IN ('province-94', 'province-72')
);
DELETE FROM zones WHERE province_id IN (
  SELECT id FROM provinces WHERE slug IN ('province-94', 'province-72')
);
DELETE FROM provinces WHERE slug IN ('province-94', 'province-72');
DELETE FROM regions WHERE slug = 'region-36';

INSERT INTO regions (id, name, slug)
VALUES ('a0000000-0000-0000-0000-000000000036', 'RCCG Region 36', 'region-36')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO provinces (region_id, name, slug) VALUES
('a0000000-0000-0000-0000-000000000036', 'Province 94', 'province-94'),
('a0000000-0000-0000-0000-000000000036', 'Province 72', 'province-72')
ON CONFLICT (region_id, slug) DO NOTHING;

INSERT INTO zones (province_id, name, slug) VALUES
((SELECT id FROM provinces WHERE slug = 'province-94'), 'Zone A', 'zone-a'),
((SELECT id FROM provinces WHERE slug = 'province-94'), 'Zone B', 'zone-b'),
((SELECT id FROM provinces WHERE slug = 'province-72'), 'Zone Alpha', 'zone-alpha'),
((SELECT id FROM provinces WHERE slug = 'province-72'), 'Zone Beta', 'zone-beta')
ON CONFLICT (province_id, slug) DO NOTHING;

INSERT INTO areas (zone_id, name, slug) VALUES
((SELECT id FROM zones WHERE slug = 'zone-a' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94')), 'Area 1', 'area-1'),
((SELECT id FROM zones WHERE slug = 'zone-a' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94')), 'Area 2', 'area-2'),
((SELECT id FROM zones WHERE slug = 'zone-b' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94')), 'Area 3', 'area-3'),
((SELECT id FROM zones WHERE slug = 'zone-b' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94')), 'Area 4', 'area-4'),
((SELECT id FROM zones WHERE slug = 'zone-alpha' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72')), 'Area North', 'area-north'),
((SELECT id FROM zones WHERE slug = 'zone-alpha' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72')), 'Area South', 'area-south'),
((SELECT id FROM zones WHERE slug = 'zone-beta' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72')), 'Area East', 'area-east'),
((SELECT id FROM zones WHERE slug = 'zone-beta' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72')), 'Area West', 'area-west')
ON CONFLICT (zone_id, slug) DO NOTHING;

INSERT INTO parishes (area_id, name, slug) VALUES
((SELECT id FROM areas WHERE slug = 'area-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-a' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94'))), 'RCCG Grace Parish', 'rccg-grace-parish'),
((SELECT id FROM areas WHERE slug = 'area-1' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-a' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94'))), 'RCCG Faith Parish', 'rccg-faith-parish'),
((SELECT id FROM areas WHERE slug = 'area-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-a' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94'))), 'RCCG Hope Parish', 'rccg-hope-parish'),
((SELECT id FROM areas WHERE slug = 'area-2' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-a' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94'))), 'RCCG Joy Parish', 'rccg-joy-parish'),
((SELECT id FROM areas WHERE slug = 'area-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-b' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94'))), 'RCCG Peace Parish', 'rccg-peace-parish'),
((SELECT id FROM areas WHERE slug = 'area-3' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-b' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94'))), 'RCCG Love Parish', 'rccg-love-parish'),
((SELECT id FROM areas WHERE slug = 'area-4' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-b' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94'))), 'RCCG Mercy Parish', 'rccg-mercy-parish'),
((SELECT id FROM areas WHERE slug = 'area-4' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-b' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-94'))), 'RCCG Truth Parish', 'rccg-truth-parish'),
((SELECT id FROM areas WHERE slug = 'area-north' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-alpha' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72'))), 'RCCG Covenant Parish', 'rccg-covenant-parish'),
((SELECT id FROM areas WHERE slug = 'area-north' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-alpha' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72'))), 'RCCG Triumph Parish', 'rccg-triumph-parish'),
((SELECT id FROM areas WHERE slug = 'area-south' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-alpha' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72'))), 'RCCG Glory Parish', 'rccg-glory-parish'),
((SELECT id FROM areas WHERE slug = 'area-south' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-alpha' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72'))), 'RCCG Victory Parish', 'rccg-victory-parish'),
((SELECT id FROM areas WHERE slug = 'area-east' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-beta' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72'))), 'RCCG Redemption Parish', 'rccg-redemption-parish'),
((SELECT id FROM areas WHERE slug = 'area-east' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-beta' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72'))), 'RCCG Holy Ghost Parish', 'rccg-holy-ghost-parish'),
((SELECT id FROM areas WHERE slug = 'area-west' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-beta' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72'))), 'RCCG New Dawn Parish', 'rccg-new-dawn-parish'),
((SELECT id FROM areas WHERE slug = 'area-west' AND zone_id = (SELECT id FROM zones WHERE slug = 'zone-beta' AND province_id = (SELECT id FROM provinces WHERE slug = 'province-72'))), 'RCCG Everlasting Parish', 'rccg-everlasting-parish')
ON CONFLICT (area_id, slug) DO NOTHING;

INSERT INTO seasons (name, year, status, is_current)
VALUES ('RCCG Region 36 Quiz 2025', 2025, 'active', true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO stage_configs (season_id, level, is_open, time_limit_minutes, pool_size, requires_question_approval)
SELECT s.id, lvl.level::stage_level, false, 30, 10, false
FROM seasons s
CROSS JOIN (VALUES ('parish'), ('area'), ('zonal'), ('provincial'), ('regional')) AS lvl(level)
WHERE s.name = 'RCCG Region 36 Quiz 2025'
ON CONFLICT (season_id, level) DO NOTHING;

INSERT INTO questions (season_id, stage_level, age_category, question_type, question_text, correct_answer, points, parish_id)
SELECT s.id, 'parish', cat.cat, 'multiple_choice', 'Who was the first man created by God?', 'Adam', 1, p.id
FROM seasons s
CROSS JOIN (VALUES ('0-5'::age_category), ('6-8'::age_category), ('9-12'::age_category), ('13-15'::age_category), ('16-19'::age_category)) AS cat(cat)
CROSS JOIN parishes p
WHERE s.name = 'RCCG Region 36 Quiz 2025' AND p.slug = 'rccg-grace-parish';

INSERT INTO question_options (question_id, option_text, is_correct, display_order)
SELECT q.id, opt.text, opt.is_correct, opt.ord
FROM questions q
CROSS JOIN (VALUES
  ('Adam', true, 1), ('Eve', false, 2), ('Moses', false, 3), ('Noah', false, 4)
) AS opt(text, is_correct, ord)
WHERE q.question_text = 'Who was the first man created by God?';

INSERT INTO questions (season_id, stage_level, age_category, question_type, question_text, correct_answer, points, parish_id)
SELECT s.id, 'parish', cat.cat, 'true_false', 'God created the world in six days and rested on the seventh day.', 'true', 1, p.id
FROM seasons s
CROSS JOIN (VALUES ('0-5'::age_category), ('6-8'::age_category), ('9-12'::age_category), ('13-15'::age_category), ('16-19'::age_category)) AS cat(cat)
CROSS JOIN parishes p
WHERE s.name = 'RCCG Region 36 Quiz 2025' AND p.slug = 'rccg-grace-parish';

INSERT INTO questions (season_id, stage_level, age_category, question_type, question_text, correct_answer, points, parish_id)
SELECT s.id, 'parish', cat.cat, 'fill_blank', 'Complete this verse: "In the beginning God created the ___ and the earth."', 'heavens', 2, p.id
FROM seasons s
CROSS JOIN (VALUES ('6-8'::age_category), ('9-12'::age_category), ('13-15'::age_category), ('16-19'::age_category)) AS cat(cat)
CROSS JOIN parishes p
WHERE s.name = 'RCCG Region 36 Quiz 2025' AND p.slug = 'rccg-grace-parish';
