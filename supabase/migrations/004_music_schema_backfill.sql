-- ============================================================
-- MediaVault: Music schema backfill for existing environments
-- Ensures music_tags / listening_history and RLS policies exist.
-- ============================================================

create table if not exists public.music_tags (
    music_id uuid not null references public.music(id) on delete cascade,
    tag_id uuid not null references public.tags(id) on delete cascade,
    primary key (music_id, tag_id)
);

create index if not exists idx_music_tags_music_id on public.music_tags(music_id);
create index if not exists idx_music_tags_tag_id on public.music_tags(tag_id);

alter table public.music_tags enable row level security;

drop policy if exists "music_tags_select_own" on public.music_tags;
drop policy if exists "music_tags_insert_own" on public.music_tags;
drop policy if exists "music_tags_delete_own" on public.music_tags;
drop policy if exists "Users can manage own music_tags" on public.music_tags;

create policy "Users can manage own music_tags"
    on public.music_tags
    for all
    using (
        exists (
            select 1
            from public.music m
            where m.id = music_id
              and m.user_id = auth.uid()
        )
    )
    with check (
        exists (
            select 1
            from public.music m
            where m.id = music_id
              and m.user_id = auth.uid()
        )
    );

create table if not exists public.listening_history (
    id uuid primary key default gen_random_uuid(),
    music_id uuid not null references public.music(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    listened_at timestamptz not null default now(),
    note text
);

create index if not exists idx_listening_history_music_id on public.listening_history(music_id);
create index if not exists idx_listening_history_user_id on public.listening_history(user_id);
create index if not exists idx_listening_history_listened_at on public.listening_history(listened_at desc);

alter table public.listening_history enable row level security;

drop policy if exists "listening_history_select_own" on public.listening_history;
drop policy if exists "listening_history_insert_own" on public.listening_history;
drop policy if exists "listening_history_update_own" on public.listening_history;
drop policy if exists "listening_history_delete_own" on public.listening_history;
drop policy if exists "Users can manage own listening_history" on public.listening_history;

create policy "Users can manage own listening_history"
    on public.listening_history
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

