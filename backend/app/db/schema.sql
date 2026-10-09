-- ==============================================================================
-- FertiFlow AI - Complete Supabase PostgreSQL Schema
-- Run this script in the Supabase SQL Editor (Dashboard > SQL Editor > New Query)
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Custom ENUM Types
DO $$ BEGIN
    CREATE TYPE cycle_stage AS ENUM (
        'enquiry',
        'consultation',
        'investigation',
        'diagnosis',
        'treatment_decision',
        'iui_prep',
        'ivf_stimulation',
        'egg_retrieval',
        'embryo_transfer',
        'post_transfer',
        'beta_hcg',
        'outcome'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cycle_status AS ENUM (
        'active',
        'completed',
        'paused',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE followup_type AS ENUM (
        'appointment',
        'investigation',
        'medication',
        'procedure_prep',
        'pregnancy_test',
        'financial',
        'support',
        'counselling'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE followup_status AS ENUM (
        'pending',
        'scheduled',
        'sent',
        'retry',
        'reschedule_requested',
        'slot_offered',
        'rescheduled',
        'escalated',
        'completed',
        'missed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create Tables

-- Table: patients
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'ta', -- 'ta' (Tamil) or 'en' (English)
    district VARCHAR(100) NOT NULL DEFAULT 'Chennai',
    privacy_mode BOOLEAN NOT NULL DEFAULT FALSE,
    consent_status BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: cycles
CREATE TABLE IF NOT EXISTS cycles (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    stage cycle_stage NOT NULL DEFAULT 'enquiry',
    protocol VARCHAR(255),
    status cycle_status NOT NULL DEFAULT 'active',
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: followups
CREATE TABLE IF NOT EXISTS followups (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    patient_id VARCHAR(36) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    cycle_id VARCHAR(36) REFERENCES cycles(id) ON DELETE SET NULL,
    type followup_type NOT NULL DEFAULT 'appointment',
    due_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status followup_status NOT NULL DEFAULT 'pending',
    priority_score INTEGER NOT NULL DEFAULT 1 CHECK (priority_score >= 1 AND priority_score <= 100),
    missed_reason TEXT,
    ai_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Table: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    changed_by VARCHAR(100) NOT NULL DEFAULT 'system',
    changes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Create Indexes for High Performance Querying
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_district ON patients(district);
CREATE INDEX IF NOT EXISTS idx_patients_language ON patients(language);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cycles_patient_id ON cycles(patient_id);
CREATE INDEX IF NOT EXISTS idx_cycles_stage ON cycles(stage);
CREATE INDEX IF NOT EXISTS idx_cycles_status ON cycles(status);

CREATE INDEX IF NOT EXISTS idx_followups_patient_id ON followups(patient_id);
CREATE INDEX IF NOT EXISTS idx_followups_cycle_id ON followups(cycle_id);
CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
CREATE INDEX IF NOT EXISTS idx_followups_priority ON followups(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_followups_due_date ON followups(due_date ASC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 5. Enable Supabase Realtime for instant live queue synchronization
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE patients;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE cycles;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE followups;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. Grant Permissions (Optional / Default Public Access)
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
