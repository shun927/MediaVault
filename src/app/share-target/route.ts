import { NextRequest, NextResponse } from 'next/server';
import { resolveShareIntent } from '@/lib/share-target';
import { authenticateRequest, forbidden } from '@/lib/auth';

function redirectToSearch(request: NextRequest, params: URLSearchParams) {
    const url = request.nextUrl.clone();
    url.pathname = '/search';
    url.search = params.toString();
    return NextResponse.redirect(url);
}

export async function POST(request: NextRequest) {
    try { await authenticateRequest(request); } catch (error) { return forbidden(error); }
    const formData = await request.formData();
    const title = formData.get('title')?.toString() || '';
    const text = formData.get('text')?.toString() || '';
    const url = formData.get('url')?.toString() || '';

    const intent = resolveShareIntent({ title, text, url });
    const params = new URLSearchParams();
    params.set('auto', '1');
    params.set('shared', '1');

    if (intent) {
        params.set('tab', intent.tab);
        params.set('q', intent.query);
        if (intent.titleHint) {
            params.set('titleHint', intent.titleHint);
        }
        if (intent.spotifyId && intent.spotifyType) {
            params.set('spotifyId', intent.spotifyId);
            params.set('spotifyType', intent.spotifyType);
        }
    } else {
        params.set('tab', 'movies');
    }

    return redirectToSearch(request, params);
}

export async function GET(request: NextRequest) {
    try { await authenticateRequest(request); } catch (error) { return forbidden(error); }
    const title = request.nextUrl.searchParams.get('title');
    const text = request.nextUrl.searchParams.get('text');
    const url = request.nextUrl.searchParams.get('url');
    const intent = resolveShareIntent({ title, text, url });

    const params = new URLSearchParams();
    params.set('auto', '1');
    params.set('shared', '1');
    if (intent) {
        params.set('tab', intent.tab);
        params.set('q', intent.query);
        if (intent.titleHint) {
            params.set('titleHint', intent.titleHint);
        }
        if (intent.spotifyId && intent.spotifyType) {
            params.set('spotifyId', intent.spotifyId);
            params.set('spotifyType', intent.spotifyType);
        }
    }
    return redirectToSearch(request, params);
}
