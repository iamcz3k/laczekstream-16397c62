
create table if not exists public.match_chats (
  id uuid primary key default gen_random_uuid(),
  match_id text not null,
  name text not null check (char_length(name) between 1 and 40),
  message text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists match_chats_match_idx on public.match_chats (match_id, created_at);
alter table public.match_chats enable row level security;
create policy "Anyone can read match chat" on public.match_chats for select using (true);
create policy "Anyone can post match chat" on public.match_chats for insert with check (true);
alter publication supabase_realtime add table public.match_chats;
