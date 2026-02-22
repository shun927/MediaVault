-- ============================================================
-- MediaVault Phase 1 — Supabase Migration
-- ============================================================

-- 1. profiles テーブル
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- auth.users の新規作成時に profiles を自動作成するトリガー
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. tags テーブル
create table if not exists public.tags (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  color text default '#6366f1' not null,
  created_at timestamptz default now() not null
);

alter table public.tags enable row level security;

create policy "Users can manage own tags"
  on public.tags for all using (auth.uid() = user_id);

create unique index tags_user_name_idx on public.tags (user_id, name);

-- 3. movies テーブル
create table if not exists public.movies (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  tmdb_id integer,
  title text not null,
  poster_url text,
  director text,
  year integer,
  overview text,
  rating integer check (rating >= 0 and rating <= 5),
  status text default 'wishlist' check (status in ('watched', 'watching', 'wishlist')),
  note text,
  watched_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.movies enable row level security;

create policy "Users can manage own movies"
  on public.movies for all using (auth.uid() = user_id);

-- 4. books テーブル
create table if not exists public.books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  google_books_id text,
  title text not null,
  cover_url text,
  author text,
  year integer,
  description text,
  rating integer check (rating >= 0 and rating <= 5),
  status text default 'wishlist' check (status in ('read', 'reading', 'wishlist')),
  note text,
  read_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.books enable row level security;

create policy "Users can manage own books"
  on public.books for all using (auth.uid() = user_id);

-- 5. music テーブル（Phase 2 向け先行定義）
create table if not exists public.music (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  spotify_id text,
  title text not null,
  artwork_url text,
  artist text,
  year integer,
  type text default 'track' check (type in ('track', 'album')),
  rating integer check (rating >= 0 and rating <= 5),
  status text default 'wishlist' check (status in ('listened', 'listening', 'wishlist')),
  note text,
  listened_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.music enable row level security;

create policy "Users can manage own music"
  on public.music for all using (auth.uid() = user_id);

-- 6. movie_tags 中間テーブル
create table if not exists public.movie_tags (
  movie_id uuid references public.movies on delete cascade not null,
  tag_id uuid references public.tags on delete cascade not null,
  primary key (movie_id, tag_id)
);

alter table public.movie_tags enable row level security;

create policy "Users can manage own movie_tags"
  on public.movie_tags for all
  using (
    exists (select 1 from public.movies where id = movie_id and user_id = auth.uid())
  );

-- 7. book_tags 中間テーブル
create table if not exists public.book_tags (
  book_id uuid references public.books on delete cascade not null,
  tag_id uuid references public.tags on delete cascade not null,
  primary key (book_id, tag_id)
);

alter table public.book_tags enable row level security;

create policy "Users can manage own book_tags"
  on public.book_tags for all
  using (
    exists (select 1 from public.books where id = book_id and user_id = auth.uid())
  );

-- 8. viewing_history（再鑑賞ログ）
create table if not exists public.viewing_history (
  id uuid default gen_random_uuid() primary key,
  movie_id uuid references public.movies on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  watched_at timestamptz default now() not null,
  note text
);

alter table public.viewing_history enable row level security;

create policy "Users can manage own viewing_history"
  on public.viewing_history for all using (auth.uid() = user_id);

-- 9. reading_history（再読ログ）
create table if not exists public.reading_history (
  id uuid default gen_random_uuid() primary key,
  book_id uuid references public.books on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  read_at timestamptz default now() not null,
  note text
);

alter table public.reading_history enable row level security;

create policy "Users can manage own reading_history"
  on public.reading_history for all using (auth.uid() = user_id);
