import { NextRequest, NextResponse } from 'next/server';

// 楽天ブックス書籍検索 API (RWS: app.rakuten.co.jp)
// Docs: https://webservice.rakuten.co.jp/documentation/books-book-search
const RAKUTEN_ENDPOINT = 'https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404';

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

    const appId = process.env.RAKUTEN_APP_ID;
    if (!appId) {
        return NextResponse.json({ items: [], error: 'RAKUTEN_APP_ID is not configured' });
    }

    // RWS applicationId is numeric-like. UUID/pk_* keys are for another platform.
    if (appId.includes('-')) {
        return NextResponse.json({
            items: [],
            error: 'Invalid RAKUTEN_APP_ID format. Use Rakuten RWS applicationId (not UUID/pk_* keys).',
        }, { status: 400 });
    }

    try {
        const params = new URLSearchParams({
            applicationId: appId,
            title: query,
            hits: '20',
            outOfStockFlag: '1',
            format: 'json',
        });

        const res = await fetch(`${RAKUTEN_ENDPOINT}?${params}`, { cache: 'no-store' });
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
