-- ==============================================================================
-- SATMaster Relational Database Schema Migration: 002_solved_questions.sql
-- PostgreSQL & Supabase Compatible
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STUDENT_SOLVED_QUESTIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_solved_questions (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        gen_random_uuid(),
        uuid_generate_v4()
    ),
    uid TEXT NOT NULL,
    student_id UUID NULL REFERENCES students(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL,
    subject TEXT NULL,
    domain TEXT NULL,
    skill TEXT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    selected_answer TEXT NULL,
    time_spent_seconds INTEGER NOT NULL DEFAULT 0,
    solved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_solved_uid_qid UNIQUE(uid, question_id)
);

-- Migration safety for pre-existing tables
ALTER TABLE student_solved_questions ADD COLUMN IF NOT EXISTS uid TEXT;
ALTER TABLE student_solved_questions ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE student_solved_questions ADD COLUMN IF NOT EXISTS domain TEXT;
ALTER TABLE student_solved_questions ADD COLUMN IF NOT EXISTS skill TEXT;
ALTER TABLE student_solved_questions ADD COLUMN IF NOT EXISTS time_spent_seconds INTEGER NOT NULL DEFAULT 0;
ALTER TABLE student_solved_questions ALTER COLUMN student_id DROP NOT NULL;
UPDATE student_solved_questions SET uid = CAST(student_id AS TEXT) WHERE uid IS NULL AND student_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_solved_questions_uid_qid ON student_solved_questions(uid, question_id);

-- ------------------------------------------------------------------------------
-- INDEXES FOR FAST LOOKUP AND FILTERING
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_solved_questions_uid ON student_solved_questions(uid);
CREATE INDEX IF NOT EXISTS idx_solved_questions_qid ON student_solved_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_solved_questions_skill ON student_solved_questions(skill);
CREATE INDEX IF NOT EXISTS idx_solved_questions_solved_at ON student_solved_questions(solved_at DESC);
