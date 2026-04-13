-- =============================================================
-- SEED: BrightSmile Dental Clinic
-- Business ID: 0cc1fd6d-cf1e-40ec-8483-a093900d35bb
-- Run in Supabase Studio > SQL Editor
-- Safe to re-run (deletes existing data first)
-- =============================================================

DO $$
DECLARE
  bid UUID := '0cc1fd6d-cf1e-40ec-8483-a093900d35bb';

  -- Staff UUIDs (fixed so we can reference in services + hours)
  s1 UUID := 'b1000000-0000-0000-0000-000000000001'; -- Dr. Sarah Mitchell
  s2 UUID := 'b1000000-0000-0000-0000-000000000002'; -- Dr. James Carter
  s3 UUID := 'b1000000-0000-0000-0000-000000000003'; -- Dr. Emily Tran
  s4 UUID := 'b1000000-0000-0000-0000-000000000004'; -- Dr. Amir Khan

BEGIN

-- =============================================================
-- 1. UPDATE BUSINESS PROFILE
-- =============================================================
UPDATE businesses SET
  name       = 'BrightSmile Dental Clinic',
  type       = 'Dental Clinic',
  contact    = '+1 (555) 234-5678',
  address    = '42 Maplewood Avenue, Suite 3, Springfield, IL 62701',
  updated_at = now()
WHERE id = bid;

-- =============================================================
-- 2. CLEAR OLD DATA (order matters — children before parents)
-- =============================================================
DELETE FROM chat_messages  WHERE session_id IN (SELECT id FROM chat_sessions WHERE business_id = bid);
DELETE FROM chat_sessions  WHERE business_id = bid;
DELETE FROM staff_hours    WHERE business_id = bid;
DELETE FROM staff_custom_fields WHERE business_id = bid;
DELETE FROM staff          WHERE business_id = bid;
DELETE FROM service_custom_fields WHERE business_id = bid;
DELETE FROM services       WHERE business_id = bid;
DELETE FROM business_hours WHERE business_id = bid;
DELETE FROM widget_settings  WHERE business_id = bid;
DELETE FROM payment_settings WHERE business_id = bid;

-- =============================================================
-- 3. BUSINESS HOURS (Mon=1 … Sun=0)
-- Mon–Fri 09:00–18:00 | Sat 09:00–14:00 | Sun closed
-- =============================================================
INSERT INTO business_hours (business_id, day_of_week, open_time, close_time, is_closed) VALUES
  (bid, 0, NULL,    NULL,    true),   -- Sunday   closed
  (bid, 1, '09:00', '18:00', false),  -- Monday
  (bid, 2, '09:00', '18:00', false),  -- Tuesday
  (bid, 3, '09:00', '18:00', false),  -- Wednesday
  (bid, 4, '09:00', '18:00', false),  -- Thursday
  (bid, 5, '09:00', '18:00', false),  -- Friday
  (bid, 6, '09:00', '14:00', false);  -- Saturday

-- =============================================================
-- 4. SERVICE CUSTOM FIELD DEFINITIONS
-- =============================================================
INSERT INTO service_custom_fields (business_id, label, field_key, input_type, options, is_required, sort_order) VALUES
  (bid, 'Insurance Accepted',    'insurance_accepted',    'checkbox',  '[]',    false, 1),
  (bid, 'Anesthesia Required',   'anesthesia_required',   'checkbox',  '[]',    false, 2),
  (bid, 'Post-Treatment Notes',  'post_treatment_notes',  'text',      '[]',    false, 3);

-- =============================================================
-- 5. STAFF CUSTOM FIELD DEFINITIONS
-- =============================================================
INSERT INTO staff_custom_fields (business_id, label, field_key, input_type, options, is_required, sort_order) VALUES
  (bid, 'Specialization',      'specialization',      'text',     '[]',                              true,  1),
  (bid, 'Years of Experience', 'years_of_experience', 'number',   '[]',                              true,  2),
  (bid, 'Languages Spoken',    'languages_spoken',    'text',     '[]',                              false, 3),
  (bid, 'Accepts New Patients','accepts_new_patients','checkbox',  '[]',                              false, 4);

-- =============================================================
-- 6. STAFF
-- =============================================================
INSERT INTO staff (id, business_id, name, role, bio, contact, is_active, meta) VALUES
(
  s1, bid,
  'Dr. Sarah Mitchell',
  'General Dentist & Clinic Director',
  'Dr. Mitchell is the founder and director of BrightSmile Dental Clinic with over 16 years of clinical experience. She specialises in comprehensive family dentistry and is known for her gentle, patient-first approach. She holds a DDS from the University of Illinois and is a member of the American Dental Association.',
  '{"email": "sarah.mitchell@brightsmile.com", "phone": "+1 (555) 234-5001"}',
  true,
  '{"specialization": "General & Family Dentistry", "years_of_experience": 16, "languages_spoken": "English, Spanish", "accepts_new_patients": true}'
),
(
  s2, bid,
  'Dr. James Carter',
  'Orthodontist',
  'Dr. Carter is a board-certified orthodontist with 11 years of experience specialising in braces and clear aligner therapy. He completed his orthodontic residency at Northwestern University. Dr. Carter is a certified Invisalign provider and has treated over 1,200 patients.',
  '{"email": "james.carter@brightsmile.com", "phone": "+1 (555) 234-5002"}',
  true,
  '{"specialization": "Orthodontics & Clear Aligners", "years_of_experience": 11, "languages_spoken": "English", "accepts_new_patients": true}'
),
(
  s3, bid,
  'Dr. Emily Tran',
  'Cosmetic Dentist',
  'Dr. Tran is a cosmetic dentistry specialist with 9 years of experience transforming smiles. She trained at the Las Vegas Institute for Advanced Dental Studies and is proficient in porcelain veneers, composite bonding, and professional whitening. She is passionate about aesthetic precision and natural-looking results.',
  '{"email": "emily.tran@brightsmile.com", "phone": "+1 (555) 234-5003"}',
  true,
  '{"specialization": "Cosmetic & Aesthetic Dentistry", "years_of_experience": 9, "languages_spoken": "English, Vietnamese", "accepts_new_patients": true}'
),
(
  s4, bid,
  'Dr. Amir Khan',
  'Pediatric Dentist',
  'Dr. Khan is a dedicated pediatric dentist with 7 years of experience caring for children from infancy through adolescence. He completed his pediatric dentistry fellowship at Children''s Hospital of Chicago. He is known for creating a fun, anxiety-free environment for young patients.',
  '{"email": "amir.khan@brightsmile.com", "phone": "+1 (555) 234-5004"}',
  true,
  '{"specialization": "Pediatric Dentistry", "years_of_experience": 7, "languages_spoken": "English, Urdu, Punjabi", "accepts_new_patients": true}'
);

-- =============================================================
-- 7. INDIVIDUAL STAFF HOURS
-- =============================================================

-- Dr. Sarah Mitchell: Mon–Fri 09:00–18:00, Sat 09:00–14:00, Sun closed
INSERT INTO staff_hours (business_id, staff_id, day_of_week, is_closed, open_time, close_time) VALUES
  (bid, s1, 0, true,  NULL,    NULL),
  (bid, s1, 1, false, '09:00', '18:00'),
  (bid, s1, 2, false, '09:00', '18:00'),
  (bid, s1, 3, false, '09:00', '18:00'),
  (bid, s1, 4, false, '09:00', '18:00'),
  (bid, s1, 5, false, '09:00', '18:00'),
  (bid, s1, 6, false, '09:00', '14:00');

-- Dr. James Carter: Mon/Wed/Fri 10:00–18:00, Sat 09:00–13:00, Tue/Thu/Sun closed
INSERT INTO staff_hours (business_id, staff_id, day_of_week, is_closed, open_time, close_time) VALUES
  (bid, s2, 0, true,  NULL,    NULL),
  (bid, s2, 1, false, '10:00', '18:00'),
  (bid, s2, 2, true,  NULL,    NULL),
  (bid, s2, 3, false, '10:00', '18:00'),
  (bid, s2, 4, true,  NULL,    NULL),
  (bid, s2, 5, false, '10:00', '18:00'),
  (bid, s2, 6, false, '09:00', '13:00');

-- Dr. Emily Tran: Tue–Fri 09:00–17:00, Sat 10:00–14:00, Mon/Sun closed
INSERT INTO staff_hours (business_id, staff_id, day_of_week, is_closed, open_time, close_time) VALUES
  (bid, s3, 0, true,  NULL,    NULL),
  (bid, s3, 1, true,  NULL,    NULL),
  (bid, s3, 2, false, '09:00', '17:00'),
  (bid, s3, 3, false, '09:00', '17:00'),
  (bid, s3, 4, false, '09:00', '17:00'),
  (bid, s3, 5, false, '09:00', '17:00'),
  (bid, s3, 6, false, '10:00', '14:00');

-- Dr. Amir Khan: Mon–Thu 09:00–16:00, Fri/Sat/Sun closed
INSERT INTO staff_hours (business_id, staff_id, day_of_week, is_closed, open_time, close_time) VALUES
  (bid, s4, 0, true,  NULL,    NULL),
  (bid, s4, 1, false, '09:00', '16:00'),
  (bid, s4, 2, false, '09:00', '16:00'),
  (bid, s4, 3, false, '09:00', '16:00'),
  (bid, s4, 4, false, '09:00', '16:00'),
  (bid, s4, 5, true,  NULL,    NULL),
  (bid, s4, 6, true,  NULL,    NULL);

-- =============================================================
-- 8. SERVICES
-- staff_ids references the staff UUIDs above
-- meta references the service_custom_fields field_keys above
-- =============================================================

-- General Dentistry
INSERT INTO services (business_id, name, description, price, duration_minutes, category, is_active, staff_ids, meta) VALUES
(
  bid,
  'Dental Checkup & Cleaning',
  'Comprehensive oral examination including full-mouth X-rays, professional scaling and polishing, and personalised oral hygiene advice. Recommended every 6 months.',
  80.00, 60, 'General Dentistry', true,
  to_jsonb(ARRAY[s1::text, s2::text, s3::text, s4::text]),
  '{"insurance_accepted": true, "anesthesia_required": false, "post_treatment_notes": "Avoid eating for 30 minutes after cleaning. Schedule your next visit in 6 months."}'
),
(
  bid,
  'Tooth Filling (Composite)',
  'Tooth-coloured composite resin filling to restore decayed or damaged teeth. The filling is matched to your natural tooth colour for a seamless, natural appearance.',
  150.00, 45, 'General Dentistry', true,
  to_jsonb(ARRAY[s1::text, s3::text]),
  '{"insurance_accepted": true, "anesthesia_required": true, "post_treatment_notes": "Avoid hard foods for 24 hours. Mild sensitivity is normal and should subside within a week."}'
),
(
  bid,
  'Tooth Extraction',
  'Safe and comfortable removal of severely damaged, decayed, or impacted teeth. Includes post-extraction care instructions and follow-up consultation.',
  200.00, 60, 'General Dentistry', true,
  to_jsonb(ARRAY[s1::text]),
  '{"insurance_accepted": true, "anesthesia_required": true, "post_treatment_notes": "Bite on gauze for 1 hour. No smoking, rinsing, or using a straw for 24 hours. Soft diet for 3 days."}'
),
(
  bid,
  'Root Canal Treatment',
  'Complete endodontic therapy to save an infected or severely damaged tooth. Includes cleaning, shaping, and sealing of root canals, followed by a protective crown recommendation.',
  700.00, 90, 'General Dentistry', true,
  to_jsonb(ARRAY[s1::text]),
  '{"insurance_accepted": true, "anesthesia_required": true, "post_treatment_notes": "Take prescribed antibiotics if given. Avoid chewing on treated side until crown is placed. Follow-up appointment required."}'
),

-- Cosmetic Dentistry
(
  bid,
  'Professional Teeth Whitening',
  'In-chair laser-assisted teeth whitening treatment that lightens teeth by up to 8 shades in a single session. Safe, fast, and long-lasting results.',
  350.00, 90, 'Cosmetic Dentistry', true,
  to_jsonb(ARRAY[s3::text]),
  '{"insurance_accepted": false, "anesthesia_required": false, "post_treatment_notes": "Avoid dark-coloured foods and beverages (coffee, tea, red wine) for 48 hours after treatment."}'
),
(
  bid,
  'Porcelain Veneers (per tooth)',
  'Custom-crafted ultra-thin porcelain shells bonded to the front surface of teeth to correct discolouration, chips, gaps, or minor misalignment. Results last 10–15 years with proper care.',
  900.00, 120, 'Cosmetic Dentistry', true,
  to_jsonb(ARRAY[s3::text]),
  '{"insurance_accepted": false, "anesthesia_required": true, "post_treatment_notes": "Avoid biting hard objects. Wear a night guard if you grind your teeth. Regular checkups recommended."}'
),

-- Orthodontics
(
  bid,
  'Orthodontic Consultation',
  'Free initial consultation with our orthodontist to assess teeth alignment, jaw position, and bite. Includes digital X-rays and a customised treatment plan overview.',
  0.00, 30, 'Orthodontics', true,
  to_jsonb(ARRAY[s2::text]),
  '{"insurance_accepted": false, "anesthesia_required": false, "post_treatment_notes": "Bring any previous dental records or X-rays if available."}'
),
(
  bid,
  'Clear Aligners (Full Treatment)',
  'Full Invisalign clear aligner treatment plan to straighten teeth discreetly. Includes all aligner trays, progress check-ins, and one set of retainers upon completion.',
  3500.00, 60, 'Orthodontics', true,
  to_jsonb(ARRAY[s2::text]),
  '{"insurance_accepted": true, "anesthesia_required": false, "post_treatment_notes": "Wear aligners 20–22 hours per day. Remove only for eating and brushing. Change trays as instructed."}'
),

-- Pediatric Dentistry
(
  bid,
  'Kids Dental Checkup',
  'Child-friendly comprehensive dental examination and cleaning for patients aged 2–16. Includes fluoride application, X-rays if needed, and a fun take-home dental hygiene kit.',
  60.00, 45, 'Pediatric Dentistry', true,
  to_jsonb(ARRAY[s4::text]),
  '{"insurance_accepted": true, "anesthesia_required": false, "post_treatment_notes": "Encourage brushing twice daily and flossing. Limit sugary snacks and drinks."}'
),
(
  bid,
  'Fluoride Treatment',
  'Quick and painless professional fluoride varnish application to strengthen tooth enamel and prevent cavities. Recommended every 6 months for children.',
  40.00, 30, 'Pediatric Dentistry', true,
  to_jsonb(ARRAY[s4::text]),
  '{"insurance_accepted": true, "anesthesia_required": false, "post_treatment_notes": "Child should not eat, drink, or rinse for 30 minutes after treatment."}'
);

-- =============================================================
-- 9. WIDGET SETTINGS
-- =============================================================
INSERT INTO widget_settings (business_id, color, welcome_message) VALUES
(
  bid,
  '#0284c7',
  'Welcome to BrightSmile Dental Clinic! How can we help you today? Ask us about our services, team, or to book an appointment.'
);

-- =============================================================
-- 10. PAYMENT SETTINGS
-- =============================================================
INSERT INTO payment_settings (business_id, payment_type) VALUES
(bid, 'cash');

END $$;
