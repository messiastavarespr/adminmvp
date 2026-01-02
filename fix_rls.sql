-- Fix for RLS Recursion Issue

-- 1. Create a Secure Function to check Admin/Master role
-- This avoids the infinite recursion of checking public.users table from within a policy on public.users table.
CREATE OR REPLACE FUNCTION public.is_admin_or_master()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('MASTER', 'ADMIN')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. Drop the problematic recursive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;

-- 3. Re-create the policy using the secure function
CREATE POLICY "Admins can view all profiles" 
ON public.users FOR SELECT 
USING (
  public.is_admin_or_master()
);

-- 4. Ensure the basic "View Own" policy is also active (redundant but safe)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- 5. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin_or_master TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_master TO service_role;
