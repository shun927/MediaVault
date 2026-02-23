import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [movies, books, music, tags, movieTags, bookTags, musicTags, viewHist, readHist, listenHist] = await Promise.all([
        supabase.from('movies').select('*').eq('user_id', user.id),
        supabase.from('books').select('*').eq('user_id', user.id),
        supabase.from('music').select('*').eq('user_id', user.id),
        supabase.from('tags').select('*').eq('user_id', user.id),
        supabase.from('movie_tags').select('*'),
        supabase.from('book_tags').select('*'),
        supabase.from('music_tags').select('*'),
        supabase.from('viewing_history').select('*').eq('user_id', user.id),
        supabase.from('reading_history').select('*').eq('user_id', user.id),
        supabase.from('listening_history').select('*').eq('user_id', user.id),
    ]);

    const exportData = {
        version: '1.0',
        exported_at: new Date().toISOString(),
        movies: movies.data || [],
        books: books.data || [],
        music: music.data || [],
        tags: tags.data || [],
        movie_tags: movieTags.data || [],
        book_tags: bookTags.data || [],
        music_tags: musicTags.data || [],
        viewing_history: viewHist.data || [],
        reading_history: readHist.data || [],
        listening_history: listenHist.data || [],
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="mediavault-export-${new Date().toISOString().substr(0, 10)}.json"`,
        },
    });
}
