-- FIX RLS Recursion V2 (Force Replace)

-- 1. Disable RLS temporarily to unblock
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to clean up
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- 3. Drop the function if exists and recreate
DROP FUNCTION IF EXISTS public.is_admin_or_master();

CREATE OR REPLACE FUNCTION public.is_admin_or_master()
RETURNS boolean AS $$
BEGIN
  -- Direct check with COUNT to avoid returning rows
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 
-- SECURITY DEFINER means it runs as the creator (postgres/monitor), bypassing RLS.

-- 4. Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Create Simplified Policies

-- A. Users can view/edit their own profile
CREATE POLICY "Users can manage own profile" 
ON public.users 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- B. Admins/Master can VIEW ALL
CREATE POLICY "Admins can view all profiles" 
ON public.users FOR SELECT 
USING (
  public.is_admin_or_master()
);

-- C. Admins/Master can UPDATE ALL
CREATE POLICY "Admins can update all profiles" 
ON public.users FOR UPDATE
USING (
  public.is_admin_or_master()
);

-- D. Admins/Master can DELETE ALL
CREATE POLICY "Admins can delete all profiles" 
ON public.users FOR DELETE
USING (
  public.is_admin_or_master()
);

-- 6. Insert Policy (Bootstrap)
CREATE POLICY "Allow Insert for Auth User" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 7. Grant permissions
GRANT EXECUTE ON FUNCTION public.is_admin_or_master TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_master TO service_role;
