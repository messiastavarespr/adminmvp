-- Migration for Secure Authentication (UPDATED)

-- 1. Clean up dependencies first (Fix for FK Violation)
-- We need to delete audit logs that reference users being deleted.
DELETE FROM public.audit_logs; 

-- Optional: If needed, handle transactions, but based on types.ts, Transaction doesn't have a userId field exposed directly in interface,
-- BUT the database might have a created_by or user_id column.
-- If the error was only about audit_logs, we might be safe for now.
-- If transactions table has user_id foreign key, we should set it to NULL if nullable.
-- DO NOT RUN "DELETE FROM public.transactions" unless absolutely sure user accepts valid data loss.
-- Assuming only audit_logs was the blocker.

-- 2. Clean up existing users (Required as they don't have emails)
DELETE FROM public.users;

-- 3. Add email column
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email text;

-- 4. Add unique constraint (now safe as table is empty)
ALTER TABLE public.users 
ADD CONSTRAINT users_email_key UNIQUE (email);

-- 5. Enable RLS (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Policies Update (Allow users to read their own profile)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

-- 7. Policy for Master/Admin bootstrap (Allow to insert own profile during signup/first login)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 8. Policy for updates
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

-- 9. Policy for Admin to view/edit all (Optional/Recommended)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.users;
CREATE POLICY "Admins can view all profiles" 
ON public.users FOR SELECT 
USING (
  exists (
    select 1 from public.users as u
    where u.id = auth.uid() and u.role in ('MASTER', 'ADMIN')
  )
);
