-- Migration to add target_user_id to system_warnings and update policies

-- 1. Add column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='system_warnings' AND column_name='target_user_id') THEN
    ALTER TABLE public.system_warnings ADD COLUMN target_user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Update RLS policies to respect target_user_id
-- Drop existing select policy
DROP POLICY IF EXISTS "Enable read access for all active warnings" ON public.system_warnings;

-- Re-create select policy with target_user_id check
CREATE POLICY "Enable read access for all active warnings" 
  ON public.system_warnings FOR SELECT 
  USING (
    active = true AND (target_user_id IS NULL OR target_user_id = auth.uid())
  );
