-- Add avatar_url column to users table if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Optional: Add photo_url to members if missing (based on types.ts Member interface having photoUrl)
ALTER TABLE public.members
ADD COLUMN IF NOT EXISTS photo_url text;
