-- =============================================================
-- Daycare Routine Tracker — Complete Database Schema
-- PostgreSQL 16
-- Run order: This single file creates all tables in dependency order
-- =============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE user_role AS ENUM ('admin', 'centre_head', 'teacher', 'parent');
CREATE TYPE child_gender AS ENUM ('male', 'female', 'other');
CREATE TYPE meal_type AS ENUM ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner');
CREATE TYPE meal_amount AS ENUM ('none', 'little', 'half', 'most', 'all');
CREATE TYPE mood_type AS ENUM ('happy', 'calm', 'fussy', 'tired', 'upset', 'excited');
CREATE TYPE diaper_type AS ENUM ('wet', 'soiled', 'dry', 'not_checked');
CREATE TYPE activity_type AS ENUM ('play', 'outdoor', 'art', 'music', 'reading', 'learning', 'other');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'half_day', 'late');
CREATE TYPE shift_type AS ENUM ('morning', 'afternoon', 'full_day', 'split');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE notification_channel AS ENUM ('email', 'whatsapp', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'delivered');
CREATE TYPE admission_status AS ENUM ('enquiry', 'applied', 'enrolled', 'waitlisted', 'withdrawn');

-- =============================================================
-- USERS
-- =============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    role            user_role NOT NULL DEFAULT 'teacher',
    profile_photo   VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- =============================================================
-- REFRESH TOKENS
-- =============================================================

CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- =============================================================
-- CENTRES / BRANCHES
-- =============================================================

CREATE TABLE centres (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    address     TEXT,
    phone       VARCHAR(20),
    email       VARCHAR(255),
    head_id     UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ
);

-- =============================================================
-- CLASSROOMS
-- =============================================================

CREATE TABLE classrooms (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centre_id       UUID NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    age_group       VARCHAR(50),       -- e.g. "2-3 years"
    capacity        INTEGER NOT NULL DEFAULT 20,
    lead_teacher_id UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_classrooms_centre ON classrooms(centre_id) WHERE deleted_at IS NULL;

-- =============================================================
-- PARENTS / GUARDIANS
-- =============================================================

CREATE TABLE parents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name       VARCHAR(255) NOT NULL,
    relationship    VARCHAR(50),       -- mother, father, guardian, grandparent
    phone           VARCHAR(20),
    email           VARCHAR(255),
    whatsapp_number VARCHAR(20),
    address         TEXT,
    emergency_contact_name  VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_parents_user ON parents(user_id) WHERE deleted_at IS NULL;

-- =============================================================
-- CHILDREN
-- =============================================================

CREATE TABLE children (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name           VARCHAR(255) NOT NULL,
    date_of_birth       DATE NOT NULL,
    gender              child_gender NOT NULL,
    profile_photo       VARCHAR(500),
    classroom_id        UUID REFERENCES classrooms(id) ON DELETE SET NULL,
    primary_parent_id   UUID REFERENCES parents(id) ON DELETE SET NULL,
    admission_status    admission_status NOT NULL DEFAULT 'enquiry',
    admission_date      DATE,
    medical_notes       TEXT,
    dietary_restrictions TEXT,
    blood_group         VARCHAR(5),
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at          TIMESTAMPTZ
);

CREATE INDEX idx_children_classroom ON children(classroom_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_children_parent ON children(primary_parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_children_active ON children(is_active) WHERE deleted_at IS NULL;

-- =============================================================
-- CHILD-PARENT RELATIONSHIPS (secondary guardians)
-- =============================================================

CREATE TABLE child_parents (
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    parent_id       UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    relationship    VARCHAR(50),
    is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
    can_pickup      BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (child_id, parent_id)
);

-- =============================================================
-- ALLERGIES
-- =============================================================

CREATE TABLE allergies (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id    UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    allergen    VARCHAR(255) NOT NULL,
    severity    VARCHAR(50),  -- mild, moderate, severe
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_allergies_child ON allergies(child_id);

-- =============================================================
-- STAFF (teachers, assistants, admin staff)
-- =============================================================

CREATE TABLE staff (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    centre_id       UUID NOT NULL REFERENCES centres(id),
    employee_id     VARCHAR(50) UNIQUE,
    designation     VARCHAR(100),      -- Head Teacher, Assistant Teacher, Coordinator
    department      VARCHAR(100),
    date_of_joining DATE,
    qualifications  TEXT,
    specialisations TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_staff_user ON staff(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_staff_centre ON staff(centre_id) WHERE deleted_at IS NULL;

-- =============================================================
-- STAFF ATTENDANCE
-- =============================================================

CREATE TABLE staff_attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    status          attendance_status NOT NULL DEFAULT 'present',
    shift           shift_type,
    clock_in        TIMESTAMPTZ,
    clock_out       TIMESTAMPTZ,
    hours_worked    NUMERIC(4,2),
    notes           TEXT,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, date)
);

CREATE INDEX idx_staff_attendance_date ON staff_attendance(date);
CREATE INDEX idx_staff_attendance_staff ON staff_attendance(staff_id);

-- =============================================================
-- DUTY ROSTER
-- =============================================================

CREATE TABLE duty_roster (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    classroom_id    UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    shift           shift_type NOT NULL DEFAULT 'full_day',
    start_time      TIME,
    end_time        TIME,
    is_lead         BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(staff_id, date, shift)
);

CREATE INDEX idx_roster_date ON duty_roster(date);
CREATE INDEX idx_roster_staff ON duty_roster(staff_id);
CREATE INDEX idx_roster_classroom ON duty_roster(classroom_id);

-- =============================================================
-- CHILD ATTENDANCE (daily roll call)
-- =============================================================

CREATE TABLE child_attendance (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    status          attendance_status NOT NULL DEFAULT 'present',
    arrival_time    TIMESTAMPTZ,
    departure_time  TIMESTAMPTZ,
    picked_up_by    VARCHAR(255),
    pickup_notes    TEXT,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(child_id, date)
);

CREATE INDEX idx_child_attendance_date ON child_attendance(date);
CREATE INDEX idx_child_attendance_child ON child_attendance(child_id);

-- =============================================================
-- DAILY ROUTINES (core entity — one per child per day)
-- =============================================================

CREATE TABLE daily_routines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    overall_mood    mood_type,
    general_notes   TEXT,
    summary_text    TEXT,             -- AI-generated daily narrative
    summary_sent_at TIMESTAMPTZ,      -- when parent was notified
    is_complete     BOOLEAN NOT NULL DEFAULT FALSE,
    completed_by    UUID REFERENCES users(id),
    completed_at    TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(child_id, date)
);

CREATE INDEX idx_routines_date ON daily_routines(date);
CREATE INDEX idx_routines_child ON daily_routines(child_id);
CREATE INDEX idx_routines_complete ON daily_routines(is_complete, date);

-- =============================================================
-- MEAL LOGS
-- =============================================================

CREATE TABLE meal_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id      UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    meal_type       meal_type NOT NULL,
    food_items      TEXT,
    amount_eaten    meal_amount NOT NULL DEFAULT 'half',
    time_served     TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meals_routine ON meal_logs(routine_id);

-- =============================================================
-- NAP LOGS
-- =============================================================

CREATE TABLE nap_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id      UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    duration_mins   INTEGER,          -- computed or entered
    sleep_quality   VARCHAR(50),      -- good, restless, short, long
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_naps_routine ON nap_logs(routine_id);

-- =============================================================
-- DIAPER LOGS
-- =============================================================

CREATE TABLE diaper_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id      UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    change_time     TIMESTAMPTZ NOT NULL,
    diaper_type     diaper_type NOT NULL DEFAULT 'wet',
    notes           TEXT,
    changed_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_diapers_routine ON diaper_logs(routine_id);

-- =============================================================
-- ACTIVITY LOGS
-- =============================================================

CREATE TABLE activity_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id      UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    activity_type   activity_type NOT NULL,
    activity_name   VARCHAR(255),
    start_time      TIMESTAMPTZ,
    end_time        TIMESTAMPTZ,
    duration_mins   INTEGER,
    description     TEXT,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_routine ON activity_logs(routine_id);

-- =============================================================
-- MOOD LOGS (timestamped mood check-ins within the day)
-- =============================================================

CREATE TABLE mood_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    routine_id      UUID NOT NULL REFERENCES daily_routines(id) ON DELETE CASCADE,
    mood            mood_type NOT NULL,
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    recorded_by     UUID REFERENCES users(id)
);

CREATE INDEX idx_moods_routine ON mood_logs(routine_id);

-- =============================================================
-- TEACHER TASKS
-- =============================================================

CREATE TABLE teacher_tasks (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    assigned_to     UUID NOT NULL REFERENCES users(id),
    assigned_by     UUID REFERENCES users(id),
    classroom_id    UUID REFERENCES classrooms(id),
    due_date        DATE,
    priority        task_priority NOT NULL DEFAULT 'medium',
    status          task_status NOT NULL DEFAULT 'pending',
    category        VARCHAR(100),    -- planning, admin, parent_comm, safety, other
    completed_at    TIMESTAMPTZ,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_tasks_assigned ON teacher_tasks(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_status ON teacher_tasks(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_due ON teacher_tasks(due_date) WHERE deleted_at IS NULL;

-- =============================================================
-- TASK COMMENTS / HISTORY
-- =============================================================

CREATE TABLE task_comments (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id     UUID NOT NULL REFERENCES teacher_tasks(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    comment     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);

-- =============================================================
-- LESSON PLANS
-- =============================================================

CREATE TABLE lesson_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id    UUID NOT NULL REFERENCES classrooms(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(255) NOT NULL,
    week_start_date DATE NOT NULL,
    content         JSONB,            -- structured plan per day/activity
    status          VARCHAR(50) DEFAULT 'draft',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lesson_plans_classroom ON lesson_plans(classroom_id);
CREATE INDEX idx_lesson_plans_week ON lesson_plans(week_start_date);

-- =============================================================
-- MILESTONES
-- =============================================================

CREATE TABLE milestones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    category        VARCHAR(100),   -- cognitive, motor, language, social, emotional
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    achieved_date   DATE,
    notes           TEXT,
    recorded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_child ON milestones(child_id);

-- =============================================================
-- PARENT FEEDBACK
-- =============================================================

CREATE TABLE parent_feedback (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    parent_id       UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    date            DATE NOT NULL DEFAULT CURRENT_DATE,
    rating          SMALLINT CHECK (rating BETWEEN 1 AND 5),
    message         TEXT,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_feedback_child ON parent_feedback(child_id);

-- =============================================================
-- NOTIFICATIONS / COMMUNICATION LOG
-- =============================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    child_id        UUID REFERENCES children(id) ON DELETE SET NULL,
    parent_id       UUID REFERENCES parents(id) ON DELETE SET NULL,
    channel         notification_channel NOT NULL,
    recipient       VARCHAR(255) NOT NULL,   -- email/phone
    subject         VARCHAR(500),
    body            TEXT NOT NULL,
    status          notification_status NOT NULL DEFAULT 'pending',
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_child ON notifications(child_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_date ON notifications(created_at);

-- =============================================================
-- SUPPLIES
-- =============================================================

CREATE TABLE supplies (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centre_id       UUID NOT NULL REFERENCES centres(id),
    name            VARCHAR(255) NOT NULL,
    category        VARCHAR(100),
    quantity        INTEGER NOT NULL DEFAULT 0,
    unit            VARCHAR(50),
    reorder_level   INTEGER DEFAULT 5,
    last_restocked  DATE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- AUDIT LOG
-- =============================================================

CREATE TABLE audit_logs (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   UUID,
    changes     JSONB,
    ip_address  VARCHAR(45),
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_logs(created_at);

-- =============================================================
-- TRIGGER: Auto-update updated_at columns
-- =============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all relevant tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'users', 'centres', 'classrooms', 'parents', 'children',
        'staff', 'staff_attendance', 'duty_roster', 'child_attendance',
        'daily_routines', 'teacher_tasks', 'lesson_plans', 'supplies'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
            t
        );
    END LOOP;
END $$;

-- =============================================================
-- TRIGGER: Auto-compute nap duration
-- =============================================================

CREATE OR REPLACE FUNCTION compute_nap_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.start_time IS NOT NULL AND NEW.end_time IS NOT NULL THEN
        NEW.duration_mins = EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nap_duration
BEFORE INSERT OR UPDATE ON nap_logs
FOR EACH ROW EXECUTE FUNCTION compute_nap_duration();

-- =============================================================
-- TRIGGER: Auto-compute hours worked
-- =============================================================

CREATE OR REPLACE FUNCTION compute_hours_worked()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.clock_in IS NOT NULL AND NEW.clock_out IS NOT NULL THEN
        NEW.hours_worked = ROUND(
            EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600,
            2
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_hours_worked
BEFORE INSERT OR UPDATE ON staff_attendance
FOR EACH ROW EXECUTE FUNCTION compute_hours_worked();

-- =============================================================
-- VIEWS
-- =============================================================

-- Daily routine completeness overview (for dashboard)
CREATE VIEW v_routine_summary AS
SELECT
    dr.date,
    dr.child_id,
    c.full_name AS child_name,
    cl.name AS classroom_name,
    dr.overall_mood,
    dr.is_complete,
    dr.summary_sent_at IS NOT NULL AS summary_sent,
    (SELECT COUNT(*) FROM meal_logs WHERE routine_id = dr.id) AS meal_count,
    (SELECT COUNT(*) FROM nap_logs WHERE routine_id = dr.id) AS nap_count,
    (SELECT COUNT(*) FROM diaper_logs WHERE routine_id = dr.id) AS diaper_count,
    (SELECT COUNT(*) FROM activity_logs WHERE routine_id = dr.id) AS activity_count
FROM daily_routines dr
JOIN children c ON c.id = dr.child_id
LEFT JOIN classrooms cl ON cl.id = c.classroom_id
WHERE c.deleted_at IS NULL;

-- Staff duty for today (for attendance screen)
CREATE VIEW v_today_duty AS
SELECT
    s.id AS staff_id,
    u.full_name AS staff_name,
    u.profile_photo,
    st.designation,
    cl.name AS classroom_name,
    dr.shift,
    dr.start_time,
    dr.end_time,
    dr.is_lead,
    sa.status AS attendance_status,
    sa.clock_in,
    sa.clock_out
FROM duty_roster dr
JOIN staff s ON s.id = dr.staff_id
JOIN users u ON u.id = s.user_id
LEFT JOIN classrooms cl ON cl.id = dr.classroom_id
LEFT JOIN staff st ON st.id = s.id
LEFT JOIN staff_attendance sa ON sa.staff_id = s.id AND sa.date = dr.date
WHERE dr.date = CURRENT_DATE;

-- KPI dashboard aggregate view
CREATE VIEW v_kpi_today AS
SELECT
    (SELECT COUNT(*) FROM children WHERE is_active = TRUE AND deleted_at IS NULL) AS total_children,
    (SELECT COUNT(*) FROM child_attendance WHERE date = CURRENT_DATE AND status = 'present') AS children_present_today,
    (SELECT COUNT(*) FROM staff WHERE is_active = TRUE AND deleted_at IS NULL) AS total_staff,
    (SELECT COUNT(*) FROM staff_attendance WHERE date = CURRENT_DATE AND status = 'present') AS staff_present_today,
    (SELECT COUNT(*) FROM daily_routines WHERE date = CURRENT_DATE AND is_complete = TRUE) AS routines_completed,
    (SELECT COUNT(*) FROM daily_routines WHERE date = CURRENT_DATE) AS routines_total,
    (SELECT COUNT(*) FROM teacher_tasks WHERE status = 'pending' AND deleted_at IS NULL) AS tasks_pending,
    (SELECT COUNT(*) FROM teacher_tasks WHERE status = 'completed' AND deleted_at IS NULL AND DATE(completed_at) = CURRENT_DATE) AS tasks_completed_today;
