-- NUCLEAR RLS FIX (Emergency Unblock)
-- Resolves "Infinite Loading" by removing ALL recursive logic.
-- Instead of checking the 'users' table for admin status, we check the Email explicitly in the JWT.

-- 1. Disable RLS to apply changes smoothly
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. Drop potential problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.users;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.users;
-- Also drop the V2 function to be sure
DROP FUNCTION IF EXISTS public.is_admin_or_master();

-- 3. Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 4. Create "Hardcoded" Master Policy (ZERO Recursion Risk)
-- This allows msig12@gmail.com to do EVERYTHING on public.users
CREATE POLICY "Master Absolute Access" 
ON public.users 
TO authenticated 
USING (
  auth.jwt() ->> 'email' = 'msig12@gmail.com'
)
WITH CHECK (
  auth.jwt() ->> 'email' = 'msig12@gmail.com'
);

-- 5. Standard User Policy (See Own Profile)
CREATE POLICY "Users Correct Own Profile" 
ON public.users 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Allow Insert (Bootstrap)
CREATE POLICY "Allow Self Insert" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);
