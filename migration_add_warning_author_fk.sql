-- Migration to add explicit foreign key for JOIN support in Supabase
-- This allows: .select('*, users:public.users(name)')

-- 1. Ensure the constraint doesn't already exist (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'system_warnings_created_by_profile_fkey'
    ) THEN
        ALTER TABLE public.system_warnings
        ADD CONSTRAINT system_warnings_created_by_profile_fkey
        FOREIGN KEY (created_by) REFERENCES public.users(id);
    END IF;
END $$;
