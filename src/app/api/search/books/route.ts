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

function toIsbn13From10(isbn10: string) {
    if (!/^\d{9}[\dXx]$/.test(isbn10)) return null;
    const core = `978${isbn10.slice(0, 9)}`;
    let sum = 0;
    for (let i = 0; i < core.length; i += 1) {
        const digit = Number(core[i]);
        sum += i % 2 === 0 ? digit : digit * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    return `${core}${check}`;
}

function mapRakutenItems(data: unknown) {
    const obj = data as { Items?: Array<LegacyItemShape | FlatItemShape>; items?: Array<LegacyItemShape | FlatItemShape> };
    const rawItems = ((obj.Items || obj.items || []) as Array<LegacyItemShape | FlatItemShape>)
        .map((entry) => ('Item' in entry ? entry.Item : entry));

    return rawItems.map((Item) => ({
        id: Item.isbn || Item.title,
        title: Item.title,
        author: Item.author || null,
        publishedDate: Item.salesDate || null,
        description: Item.itemCaption || null,
        thumbnail: Item.largeImageUrl || Item.mediumImageUrl || null,
        isbn: Item.isbn || null,
        publisher: Item.publisherName || null,
    }));
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q');
    if (!query) return NextResponse.json({ items: [] });
    const titleHint = request.nextUrl.searchParams.get('titleHint')?.trim() || '';
    const normalized = query.replace(/[^\dXx]/g, '');
    const looksLikeIsbn = /^\d{13}$/.test(normalized) || /^\d{9}[\dXx]$/.test(normalized);

    const appId = process.env.RAKUTEN_APP_ID;
    const accessKey = process.env.RAKUTEN_ACCESS_KEY;
    if (!appId || !accessKey) {
        return NextResponse.json({ items: [], error: 'Rakuten credentials not configured' });
    }

    try {
        const baseParams = new URLSearchParams({
            applicationId: appId,
            accessKey,
            hits: '20',
            outOfStockFlag: '1',
            format: 'json',
        });

        const requestOrigin = request.headers.get('origin');
        const requestReferer = request.headers.get('referer');
        const host = request.headers.get('host') || 'localhost:3000';
        const proto = request.headers.get('x-forwarded-proto') || 'https';
        const defaultOrigin = `${proto}://${host}`;
        const origin = process.env.RAKUTEN_ALLOWED_ORIGIN || requestOrigin || defaultOrigin;
        const referer = process.env.RAKUTEN_ALLOWED_REFERRER || requestReferer || `${origin}/`;

        const fetchByParams = async (params: URLSearchParams) => {
            const res = await fetch(`${RAKUTEN_ENDPOINT}?${params}`, {
                cache: 'no-store',
                headers: {
                    Origin: origin,
                    Referer: referer,
                },
            });
            const data = await res.json();
            return { res, data };
        };

        const firstParams = new URLSearchParams(baseParams);
        if (looksLikeIsbn) {
            firstParams.set('isbn', normalized.toUpperCase());
        } else {
            firstParams.set('title', query);
        }

        let { res, data } = await fetchByParams(firstParams);

        if (!res.ok) {
            console.error('[Rakuten API] Error:', res.status, JSON.stringify(data));
            const message = data?.errors?.errorMessage || `Rakuten API error: ${res.status}`;
            return NextResponse.json({ items: [], error: message }, { status: res.status });
        }

        let items = mapRakutenItems(data);

        if (items.length === 0 && /^\d{9}[\dXx]$/.test(normalized)) {
            const isbn13 = toIsbn13From10(normalized.toUpperCase());
            if (isbn13) {
                const secondParams = new URLSearchParams(baseParams);
                secondParams.set('isbn', isbn13);
                const secondTry = await fetchByParams(secondParams);
                if (secondTry.res.ok) {
                    items = mapRakutenItems(secondTry.data);
                }
            }
        }

        if (items.length === 0 && looksLikeIsbn && titleHint) {
            const titleParams = new URLSearchParams(baseParams);
            titleParams.set('title', titleHint);
            const titleTry = await fetchByParams(titleParams);
            if (titleTry.res.ok) {
                items = mapRakutenItems(titleTry.data);
            }
        }

        return NextResponse.json({ items });
    } catch (e) {
        console.error('[Rakuten API] Error:', e);
        return NextResponse.json({ items: [], error: 'Failed to fetch from Rakuten Books' }, { status: 500 });
    }
}
