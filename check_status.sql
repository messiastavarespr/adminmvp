-- Check User Status
SELECT 
    au.id as auth_id, 
    au.email as auth_email, 
    au.email_confirmed_at,
    pu.id as public_id,
    pu.name as public_name
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.email = 'msig12@gmail.com';
