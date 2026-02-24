export type ShareTab = 'movies' | 'books' | 'music';
export type SpotifyKind = 'track' | 'album';

export interface ShareIntent {
    tab: ShareTab;
    query: string;
    titleHint?: string;
    spotifyId?: string;
    spotifyType?: SpotifyKind;
}

interface ShareInput {
    title?: string | null;
    text?: string | null;
    url?: string | null;
}

const BOOK_HOST_RE = /(amazon\.)|(rakuten\.)/i;
const MOVIE_HOST_RE = /(netflix\.com)|(primevideo\.com)|(amazon\.co\.jp)|(u-next\.com)|(unext\.jp)/i;
const MUSIC_HOST_RE = /(spotify\.com)|(music\.apple\.com)/i;

function compactText(value: string | null | undefined) {
    return (value || '').replace(/\s+/g, ' ').trim();
}

function sanitizeQuery(value: string) {
    return value.replace(/\s+/g, ' ').trim().slice(0, 180);
}

function safeUrl(raw: string | null | undefined): URL | null {
    if (!raw) return null;
    try {
        return new URL(raw);
    } catch {
        return null;
    }
}

function cleanSlugSegment(segment: string) {
    return decodeURIComponent(segment)
        .replace(/[-_+]+/g, ' ')
        .replace(/\.[a-z0-9]{2,5}$/i, '')
        .replace(/\b(netflix|prime video|amazon prime video|u-next|unext|spotify|apple music)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function guessFromPathname(pathname: string) {
    const parts = pathname.split('/').filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i -= 1) {
        const cleaned = cleanSlugSegment(parts[i]);
        if (cleaned && !/^\d+$/.test(cleaned) && cleaned.length >= 2) return cleaned;
    }
    return '';
}

function extractSpotify(urlObj: URL) {
    const match = urlObj.pathname.match(/\/(track|album)\/([A-Za-z0-9]{10,32})/);
    if (!match) return null;
    return { spotifyType: match[1] as SpotifyKind, spotifyId: match[2] };
}

function extractIsbn(raw: string) {
    const isbn13 = raw.match(/(?:^|[^0-9])(97[89][0-9]{10})(?:[^0-9]|$)/);
    if (isbn13?.[1]) return isbn13[1];
    const isbn10 = raw.match(/(?:^|[^0-9A-Za-z])([0-9]{9}[0-9Xx])(?:[^0-9A-Za-z]|$)/);
    if (isbn10?.[1]) return isbn10[1].toUpperCase();
    return null;
}

function extractAsin(pathname: string) {
    const match = pathname.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?]|$)/i);
    return match?.[1]?.toUpperCase() || null;
}

function chooseBestText(title: string, text: string, pathGuess: string) {
    if (title) return title;
    if (text) return text;
    return pathGuess;
}

export function resolveShareIntent(input: ShareInput): ShareIntent | null {
    const title = compactText(input.title);
    const text = compactText(input.text);
    const rawUrl = compactText(input.url);
    const urlObj = safeUrl(rawUrl);
    const host = (urlObj?.hostname || '').toLowerCase();
    const pathGuess = urlObj ? guessFromPathname(urlObj.pathname) : '';
    const bestText = sanitizeQuery(chooseBestText(title, text, pathGuess));

    if (urlObj && MUSIC_HOST_RE.test(host)) {
        const spotify = extractSpotify(urlObj);
        if (spotify) {
            return {
                tab: 'music',
                query: sanitizeQuery(bestText || spotify.spotifyId),
                spotifyId: spotify.spotifyId,
                spotifyType: spotify.spotifyType,
            };
        }
        return { tab: 'music', query: sanitizeQuery(bestText || pathGuess || rawUrl) };
    }

    if (urlObj && BOOK_HOST_RE.test(host)) {
        const isbn = extractIsbn(`${rawUrl} ${title} ${text}`);
        if (isbn) return { tab: 'books', query: isbn, titleHint: bestText || undefined };
        const asin = extractAsin(urlObj.pathname);
        if (asin) return { tab: 'books', query: asin, titleHint: bestText || undefined };
        const guess = sanitizeQuery(bestText || pathGuess || rawUrl);
        if (guess) return { tab: 'books', query: guess, titleHint: bestText || undefined };
    }

    if (urlObj && MOVIE_HOST_RE.test(host)) {
        const guess = sanitizeQuery(bestText || pathGuess || rawUrl);
        if (guess) return { tab: 'movies', query: guess };
    }

    if (bestText) return { tab: 'movies', query: bestText };
    if (rawUrl) return { tab: 'movies', query: sanitizeQuery(rawUrl) };
    return null;
}
