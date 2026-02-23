import { NextRequest, NextResponse } from 'next/server';

// 楽天ブックス書籍検索 API (OpenAPI)
// Docs: https://webservice.rakuten.co.jp/documentation/books-book-search
const RAKUTEN_ENDPOINT = 'https://openapi.rakuten.co.jp/services/api/BooksBook/Search/20170404';

interface RakutenItem {
    title: string;
    author: string;
    publisherName: string;
    isbn: string;
    itemCaption: string;
    salesDate: string;
    largeImageUrl: string;
    mediumImageUrl: string;
    smallImageUrl: string;
}

type LegacyItemShape = { Item: RakutenItem };
type FlatItemShape = RakutenItem;

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    if (!query) return NextResponse.json({ items: [] });
    const normalized = query.replace(/[^\dXx]/g, '');
    const looksLikeIsbn = /^\d{13}$/.test(normalized) || /^\d{9}[\dXx]$/.test(normalized);

    const appId = process.env.RAKUTEN_APP_ID;
    const accessKey = process.env.RAKUTEN_ACCESS_KEY;
    if (!appId || !accessKey) {
        return NextResponse.json({ items: [], error: 'Rakuten credentials not configured' });
    }

    try {
        const params = new URLSearchParams({
            applicationId: appId,
            accessKey,
            hits: '20',
            outOfStockFlag: '1',
            format: 'json',
        });
        if (looksLikeIsbn) {
            params.set('isbn', normalized.toUpperCase());
        } else {
            params.set('title', query);
        }

        const requestOrigin = request.headers.get('origin');
        const requestReferer = request.headers.get('referer');
        const host = request.headers.get('host') || 'localhost:3000';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const defaultOrigin = `${proto}://${host}`;
        const origin = process.env.RAKUTEN_ALLOWED_ORIGIN || requestOrigin || defaultOrigin;
        const referer = process.env.RAKUTEN_ALLOWED_REFERRER || requestReferer || `${origin}/`;

        const res = await fetch(`${RAKUTEN_ENDPOINT}?${params}`, {
            cache: 'no-store',
            headers: {
                Origin: origin,
                Referer: referer,
            },
        });
        const data = await res.json();

        if (!res.ok) {
            console.error('[Rakuten API] Error:', res.status, JSON.stringify(data));
            const message = data?.errors?.errorMessage || `Rakuten API error: ${res.status}`;
            return NextResponse.json({ items: [], error: message }, { status: res.status });
        }

        // Rakuten response shape can differ by gateway/version.
        const rawItems = ((data.Items || data.items || []) as Array<LegacyItemShape | FlatItemShape>)
            .map((entry) => ('Item' in entry ? entry.Item : entry));

        const items = rawItems.map((Item) => ({
            id: Item.isbn || Item.title,
            title: Item.title,
            author: Item.author || null,
            publishedDate: Item.salesDate || null,
            description: Item.itemCaption || null,
            thumbnail: Item.largeImageUrl || Item.mediumImageUrl || null,
            isbn: Item.isbn || null,
            publisher: Item.publisherName || null,
        }));

        return NextResponse.json({ items });
    } catch (e) {
        console.error('[Rakuten API] Error:', e);
        return NextResponse.json({ items: [], error: 'Failed to fetch from Rakuten Books' }, { status: 500 });
    }
}
