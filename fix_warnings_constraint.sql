-- Remove strict Foreign Key constraints to allow custom/legacy user IDs
-- This fixes the "insert or update on table violates foreign key constraint" error

-- 1. Remove constraint from system_warnings (created_by)
ALTER TABLE public.system_warnings 
DROP CONSTRAINT IF EXISTS system_warnings_created_by_fkey;

-- 2. Remove constraint from warning_reads (user_id)
-- We do this too because it will likely fail for the same reason when a user tries to click "Eu li e entendi"
ALTER TABLE public.warning_reads 
DROP CONSTRAINT IF EXISTS warning_reads_user_id_fkey;
