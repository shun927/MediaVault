-- ============================================================
-- MediaVault: Music (Spotify) Migration
-- Run in Supabase SQL Editor after 002_tv.sql
-- ============================================================

create table if not exists music (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    spotify_id text,
    title text not null,
    artwork_url text,
    artist text,
    year integer,
    type text not null check (type in ('track', 'album')),
    rating integer check (rating between 0 and 5),
    status text not null default 'wishlist' check (status in ('listened', 'listening', 'wishlist')),
    note text,
    listened_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_music_user_id on music(user_id);
create index if not exists idx_music_status on music(status);
create index if not exists idx_music_created_at on music(created_at desc);

alter table music enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'music' and policyname = 'music_select_own'
    ) then
        create policy "music_select_own" on music
            for select using (auth.uid() = user_id);
    end if;
end $$;

create table if not exists music_tags (
    music_id uuid not null references music(id) on delete cascade,
    tag_id uuid not null references tags(id) on delete cascade,
    primary key (music_id, tag_id)
);

create index if not exists idx_music_tags_music_id on music_tags(music_id);
create index if not exists idx_music_tags_tag_id on music_tags(tag_id);

alter table music_tags enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'music_tags' and policyname = 'music_tags_select_own'
    ) then
        create policy "music_tags_select_own" on music_tags
            for select using (
                exists (
                    select 1 from music m
                    where m.id = music_tags.music_id and m.user_id = auth.uid()
                )
            );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'music_tags' and policyname = 'music_tags_insert_own'
    ) then
        create policy "music_tags_insert_own" on music_tags
            for insert with check (
                exists (
                    select 1 from music m
                    where m.id = music_tags.music_id and m.user_id = auth.uid()
                )
            );
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'music_tags' and policyname = 'music_tags_delete_own'
    ) then
        create policy "music_tags_delete_own" on music_tags
            for delete using (
                exists (
                    select 1 from music m
                    where m.id = music_tags.music_id and m.user_id = auth.uid()
                )
            );
    end if;
end $$;

create table if not exists listening_history (
    id uuid primary key default gen_random_uuid(),
    music_id uuid not null references music(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    listened_at timestamptz not null default now(),
    note text
);

create index if not exists idx_listening_history_music_id on listening_history(music_id);
create index if not exists idx_listening_history_user_id on listening_history(user_id);
create index if not exists idx_listening_history_listened_at on listening_history(listened_at desc);

alter table listening_history enable row level security;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'listening_history' and policyname = 'listening_history_select_own'
    ) then
        create policy "listening_history_select_own" on listening_history
            for select using (auth.uid() = user_id);
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'listening_history' and policyname = 'listening_history_insert_own'
    ) then
        create policy "listening_history_insert_own" on listening_history
            for insert with check (auth.uid() = user_id);
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'listening_history' and policyname = 'listening_history_update_own'
    ) then
        create policy "listening_history_update_own" on listening_history
            for update using (auth.uid() = user_id);
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'listening_history' and policyname = 'listening_history_delete_own'
    ) then
        create policy "listening_history_delete_own" on listening_history
            for delete using (auth.uid() = user_id);
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'music' and policyname = 'music_insert_own'
    ) then
        create policy "music_insert_own" on music
            for insert with check (auth.uid() = user_id);
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'music' and policyname = 'music_update_own'
    ) then
        create policy "music_update_own" on music
            for update using (auth.uid() = user_id);
    end if;
end $$;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'public' and tablename = 'music' and policyname = 'music_delete_own'
    ) then
        create policy "music_delete_own" on music
            for delete using (auth.uid() = user_id);
    end if;
end $$;
