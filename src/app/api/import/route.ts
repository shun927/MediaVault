import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const importData = await request.json();

        // タグのインポート（upsert）
        if (importData.tags?.length) {
            for (const tag of importData.tags) {
                await supabase.from('tags').upsert({
                    id: tag.id,
                    user_id: user.id,
                    name: tag.name,
                    color: tag.color,
                    created_at: tag.created_at,
                }, { onConflict: 'id' });
            }
        }

        // 映画のインポート
        if (importData.movies?.length) {
            for (const movie of importData.movies) {
                await supabase.from('movies').upsert({
                    ...movie,
                    user_id: user.id,
                }, { onConflict: 'id' });
            }
        }

        // 本のインポート
        if (importData.books?.length) {
            for (const book of importData.books) {
                await supabase.from('books').upsert({
                    ...book,
                    user_id: user.id,
                }, { onConflict: 'id' });
            }
        }

        // 中間テーブル
        if (importData.movie_tags?.length) {
            await supabase.from('movie_tags').upsert(importData.movie_tags, { onConflict: 'movie_id,tag_id' });
        }
        if (importData.book_tags?.length) {
            await supabase.from('book_tags').upsert(importData.book_tags, { onConflict: 'book_id,tag_id' });
        }

        // 履歴
        if (importData.viewing_history?.length) {
            for (const h of importData.viewing_history) {
                await supabase.from('viewing_history').upsert({ ...h, user_id: user.id }, { onConflict: 'id' });
            }
        }
        if (importData.reading_history?.length) {
            for (const h of importData.reading_history) {
                await supabase.from('reading_history').upsert({ ...h, user_id: user.id }, { onConflict: 'id' });
            }
        }

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Invalid import data' }, { status: 400 });
    }
}
