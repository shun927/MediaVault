import { NextRequest, NextResponse } from 'next/server';

interface TMDBRawResult {
    id: number;
    media_type: string;
    // movie fields
    title?: string;
    release_date?: string;
    // tv fields
    name?: string;
    first_air_date?: string;
    // shared
    poster_path: string | null;
    overview?: string;
    number_of_seasons?: number;
    number_of_episodes?: number;
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    if (!query) return NextResponse.json({ results: [] });

    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return NextResponse.json({ results: [], error: 'TMDB API key not configured' });

    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=ja-JP&page=1`,
            { next: { revalidate: 300 } }
        );
        const data = await res.json();

        // movie と tv のみをフィルタリングし、正規化
        const results = ((data.results || []) as TMDBRawResult[])
            .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
            .map((item) => ({
                id: item.id,
                media_type: item.media_type as 'movie' | 'tv',
                title: item.media_type === 'movie' ? (item.title || '') : (item.name || ''),
                poster_path: item.poster_path,
                release_date: item.media_type === 'movie'
                    ? (item.release_date || '')
                    : (item.first_air_date || ''),
                overview: item.overview || '',
                number_of_seasons: item.number_of_seasons,
                number_of_episodes: item.number_of_episodes,
            }));

        return NextResponse.json({ results });
    } catch {
        return NextResponse.json({ results: [], error: 'Failed to fetch from TMDB' }, { status: 500 });
    }
}
