-- Migration: Add Secretariat Fields to Members Table

-- 1. Add Personal Data Columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS nationality TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS naturalness TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS profession TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS education_level TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS father_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS mother_name TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS document_issuer TEXT;

-- 2. Add Ecclesiastical Data Columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS conversion_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS baptism_holy_spirit BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS previous_church TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS entry_method TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS exit_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS exit_reason TEXT;

-- 3. Add Family Data Columns
ALTER TABLE members ADD COLUMN IF NOT EXISTS spouse_id UUID REFERENCES members(id);
ALTER TABLE members ADD COLUMN IF NOT EXISTS wedding_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS children TEXT; -- Storing as JSON or Text for MVP

-- Instructions: Run this script in your Supabase SQL Editor.
