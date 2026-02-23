-- ============================================================
-- MediaVault: TV/Anime Migration
-- Run in Supabase SQL Editor after 001_base.sql
-- ============================================================

-- 1. Add columns to movies
alter table movies add column if not exists media_type varchar(10) default 'movie';
alter table movies add column if not exists number_of_seasons integer;
alter table movies add column if not exists number_of_episodes integer;
alter table movies add column if not exists watched_episode integer;

-- 2. Backfill existing rows
update movies set media_type = 'movie' where media_type is null;

-- 3. Enforce NOT NULL
alter table movies alter column media_type set not null;
