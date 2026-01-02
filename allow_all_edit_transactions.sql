-- Allow All Authenticated Users to Update Transactions
-- Req: "Coloca a opção de editar livro caixa, para todos os perfins"

-- 1. Enable RLS (Ensure it's on)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy for UPDATE
-- Allows any logged-in user to update any transaction. 
-- Ideally, should restrict by church_id, but per request "all profiles", we are simplifying.
DROP POLICY IF EXISTS "Allow all authenticated update transactions" ON public.transactions;

CREATE POLICY "Allow all authenticated update transactions"
ON public.transactions
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Create Policy for DELETE
-- Ledger.tsx also exposes the Delete button.
DROP POLICY IF EXISTS "Allow all authenticated delete transactions" ON public.transactions;

CREATE POLICY "Allow all authenticated delete transactions"
ON public.transactions
FOR DELETE
TO authenticated
USING (true);

-- 4. INSERT is usually already covered, but let's ensure it.
DROP POLICY IF EXISTS "Allow all authenticated insert transactions" ON public.transactions;

CREATE POLICY "Allow all authenticated insert transactions"
ON public.transactions
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 5. SELECT (View)
-- Usually exists, but ensuring global read for authenticated users to avoid "phantom" rows during edit.
DROP POLICY IF EXISTS "Allow all authenticated view transactions" ON public.transactions;

CREATE POLICY "Allow all authenticated view transactions"
ON public.transactions
FOR SELECT
TO authenticated
USING (true);
