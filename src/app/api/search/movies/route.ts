import { NextRequest, NextResponse } from 'next/server';
import { authenticateSearchRequest, forbidden, upstreamSignal } from '@/lib/auth';

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
    let env;
    try { ({ env } = await authenticateSearchRequest(request, 'movies')); } catch (error) {
        if (error instanceof Error && error.message === 'Rate limit exceeded') return NextResponse.json({ error: error.message }, { status: 429 });
        return forbidden(error);
    }
    const query = request.nextUrl.searchParams.get('q')?.trim();
    if (!query) return NextResponse.json({ results: [] });
    if (query.length > 200) return NextResponse.json({ error: 'Query is too long' }, { status: 400 });

    const apiKey = env.TMDB_API_KEY;
    if (!apiKey) return NextResponse.json({ results: [], error: 'TMDB API key not configured' });

    try {
        const res = await fetch(
            `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=ja-JP&page=1`,
            { cache: 'no-store', signal: upstreamSignal(request) }
        );
        if (!res.ok) return NextResponse.json({ results: [], error: 'TMDB upstream error' }, { status: 502 });
        const data = await res.json() as { results?: TMDBRawResult[] };

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
