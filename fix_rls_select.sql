-- Fix RLS Policy failure for seeing own read warnings
-- The previous policy required auth.uid() = user_id.
-- Since we fixed INSERT to be permissive, we must fix SELECT too.

DROP POLICY IF EXISTS "Enable read access for users to their own reads" ON public.warning_reads;

CREATE POLICY "Enable read access for authenticated users"
  ON public.warning_reads FOR SELECT
  TO authenticated
  USING (true);
