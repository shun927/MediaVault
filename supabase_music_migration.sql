-- ============================================================
-- MediaVault: Music (Spotify) 対応 マイグレーション
-- Supabase SQL Editor で実行してください
-- ============================================================

CREATE TABLE IF NOT EXISTS music (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    spotify_id TEXT,
    title TEXT NOT NULL,
    artwork_url TEXT,
    artist TEXT,
    year INTEGER,
    type TEXT NOT NULL CHECK (type IN ('track', 'album')),
    rating INTEGER CHECK (rating BETWEEN 0 AND 5),
    status TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN ('listened', 'listening', 'wishlist')),
    note TEXT,
    listened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_music_user_id ON music(user_id);
CREATE INDEX IF NOT EXISTS idx_music_status ON music(status);
CREATE INDEX IF NOT EXISTS idx_music_created_at ON music(created_at DESC);

ALTER TABLE music ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'music' AND policyname = 'music_select_own'
    ) THEN
        CREATE POLICY "music_select_own" ON music
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- music_tags (music <-> tags)
CREATE TABLE IF NOT EXISTS music_tags (
    music_id UUID NOT NULL REFERENCES music(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (music_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_music_tags_music_id ON music_tags(music_id);
CREATE INDEX IF NOT EXISTS idx_music_tags_tag_id ON music_tags(tag_id);

ALTER TABLE music_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'music_tags' AND policyname = 'music_tags_select_own'
    ) THEN
        CREATE POLICY "music_tags_select_own" ON music_tags
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM music m
                    WHERE m.id = music_tags.music_id AND m.user_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'music_tags' AND policyname = 'music_tags_insert_own'
    ) THEN
        CREATE POLICY "music_tags_insert_own" ON music_tags
            FOR INSERT WITH CHECK (
                EXISTS (
                    SELECT 1 FROM music m
                    WHERE m.id = music_tags.music_id AND m.user_id = auth.uid()
                )
            );
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'music_tags' AND policyname = 'music_tags_delete_own'
    ) THEN
        CREATE POLICY "music_tags_delete_own" ON music_tags
            FOR DELETE USING (
                EXISTS (
                    SELECT 1 FROM music m
                    WHERE m.id = music_tags.music_id AND m.user_id = auth.uid()
                )
            );
    END IF;
END $$;

-- listening_history
CREATE TABLE IF NOT EXISTS listening_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    music_id UUID NOT NULL REFERENCES music(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    listened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    note TEXT
);

CREATE INDEX IF NOT EXISTS idx_listening_history_music_id ON listening_history(music_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_user_id ON listening_history(user_id);
CREATE INDEX IF NOT EXISTS idx_listening_history_listened_at ON listening_history(listened_at DESC);

ALTER TABLE listening_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'listening_history' AND policyname = 'listening_history_select_own'
    ) THEN
        CREATE POLICY "listening_history_select_own" ON listening_history
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'listening_history' AND policyname = 'listening_history_insert_own'
    ) THEN
        CREATE POLICY "listening_history_insert_own" ON listening_history
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'listening_history' AND policyname = 'listening_history_update_own'
    ) THEN
        CREATE POLICY "listening_history_update_own" ON listening_history
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'listening_history' AND policyname = 'listening_history_delete_own'
    ) THEN
        CREATE POLICY "listening_history_delete_own" ON listening_history
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'music' AND policyname = 'music_insert_own'
    ) THEN
        CREATE POLICY "music_insert_own" ON music
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'music' AND policyname = 'music_update_own'
    ) THEN
        CREATE POLICY "music_update_own" ON music
            FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'music' AND policyname = 'music_delete_own'
    ) THEN
        CREATE POLICY "music_delete_own" ON music
            FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;
