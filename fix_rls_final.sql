-- "NUCLEAR" FIX: Reset ALL policies for system_warnings
-- This script drops all existing policies and recreates them from scratch to ensure no conflicts exist.

-- 1. Temporarily disable security to ensure clean slate
ALTER TABLE public.system_warnings DISABLE ROW LEVEL SECURITY;

-- 2. Drop any and all potential existing policies
DROP POLICY IF EXISTS "Enable read access for all active warnings" ON public.system_warnings;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.system_warnings;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.system_warnings;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.system_warnings;
-- Also drop the ones we just created in previous attempted fixes
DROP POLICY IF EXISTS "policy_allow_select_active" ON public.system_warnings;
DROP POLICY IF EXISTS "policy_allow_select_all_auth" ON public.system_warnings;
DROP POLICY IF EXISTS "policy_allow_insert_auth" ON public.system_warnings;
DROP POLICY IF EXISTS "policy_allow_update_auth" ON public.system_warnings;
DROP POLICY IF EXISTS "policy_allow_delete_auth" ON public.system_warnings;


-- 3. Re-enable Security
ALTER TABLE public.system_warnings ENABLE ROW LEVEL SECURITY;

-- 4. Create NEW, Clear Policies

-- READ: Everyone (including anon) can see ACTIVE warnings
CREATE POLICY "allow_public_read_active"
  ON public.system_warnings FOR SELECT
  USING (active = true);

-- READ: Authenticated users (admis) can see ALL warnings (active or not)
CREATE POLICY "allow_auth_read_all"
  ON public.system_warnings FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Authenticated users can create
CREATE POLICY "allow_auth_insert"
  ON public.system_warnings FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: Authenticated users can edit (deactivate)
CREATE POLICY "allow_auth_update"
  ON public.system_warnings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE: Authenticated users can delete
CREATE POLICY "allow_auth_delete"
  ON public.system_warnings FOR DELETE
  TO authenticated
  USING (true);
