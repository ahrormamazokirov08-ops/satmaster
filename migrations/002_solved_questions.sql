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
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    selected_answer TEXT NULL,
    solved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_student_question UNIQUE(student_id, question_id)
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR FAST LOOKUP AND FILTERING
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_solved_questions_student ON student_solved_questions(student_id);
CREATE INDEX IF NOT EXISTS idx_solved_questions_qid ON student_solved_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_solved_questions_solved_at ON student_solved_questions(solved_at DESC);
