'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import UnifiedItemCard from '@/components/media/UnifiedItemCard';
import { createClient } from '@/lib/supabase';
import { getRawStatusesForSidebarFilter, isSidebarStatusFilter, SIDEBAR_STATUS_OPTIONS, type SidebarStatusFilter } from '@/lib/status';

type TimelineType = 'movie' | 'book' | 'music';

interface TimelineEntry {
    entryId: string;
    itemId: string;
    type: TimelineType;
    title: string;
    imageUrl: string | null;
    mediaType?: string | null;
    rating: number | null;
    status: string;
    loggedAt: string;
    note: string | null;
}

export default function TimelinePage() {
    const searchParams = useSearchParams();
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | TimelineType>('all');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        async function loadTimeline() {
            const supabase = createClient();
            const [
                { data: movieHistory },
                { data: bookHistory },
                { data: musicHistory },
                { data: moviesCompleted },
                { data: booksCompleted },
                { data: musicCompleted },
            ] = await Promise.all([
                supabase
                    .from('viewing_history')
                    .select('id, watched_at, note, movies!inner(id, title, poster_url, media_type, rating, status)')
                    .order('watched_at', { ascending: true }),
                supabase
                    .from('reading_history')
                    .select('id, read_at, note, books!inner(id, title, cover_url, rating, status)')
                    .order('read_at', { ascending: true }),
                supabase
                    .from('listening_history')
                    .select('id, listened_at, note, music!inner(id, title, artwork_url, type, rating, status)')
                    .order('listened_at', { ascending: true }),
                supabase
                    .from('movies')
                    .select('id, title, poster_url, media_type, rating, status, watched_at, created_at')
                    .eq('status', 'watched')
                    .order('watched_at', { ascending: true }),
                supabase
                    .from('books')
                    .select('id, title, cover_url, rating, status, read_at, created_at')
                    .eq('status', 'read')
                    .order('read_at', { ascending: true }),
                supabase
                    .from('music')
                    .select('id, title, artwork_url, type, rating, status, listened_at, created_at')
                    .eq('status', 'listened')
                    .order('listened_at', { ascending: true }),
            ]);

            function pickRelation<T>(relation: T | T[] | null | undefined): T | null {
                if (!relation) return null;
                return Array.isArray(relation) ? relation[0] || null : relation;
            }

            const movieEntries: TimelineEntry[] = (movieHistory || []).flatMap((row: {
                id: string;
                watched_at: string;
                note: string | null;
                movies: { id: string; title: string; poster_url: string | null; media_type: string | null; rating: number | null; status: string } | Array<{ id: string; title: string; poster_url: string | null; media_type: string | null; rating: number | null; status: string }>;
            }) => {
                const movie = pickRelation(row.movies);
                if (!movie) return [];
                return {
                    entryId: `movie-${row.id}`,
                    itemId: movie.id,
                    type: 'movie',
                    title: movie.title,
                    imageUrl: movie.poster_url,
                    mediaType: movie.media_type,
                    rating: movie.rating,
                    status: movie.status,
                    loggedAt: row.watched_at,
                    note: row.note,
                };
            });

            const bookEntries: TimelineEntry[] = (bookHistory || []).flatMap((row: {
                id: string;
                read_at: string;
                note: string | null;
                books: { id: string; title: string; cover_url: string | null; rating: number | null; status: string } | Array<{ id: string; title: string; cover_url: string | null; rating: number | null; status: string }>;
            }) => {
                const book = pickRelation(row.books);
                if (!book) return [];
                return {
                    entryId: `book-${row.id}`,
                    itemId: book.id,
                    type: 'book',
                    title: book.title,
                    imageUrl: book.cover_url,
                    rating: book.rating,
                    status: book.status,
                    loggedAt: row.read_at,
                    note: row.note,
                };
            });

            const musicEntries: TimelineEntry[] = (musicHistory || []).flatMap((row: {
                id: string;
                listened_at: string;
                note: string | null;
                music: { id: string; title: string; artwork_url: string | null; type: string | null; rating: number | null; status: string } | Array<{ id: string; title: string; artwork_url: string | null; type: string | null; rating: number | null; status: string }>;
            }) => {
                const music = pickRelation(row.music);
                if (!music) return [];
                return {
                    entryId: `music-${row.id}`,
                    itemId: music.id,
                    type: 'music',
                    title: music.title,
                    imageUrl: music.artwork_url,
                    mediaType: music.type,
                    rating: music.rating,
                    status: music.status,
                    loggedAt: row.listened_at,
                    note: row.note,
                };
            });

            const movieHistoryIds = new Set(movieEntries.map((entry) => entry.itemId));
            const bookHistoryIds = new Set(bookEntries.map((entry) => entry.itemId));
            const musicHistoryIds = new Set(musicEntries.map((entry) => entry.itemId));

            const movieFallback: TimelineEntry[] = (moviesCompleted || [])
                .filter((movie: { id: string }) => !movieHistoryIds.has(movie.id))
                .map((movie: { id: string; title: string; poster_url: string | null; media_type: string | null; rating: number | null; status: string; watched_at: string | null; created_at: string }) => ({
                    entryId: `movie-fallback-${movie.id}`,
                    itemId: movie.id,
                    type: 'movie',
                    title: movie.title,
                    imageUrl: movie.poster_url,
                    mediaType: movie.media_type,
                    rating: movie.rating,
                    status: movie.status,
                    loggedAt: movie.watched_at || movie.created_at,
                    note: null,
                }));

            const bookFallback: TimelineEntry[] = (booksCompleted || [])
                .filter((book: { id: string }) => !bookHistoryIds.has(book.id))
                .map((book: { id: string; title: string; cover_url: string | null; rating: number | null; status: string; read_at: string | null; created_at: string }) => ({
                    entryId: `book-fallback-${book.id}`,
                    itemId: book.id,
                    type: 'book',
                    title: book.title,
                    imageUrl: book.cover_url,
                    rating: book.rating,
                    status: book.status,
                    loggedAt: book.read_at || book.created_at,
                    note: null,
                }));

            const musicFallback: TimelineEntry[] = (musicCompleted || [])
                .filter((music: { id: string }) => !musicHistoryIds.has(music.id))
                .map((music: { id: string; title: string; artwork_url: string | null; type: string | null; rating: number | null; status: string; listened_at: string | null; created_at: string }) => ({
                    entryId: `music-fallback-${music.id}`,
                    itemId: music.id,
                    type: 'music',
                    title: music.title,
                    imageUrl: music.artwork_url,
                    mediaType: music.type,
                    rating: music.rating,
                    status: music.status,
                    loggedAt: music.listened_at || music.created_at,
                    note: null,
                }));

            const merged = [...movieEntries, ...bookEntries, ...musicEntries, ...movieFallback, ...bookFallback, ...musicFallback].sort(
                (a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
            );

            setEntries(merged);
            setLoading(false);
        }

        void loadTimeline();
    }, []);

    const statusParam = searchParams.get('status');
    const statusFilter: SidebarStatusFilter | null = isSidebarStatusFilter(statusParam) ? statusParam : null;
    const allowedStatuses = statusFilter ? getRawStatusesForSidebarFilter(statusFilter) : null;
    const statusLabel = statusFilter ? SIDEBAR_STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label : null;

    const filteredByType = filterType === 'all' ? entries : entries.filter((entry) => entry.type === filterType);
    const statusFiltered = allowedStatuses ? filteredByType.filter((entry) => allowedStatuses.includes(entry.status)) : filteredByType;
    const normalizedSearch = searchText.trim().toLowerCase();
    const filtered = normalizedSearch
        ? statusFiltered.filter((entry) => entry.title.toLowerCase().includes(normalizedSearch))
        : statusFiltered;

    const groupedByDay = useMemo(() => {
        const grouped: Record<string, TimelineEntry[]> = {};
        for (const entry of filtered) {
            const dayKey = entry.loggedAt.slice(0, 10);
            if (!grouped[dayKey]) grouped[dayKey] = [];
            grouped[dayKey].push(entry);
        }
        return grouped;
    }, [filtered]);

    const days = Object.keys(groupedByDay).sort((a, b) => a.localeCompare(b));

    function toTimeLabel(iso: string) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '--:--';
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    }

    function toDayLabel(day: string) {
        const d = new Date(`${day}T00:00:00`);
        if (Number.isNaN(d.getTime())) return day;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
    }

    return (
        <div className="w-full">
            <div className="app-topbar">
                <div className="app-topbar-main">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Timeline</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">
                            {statusLabel ? `${statusLabel} · ` : ''}
                            Your Culture Timeline — {filtered.length} logs
                        </p>
                    </div>
                    <div className="app-topbar-controls">
                        <input
                            className="app-control-input"
                            placeholder="Search titles..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                        <div className="app-pill-group">
                            {(['all', 'movie', 'book', 'music'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilterType(type)}
                                    className={`app-pill-btn ${filterType === type ? 'is-active' : ''}`}
                                >
                                    {type === 'all' ? 'All' : type === 'movie' ? 'Films' : type === 'book' ? 'Books' : 'Music'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 lg:px-9 pt-5 pb-8">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="animate-shimmer rounded-[8px] aspect-[2/3]" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <Card hover={false}>
                        <div className="py-14 text-center">
                            <p className="text-lg font-medium mb-2 text-[var(--text-primary)]">No Timeline Logs</p>
                            <p className="text-sm text-[var(--text-muted)]">Completed items and relogged history will appear here.</p>
                        </div>
                    </Card>
                ) : (
                    <div className="overflow-x-auto pb-2">
                        <div className="inline-flex items-start gap-8 min-w-max">
                            {days.map((day) => (
                                <section key={day} className="shrink-0 space-y-3 min-w-[220px]">
                                    <div className="rounded-[8px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 w-[220px]">
                                        <p className="text-[12px] font-semibold tracking-[0.04em] text-[var(--text-secondary)]">{toDayLabel(day)}</p>
                                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{groupedByDay[day].length} logs</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        {groupedByDay[day].map((entry) => (
                                            <div key={entry.entryId} className="w-[220px] shrink-0">
                                                <UnifiedItemCard
                                                    href={entry.type === 'movie' ? `/movies/${entry.itemId}` : entry.type === 'book' ? `/books/${entry.itemId}` : `/music/${entry.itemId}`}
                                                    title={entry.title}
                                                    imageUrl={entry.imageUrl}
                                                    badgeLabel={entry.type === 'movie' ? (entry.mediaType === 'tv' ? 'TV' : 'FILM') : entry.type === 'book' ? 'BOOK' : 'MUSIC'}
                                                    dateLabel={toTimeLabel(entry.loggedAt)}
                                                    rating={entry.rating}
                                                    preserveImage={entry.type === 'music'}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
