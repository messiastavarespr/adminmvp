-- Migration: Add 'category' column to 'members' table
-- Reason: Fixes "Could not find the 'category' column of 'members' in the schema cache" error.

ALTER TABLE public.members 
ADD COLUMN IF NOT EXISTS category text;

COMMENT ON COLUMN public.members.category IS 'Categoria do membro (ex: Membro Comungante, Congregado, etc.)';
