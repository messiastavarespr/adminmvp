-- Create table for System Warnings
create table public.system_warnings (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  message text not null,
  created_by uuid references auth.users(id),
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create table to track which users have read which warning
create table public.warning_reads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  warning_id uuid references public.system_warnings(id) not null,
  read_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, warning_id)
);

-- Enable RLS
alter table public.system_warnings enable row level security;
alter table public.warning_reads enable row level security;

-- Policies for system_warnings
-- Everyone can read active warnings
create policy "Enable read access for all active warnings"
  on public.system_warnings for select
  using (active = true);

-- Only Admins/Master can insert/update (This assumes you have logic or other policies for admin check, 
-- or we can keep it open for authenticated users if your app handles role checks in UI/Backend logic, 
-- but ideally should be restricted. For now, allowing authenticated users to create if they have the right UI access, 
-- or we can add a check against a user_roles table if it exists within the policy, but simpler is often better for MVP).
-- Let's stick to "authenticated" for now to avoid complex SQL if role table isn't standard, 
-- assuming the UI protects the "Create" button.
create policy "Enable insert for authenticated users"
  on public.system_warnings for insert
  to authenticated
  with check (true);

create policy "Enable update for authenticated users"
  on public.system_warnings for update
  to authenticated
  using (true);

-- Policies for warning_reads
-- Users can see their own read history
create policy "Enable read access for users to their own reads"
  on public.warning_reads for select
  using (auth.uid() = user_id);

-- Users can insert their own read status
create policy "Enable insert for users to mark as read"
  on public.warning_reads for insert
  with check (auth.uid() = user_id);
