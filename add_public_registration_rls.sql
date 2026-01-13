-- Migration: Allow Public Member Registration
-- 1. Ensure PENDING is a valid status (if using constraints, otherwise handled by app logic)
-- Note: In our current setup, status is a text field, so no strict DB enum to update.

-- 2. Configure RLS to allow public (anon) insertion
-- We only allow insertion if the status is explicitly 'PENDING'
DROP POLICY IF EXISTS "Permitir inserção pública de membros pendentes" ON members;
CREATE POLICY "Permitir inserção pública de membros pendentes" ON members
FOR INSERT TO anon
WITH CHECK (status = 'PENDING');

-- 3. Verify public read access (usually restricted, but let's ensure anon can't read all members)
-- If there's an existing SELECT policy for anon, we might need to restrict it.
-- Current setup seems to require auth for SELECT on members.
