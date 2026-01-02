-- Manually confirm the Master User
-- Run this to bypass email verification for the master account

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'msig12@gmail.com';
