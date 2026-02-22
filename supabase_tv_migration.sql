-- ============================================================
-- MediaVault: TV/アニメ対応 マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

-- 1. movies テーブルにカラム追加
ALTER TABLE movies ADD COLUMN IF NOT EXISTS media_type VARCHAR(10) DEFAULT 'movie';
ALTER TABLE movies ADD COLUMN IF NOT EXISTS number_of_seasons INTEGER;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS number_of_episodes INTEGER;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS watched_episode INTEGER;

-- 2. 既存データを 'movie' に設定
UPDATE movies SET media_type = 'movie' WHERE media_type IS NULL;

-- 3. media_type を NOT NULL 制約に変更
ALTER TABLE movies ALTER COLUMN media_type SET NOT NULL;
