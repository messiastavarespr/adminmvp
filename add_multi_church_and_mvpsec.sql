-- Add allowed_churches and access_mvp_sec columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS allowed_churches text[] DEFAULT '{}';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS access_mvp_sec boolean DEFAULT false;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS access_mvp_fin boolean DEFAULT true;
