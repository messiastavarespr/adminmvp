-- Clean Slate: Delete Master User (FIXED dependencies)

-- 1. Delete Audit Logs for this user first (Foreign Key Fix)
DELETE FROM public.audit_logs 
WHERE user_id IN (SELECT id FROM public.users WHERE email = 'msig12@gmail.com');

-- 2. Delete from public.users
DELETE FROM public.users WHERE email = 'msig12@gmail.com';

-- 3. Delete from auth.users
DELETE FROM auth.users WHERE email = 'msig12@gmail.com';
