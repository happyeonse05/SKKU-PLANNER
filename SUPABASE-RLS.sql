-- Today Gap Planner: user_data ownership hardening
-- Run once in Supabase SQL Editor after confirming user_data.user_id is UUID/text compatible with auth.uid().
alter table public.user_data enable row level security;

drop policy if exists "users can read own planner" on public.user_data;
drop policy if exists "users can insert own planner" on public.user_data;
drop policy if exists "users can update own planner" on public.user_data;
drop policy if exists "users can delete own planner" on public.user_data;

create policy "users can read own planner" on public.user_data for select using (auth.uid()::text = user_id::text);
create policy "users can insert own planner" on public.user_data for insert with check (auth.uid()::text = user_id::text);
create policy "users can update own planner" on public.user_data for update using (auth.uid()::text = user_id::text) with check (auth.uid()::text = user_id::text);
create policy "users can delete own planner" on public.user_data for delete using (auth.uid()::text = user_id::text);
