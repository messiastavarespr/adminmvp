-- Comprehensive RLS Fix for Master User
-- Apply "Master Absolute Access" to all key tables

-- 1. Helper Macro (Conceptual) - We will just repeat the policy for safety and clarity

-- Define Tables to Fix
-- users (Already done, but safer to reassert?) Skip users to avoid conflict with emergency fix.
-- Tables: accounting_accounts, categories, transactions, cost_centers, funds, churches, audit_logs, members, scheduled_transactions

-- ACCOUNTING ACCOUNTS
ALTER TABLE public.accounting_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access accounting_accounts" ON public.accounting_accounts;
CREATE POLICY "Master Access accounting_accounts" ON public.accounting_accounts
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access categories" ON public.categories;
CREATE POLICY "Master Access categories" ON public.categories
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- TRANSACTIONS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access transactions" ON public.transactions;
CREATE POLICY "Master Access transactions" ON public.transactions
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- COST CENTERS
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access cost_centers" ON public.cost_centers;
CREATE POLICY "Master Access cost_centers" ON public.cost_centers
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- FUNDS
ALTER TABLE public.funds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access funds" ON public.funds;
CREATE POLICY "Master Access funds" ON public.funds
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- CHURCHES
ALTER TABLE public.churches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access churches" ON public.churches;
CREATE POLICY "Master Access churches" ON public.churches
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access audit_logs" ON public.audit_logs;
CREATE POLICY "Master Access audit_logs" ON public.audit_logs
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- MEMBERS
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access members" ON public.members;
CREATE POLICY "Master Access members" ON public.members
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- SCHEDULED TRANSACTIONS
ALTER TABLE public.scheduled_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access scheduled_transactions" ON public.scheduled_transactions;
CREATE POLICY "Master Access scheduled_transactions" ON public.scheduled_transactions
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- ASSET CATEGORIES
ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access asset_categories" ON public.asset_categories;
CREATE POLICY "Master Access asset_categories" ON public.asset_categories
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- ASSETS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Master Access assets" ON public.assets;
CREATE POLICY "Master Access assets" ON public.assets
TO authenticated USING (auth.jwt() ->> 'email' = 'msig12@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'msig12@gmail.com');

-- ACCOUNTING ACCOUNTS (Again just to be sure if missed above)
-- (Already at top)

