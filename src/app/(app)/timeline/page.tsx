'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import { createClient } from '@/lib/supabase';
import { getRawStatusesForSidebarFilter, isSidebarStatusFilter, SIDEBAR_STATUS_OPTIONS, type SidebarStatusFilter } from '@/lib/status';
import './timeline.css';

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
    return (
        <Suspense fallback={<div className="w-full" />}>
            <TimelinePageContent />
        </Suspense>
    );
}

function TimelinePageContent() {
    const searchParams = useSearchParams();
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | TimelineType>('all');
    const [searchText, setSearchText] = useState('');
    const [activeYear, setActiveYear] = useState<string>('');
    const yearRefs = useRef<Record<string, HTMLElement | null>>({});
    const dividerRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const monthRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const canvasRef = useRef<HTMLDivElement | null>(null);
    const now = useMemo(() => new Date(), []);
    const currentYear = String(now.getFullYear());
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonthKey = `${currentYear}-${currentMonth}`;

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

    const filtered = useMemo(() => {
        const filteredByType = filterType === 'all' ? entries : entries.filter((entry) => entry.type === filterType);
        const statusFiltered = allowedStatuses ? filteredByType.filter((entry) => allowedStatuses.includes(entry.status)) : filteredByType;
        const normalizedSearch = searchText.trim().toLowerCase();
        return normalizedSearch
            ? statusFiltered.filter((entry) => entry.title.toLowerCase().includes(normalizedSearch))
            : statusFiltered;
    }, [entries, filterType, allowedStatuses, searchText]);

    const groupedByYearMonth = useMemo(() => {
        const grouped: Record<string, Record<string, TimelineEntry[]>> = {};
        for (const entry of filtered) {
            const d = new Date(entry.loggedAt);
            if (Number.isNaN(d.getTime())) continue;
            const year = String(d.getFullYear());
            const month = String(d.getMonth() + 1).padStart(2, '0');
            if (!grouped[year]) grouped[year] = {};
            if (!grouped[year][month]) grouped[year][month] = [];
            grouped[year][month].push(entry);
        }
        return grouped;
    }, [filtered]);

    const years = useMemo(() => {
        const availableYears = new Set(Object.keys(groupedByYearMonth));
        availableYears.add(currentYear);
        return Array.from(availableYears).sort((a, b) => Number(a) - Number(b));
    }, [groupedByYearMonth, currentYear]);

    const yearsWithEntries = useMemo(() => {
        const set = new Set<string>();
        for (const [year, monthsByYear] of Object.entries(groupedByYearMonth)) {
            const hasEntries = Object.values(monthsByYear).some((monthEntries) => monthEntries.length > 0);
            if (hasEntries) set.add(year);
        }
        return set;
    }, [groupedByYearMonth]);

    const centerCurrentMonth = useCallback(() => {
        const canvas = canvasRef.current;
        const monthNode = monthRefs.current[currentMonthKey];
        if (!canvas || !monthNode) return;

        const isMobileViewport = window.matchMedia('(max-width: 640px)').matches;
        const targetLeft = isMobileViewport
            ? monthNode.offsetLeft
            : monthNode.offsetLeft - (canvas.clientWidth / 2 - monthNode.clientWidth / 2);
        const maxScrollLeft = canvas.scrollWidth - canvas.clientWidth;
        canvas.scrollLeft = Math.max(0, Math.min(maxScrollLeft, targetLeft));
    }, [currentMonthKey]);

    useEffect(() => {
        if (!years.length) return;
        setActiveYear((prev) => (prev && years.includes(prev) ? prev : years.includes(currentYear) ? currentYear : years[0]));
    }, [years, currentYear]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !years.length) return;

        const updateActiveYearFromScroll = () => {
            const probeX = canvas.scrollLeft + canvas.clientWidth / 2;
            let current = years[0];
            for (const year of years) {
                const anchor = dividerRefs.current[year] || yearRefs.current[year];
                if (!anchor) continue;
                if (anchor.offsetLeft <= probeX) current = year;
                else break;
            }
            setActiveYear(current);
        };

        updateActiveYearFromScroll();
        canvas.addEventListener('scroll', updateActiveYearFromScroll, { passive: true });
        window.addEventListener('resize', updateActiveYearFromScroll);
        return () => {
            canvas.removeEventListener('scroll', updateActiveYearFromScroll);
            window.removeEventListener('resize', updateActiveYearFromScroll);
        };
    }, [years]);

    useEffect(() => {
        if (!years.length) return;

        const frame = requestAnimationFrame(centerCurrentMonth);
        const timer = window.setTimeout(centerCurrentMonth, 120);

        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(timer);
        };
    }, [years, groupedByYearMonth, centerCurrentMonth]);

    useEffect(() => {
        if (!years.length) return;

        const onViewportChange = () => {
            requestAnimationFrame(centerCurrentMonth);
        };

        window.addEventListener('resize', onViewportChange);
        window.addEventListener('orientationchange', onViewportChange);

        return () => {
            window.removeEventListener('resize', onViewportChange);
            window.removeEventListener('orientationchange', onViewportChange);
        };
    }, [years, centerCurrentMonth]);

    function monthLabel(year: string, month: string) {
        const d = new Date(`${year}-${month}-01T00:00:00`);
        if (Number.isNaN(d.getTime())) return month;
        return d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase();
    }

    function monthShortLabel(year: string, month: string) {
        const d = new Date(`${year}-${month}-01T00:00:00`);
        if (Number.isNaN(d.getTime())) return month;
        return d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    }

    function dayLabel(iso: string) {
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '--';
        return String(d.getDate()).padStart(2, '0');
    }

    function entryStatusLabel(status: string) {
        const s = status.toLowerCase();
        if (s === 'watched') return 'Watched';
        if (s === 'read') return 'Read';
        if (s === 'listened') return 'Listened';
        if (s === 'watching') return 'Active';
        if (s === 'reading') return 'Active';
        if (s === 'listening') return 'Active';
        return status;
    }

    function itemMeta(entry: TimelineEntry) {
        if (entry.type === 'movie') return `FILM • ${entry.mediaType?.toUpperCase() === 'TV' ? 'TV' : 'Movie'}`;
        if (entry.type === 'book') return 'BOOK • Reading';
        return `MUSIC • ${entry.mediaType?.toUpperCase() || 'Track'}`;
    }

    function scrollToYear(year: string) {
        const divider = dividerRefs.current[year];
        const target = divider || yearRefs.current[year];
        const canvas = canvasRef.current;
        if (!target || !canvas) return;
        const canvasRect = canvas.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const rawLeft = canvas.scrollLeft + (targetRect.left - canvasRect.left);
        const maxScrollLeft = canvas.scrollWidth - canvas.clientWidth;
        const targetLeft = Math.max(0, Math.min(maxScrollLeft, rawLeft));
        const previousSnapType = canvas.style.scrollSnapType;
        canvas.style.scrollSnapType = 'none';
        canvas.scrollTo({ left: targetLeft, behavior: 'smooth' });
        window.setTimeout(() => {
            canvas.style.scrollSnapType = previousSnapType || '';
        }, 280);
    }

    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

    function monthEntries(year: string, month: string) {
        const monthList = groupedByYearMonth[year]?.[month] || [];
        return [...monthList].sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
    }

    return (
        <div className="timeline-page">
            <div className="app-topbar">
                <div className="app-topbar-main">
                    <div className="app-topbar-title">
                        <h1 className="text-2xl font-bold timeline-heading">Timeline</h1>
                        <p className="text-sm timeline-subheading mt-1">
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

            <div className="timeline-board-wrap">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="animate-shimmer rounded-[8px] aspect-[2/3]" />
                        ))}
                    </div>
                ) : !years.length ? (
                    <Card hover={false}>
                        <div className="py-14 text-center">
                            <p className="text-lg font-medium mb-2 timeline-heading">No Timeline Logs</p>
                            <p className="text-sm timeline-subheading">Completed items and relogged history will appear here.</p>
                        </div>
                    </Card>
                ) : (
                    <>
                        <div className="timeline-canvas" ref={canvasRef}>
                            <div className="timeline-years-track">
                                {years.map((year, index) => (
                                    <div
                                        key={year}
                                        data-year={year}
                                        ref={(node) => {
                                            yearRefs.current[year] = node;
                                        }}
                                        className="timeline-year-group"
                                    >
                                        {(index > 0 || yearsWithEntries.has(year)) && (
                                            <div
                                                ref={(node) => {
                                                    dividerRefs.current[year] = node;
                                                }}
                                                className="timeline-year-divider"
                                                aria-hidden="true"
                                            >
                                                <span className="timeline-year-divider-label">{year}</span>
                                            </div>
                                        )}
                                        <section
                                            className="timeline-year-section"
                                        >
                                            <div className="timeline-month-columns">
                                                {months.map((month) => {
                                                    const list = monthEntries(year, month);
                                                    return (
                                                        <div key={`${year}-${month}`} className="timeline-month-column">
                                                            <div
                                                                ref={(node) => {
                                                                    monthRefs.current[`${year}-${month}`] = node;
                                                                }}
                                                                className={`timeline-month-hitbox ${year === currentYear && month === currentMonth ? 'is-current-month' : ''}`}
                                                            >
                                                                <header className="timeline-month-header">
                                                                    <span className="timeline-month-label-long">{monthLabel(year, month)}</span>
                                                                    <span className="timeline-month-label-short">{monthShortLabel(year, month)}</span>
                                                                </header>
                                                            </div>
                                                            <div className="timeline-month-list">
                                                                {list.map((entry) => (
                                                                    <Link
                                                                        key={entry.entryId}
                                                                        href={entry.type === 'movie' ? `/movies/${entry.itemId}` : entry.type === 'book' ? `/books/${entry.itemId}` : `/music/${entry.itemId}`}
                                                                        className="timeline-entry"
                                                                    >
                                                                        <span className="timeline-entry-day">{dayLabel(entry.loggedAt)}</span>
                                                                        <span className="timeline-entry-main">
                                                                            <span className="timeline-entry-title">{entry.title}</span>
                                                                            <span className="timeline-entry-meta">{itemMeta(entry)}</span>
                                                                        </span>
                                                                        <span className="timeline-entry-side">{entryStatusLabel(entry.status)}</span>
                                                                    </Link>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </section>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <nav className="timeline-year-nav" aria-label="Timeline years">
                            {years.map((year) => (
                                <button
                                    key={`nav-${year}`}
                                    type="button"
                                    onClick={() => scrollToYear(year)}
                                    className={`timeline-year-nav-item ${activeYear === year ? 'is-active' : ''}`}
                                >
                                    <span className="timeline-year-nav-line" />
                                    <span className="timeline-year-nav-label">{year}</span>
                                </button>
                            ))}
                        </nav>
                    </>
                )}
            </div>
        </div>
    );
}
