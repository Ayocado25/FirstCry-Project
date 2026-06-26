-- =============================================================
-- Seed Data — Daycare Routine Tracker
-- Run AFTER 001_schema.sql
-- =============================================================

-- NOTE: Passwords below are bcrypt hashes of:
--   Admin@123       → admin@intellitots.com
--   Head@123        → head@intellitots.com
--   Teacher@123     → teacher@intellitots.com / teacher2@intellitots.com
--   Parent@123      → parent@intellitots.com / parent2@intellitots.com

-- =============================================================
-- USERS
-- =============================================================

INSERT INTO users (id, email, password_hash, full_name, phone, role) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'admin@intellitots.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfDJlJNBYi3LqRea.',
    'Admin User',
    '+91-9000000001',
    'admin'
),
(
    '00000000-0000-0000-0000-000000000002',
    'head@intellitots.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfDJlJNBYi3LqRea.',
    'Priya Sharma',
    '+91-9000000002',
    'centre_head'
),
(
    '00000000-0000-0000-0000-000000000003',
    'teacher@intellitots.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfDJlJNBYi3LqRea.',
    'Anjali Mehta',
    '+91-9000000003',
    'teacher'
),
(
    '00000000-0000-0000-0000-000000000004',
    'teacher2@intellitots.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfDJlJNBYi3LqRea.',
    'Ravi Kumar',
    '+91-9000000004',
    'teacher'
),
(
    '00000000-0000-0000-0000-000000000005',
    'parent@intellitots.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfDJlJNBYi3LqRea.',
    'Rohit Gupta',
    '+91-9000000005',
    'parent'
),
(
    '00000000-0000-0000-0000-000000000006',
    'parent2@intellitots.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfDJlJNBYi3LqRea.',
    'Sneha Reddy',
    '+91-9000000006',
    'parent'
);

-- NOTE: The bcrypt hashes above may not match the literal passwords shown in README
-- because this is seeded SQL. The backend seed script (npm run db:seed) generates
-- real bcrypt hashes at runtime. These SQL hashes are placeholders.
-- Run `npm run db:seed` from the backend directory instead of this file directly
-- if you want working passwords. This file is kept for reference / CI environments.

-- =============================================================
-- CENTRES
-- =============================================================

INSERT INTO centres (id, name, address, phone, email, head_id) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'FirstCry Intellitots — Hyderabad',
    '42, HITEC City, Madhapur, Hyderabad, Telangana 500081',
    '+91-40-12345678',
    'hyderabad@intellitots.com',
    '00000000-0000-0000-0000-000000000002'
);

-- =============================================================
-- CLASSROOMS
-- =============================================================

INSERT INTO classrooms (id, centre_id, name, age_group, capacity, lead_teacher_id) VALUES
(
    '20000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Sunflower Room',
    '1.5-2.5 years',
    15,
    '00000000-0000-0000-0000-000000000003'
),
(
    '20000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    'Butterfly Room',
    '2.5-3.5 years',
    18,
    '00000000-0000-0000-0000-000000000004'
);

-- =============================================================
-- PARENTS
-- =============================================================

INSERT INTO parents (id, user_id, full_name, relationship, phone, email, whatsapp_number) VALUES
(
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000005',
    'Rohit Gupta',
    'father',
    '+91-9000000005',
    'parent@intellitots.com',
    '+919000000005'
),
(
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000006',
    'Sneha Reddy',
    'mother',
    '+91-9000000006',
    'parent2@intellitots.com',
    '+919000000006'
);

-- =============================================================
-- CHILDREN
-- =============================================================

INSERT INTO children (id, full_name, date_of_birth, gender, classroom_id, primary_parent_id, admission_status, admission_date, dietary_restrictions) VALUES
(
    '40000000-0000-0000-0000-000000000001',
    'Aryan Gupta',
    '2023-03-15',
    'male',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'enrolled',
    '2025-06-01',
    'No nuts'
),
(
    '40000000-0000-0000-0000-000000000002',
    'Mia Reddy',
    '2023-07-22',
    'female',
    '20000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000002',
    'enrolled',
    '2025-06-01',
    NULL
),
(
    '40000000-0000-0000-0000-000000000003',
    'Kabir Patel',
    '2022-11-10',
    'male',
    '20000000-0000-0000-0000-000000000002',
    NULL,
    'enrolled',
    '2025-06-01',
    'Lactose intolerant'
);

-- child-parent mappings
INSERT INTO child_parents (child_id, parent_id, relationship, is_primary, can_pickup) VALUES
('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'father', TRUE, TRUE),
('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000002', 'mother', TRUE, TRUE);

-- allergies
INSERT INTO allergies (child_id, allergen, severity) VALUES
('40000000-0000-0000-0000-000000000001', 'Peanuts', 'severe'),
('40000000-0000-0000-0000-000000000001', 'Tree nuts', 'moderate');

-- =============================================================
-- STAFF
-- =============================================================

INSERT INTO staff (id, user_id, centre_id, employee_id, designation, date_of_joining) VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000001',
    'EMP001',
    'Head Teacher',
    '2024-01-10'
),
(
    '50000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000001',
    'EMP002',
    'Assistant Teacher',
    '2024-03-01'
);

-- =============================================================
-- DUTY ROSTER (today and yesterday for demo)
-- =============================================================

INSERT INTO duty_roster (staff_id, classroom_id, date, shift, start_time, end_time, is_lead)
VALUES
(
    '50000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    'full_day',
    '08:00',
    '16:00',
    TRUE
),
(
    '50000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    CURRENT_DATE,
    'full_day',
    '08:00',
    '16:00',
    TRUE
),
(
    '50000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    CURRENT_DATE - INTERVAL '1 day',
    'full_day',
    '08:00',
    '16:00',
    TRUE
);

-- =============================================================
-- STAFF ATTENDANCE (today)
-- =============================================================

INSERT INTO staff_attendance (staff_id, date, status, shift, clock_in, recorded_by)
VALUES
(
    '50000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    'present',
    'full_day',
    NOW() - INTERVAL '2 hours',
    '00000000-0000-0000-0000-000000000001'
),
(
    '50000000-0000-0000-0000-000000000002',
    CURRENT_DATE,
    'present',
    'full_day',
    NOW() - INTERVAL '1.5 hours',
    '00000000-0000-0000-0000-000000000001'
);

-- =============================================================
-- CHILD ATTENDANCE (today)
-- =============================================================

INSERT INTO child_attendance (child_id, date, status, arrival_time, recorded_by)
VALUES
(
    '40000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    'present',
    NOW() - INTERVAL '1.5 hours',
    '00000000-0000-0000-0000-000000000003'
),
(
    '40000000-0000-0000-0000-000000000002',
    CURRENT_DATE,
    'present',
    NOW() - INTERVAL '1 hour',
    '00000000-0000-0000-0000-000000000003'
),
(
    '40000000-0000-0000-0000-000000000003',
    CURRENT_DATE,
    'absent',
    NULL,
    '00000000-0000-0000-0000-000000000004'
);

-- =============================================================
-- DAILY ROUTINES + LOGS (today sample)
-- =============================================================

INSERT INTO daily_routines (id, child_id, date, overall_mood, general_notes, is_complete, created_by) VALUES
(
    '60000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    'happy',
    'Aryan had a great morning. Very energetic during play time.',
    FALSE,
    '00000000-0000-0000-0000-000000000003'
),
(
    '60000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000002',
    CURRENT_DATE,
    'calm',
    'Mia was quiet but engaged. Loved the art activity.',
    FALSE,
    '00000000-0000-0000-0000-000000000003'
);

-- Meal logs
INSERT INTO meal_logs (routine_id, meal_type, food_items, amount_eaten, time_served) VALUES
('60000000-0000-0000-0000-000000000001', 'breakfast', 'Idli with sambar, orange juice', 'most', NOW() - INTERVAL '1 hour'),
('60000000-0000-0000-0000-000000000001', 'morning_snack', 'Banana, milk', 'all', NOW() - INTERVAL '30 minutes'),
('60000000-0000-0000-0000-000000000002', 'breakfast', 'Upma, apple juice', 'half', NOW() - INTERVAL '1 hour'),
('60000000-0000-0000-0000-000000000002', 'morning_snack', 'Grapes, water', 'most', NOW() - INTERVAL '30 minutes');

-- Activity logs
INSERT INTO activity_logs (routine_id, activity_type, activity_name, start_time, end_time, description) VALUES
('60000000-0000-0000-0000-000000000001', 'play', 'Block Building', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '60 minutes', 'Built towers and sorted blocks by color'),
('60000000-0000-0000-0000-000000000001', 'outdoor', 'Garden Walk', NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '15 minutes', 'Explored the sensory garden'),
('60000000-0000-0000-0000-000000000002', 'art', 'Finger Painting', NOW() - INTERVAL '90 minutes', NOW() - INTERVAL '50 minutes', 'Used primary colors, made handprints'),
('60000000-0000-0000-0000-000000000002', 'reading', 'Story Time', NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '10 minutes', 'The Very Hungry Caterpillar');

-- Diaper logs
INSERT INTO diaper_logs (routine_id, change_time, diaper_type, changed_by) VALUES
('60000000-0000-0000-0000-000000000001', NOW() - INTERVAL '80 minutes', 'wet', '00000000-0000-0000-0000-000000000003'),
('60000000-0000-0000-0000-000000000002', NOW() - INTERVAL '70 minutes', 'soiled', '00000000-0000-0000-0000-000000000003');

-- =============================================================
-- TEACHER TASKS
-- =============================================================

INSERT INTO teacher_tasks (title, description, assigned_to, assigned_by, classroom_id, due_date, priority, status, category) VALUES
(
    'Prepare June curriculum plan',
    'Create weekly lesson plans for Sunflower Room for the month of June',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    CURRENT_DATE + INTERVAL '3 days',
    'high',
    'pending',
    'planning'
),
(
    'Parent-teacher meeting notes',
    'Compile and send meeting notes from last week to parents',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000001',
    CURRENT_DATE + INTERVAL '1 day',
    'medium',
    'in_progress',
    'parent_comm'
),
(
    'Replenish art supplies',
    'Submit supply request for paints, brushes, and craft paper',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    CURRENT_DATE,
    'low',
    'completed',
    'admin'
),
(
    'Update allergy charts on classroom door',
    'Ensure Aryan Gupta allergy notice is displayed on Sunflower Room entrance',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    'urgent',
    'pending',
    'safety'
);
