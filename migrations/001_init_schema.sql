-- ==============================================================================
-- SATMaster Relational Database Schema Migration: 001_init_schema.sql
-- PostgreSQL & Supabase Compatible
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. GROUPS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        gen_random_uuid(),
        uuid_generate_v4()
    ),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. STUDENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        gen_random_uuid(),
        uuid_generate_v4()
    ),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    telegram_id BIGINT NOT NULL UNIQUE,
    telegram_username VARCHAR(255) NULL,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. TEST_RESULTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT COALESCE(
        gen_random_uuid(),
        uuid_generate_v4()
    ),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    total_score INT NOT NULL,
    rw_score INT NOT NULL,
    math_score INT NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR STRICT RELATIONAL ISOLATION & QUERY PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_group_id ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_students_telegram_id ON students(telegram_id);
CREATE INDEX IF NOT EXISTS idx_test_results_student_id ON test_results(student_id);
CREATE INDEX IF NOT EXISTS idx_test_results_group_id ON test_results(group_id);
CREATE INDEX IF NOT EXISTS idx_test_results_completed_at ON test_results(completed_at DESC);
