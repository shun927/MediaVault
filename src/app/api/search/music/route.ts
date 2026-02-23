import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const SPOTIFY_SEARCH_ENDPOINT = 'https://api.spotify.com/v1/search';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

interface SpotifyArtist {
    name: string;
}

interface SpotifyImage {
    url: string;
}

interface SpotifyExternalUrls {
    spotify?: string;
}

interface SpotifyAlbum {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    release_date: string;
    images: SpotifyImage[];
    external_urls?: SpotifyExternalUrls;
}

interface SpotifyTrack {
    id: string;
    name: string;
    artists: SpotifyArtist[];
    album?: {
        name: string;
        release_date: string;
        images: SpotifyImage[];
    };
    external_urls?: SpotifyExternalUrls;
}

interface SpotifySearchResponse {
    tracks?: { items?: SpotifyTrack[] };
    albums?: { items?: SpotifyAlbum[] };
}

async function getSpotifyAccessToken(clientId: string, clientSecret: string) {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now + 60_000) {
        return cachedToken.accessToken;
    }

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const res = await fetch(SPOTIFY_TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
        cache: 'no-store',
    });

    if (!res.ok) {
        throw new Error(`Spotify token error: ${res.status}`);
    }

    const data = await res.json();
    const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
    cachedToken = {
        accessToken: data.access_token,
        expiresAt: now + expiresIn * 1000,
    };
    return data.access_token as string;
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    if (!query) return NextResponse.json({ items: [] });

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        return NextResponse.json({ items: [], error: 'Spotify credentials not configured' });
    }

    try {
        const accessToken = await getSpotifyAccessToken(clientId, clientSecret);
        const market = process.env.SPOTIFY_MARKET || 'JP';
        const params = new URLSearchParams({
            q: query,
            type: 'track,album',
            market,
            limit: '12',
        });

        const res = await fetch(`${SPOTIFY_SEARCH_ENDPOINT}?${params}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
        });

        if (!res.ok) {
            return NextResponse.json({ items: [], error: `Spotify API error: ${res.status}` }, { status: res.status });
        }

        const data = (await res.json()) as SpotifySearchResponse;
        const tracks = (data?.tracks?.items || []).map((track) => ({
            id: track.id as string,
            type: 'track' as const,
            title: track.name as string,
            artist: track.artists?.[0]?.name || null,
            albumName: track.album?.name || null,
            releaseDate: track.album?.release_date || null,
            image: track.album?.images?.[0]?.url || null,
            spotifyUrl: track.external_urls?.spotify || null,
        }));

        const albums = (data?.albums?.items || []).map((album) => ({
            id: album.id as string,
            type: 'album' as const,
            title: album.name as string,
            artist: album.artists?.[0]?.name || null,
            albumName: null,
            releaseDate: album.release_date || null,
            image: album.images?.[0]?.url || null,
            spotifyUrl: album.external_urls?.spotify || null,
        }));

        return NextResponse.json({ items: [...tracks, ...albums] });
    } catch {
        return NextResponse.json({ items: [], error: 'Failed to fetch from Spotify' }, { status: 500 });
    }
}
