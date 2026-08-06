'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/data-client';
import type { Book, Movie, Music } from '@/lib/types';
import UnifiedItemCard from '@/components/media/UnifiedItemCard';
import styles from './DashboardPage.module.css';

type ItemFilter = 'all' | 'movie' | 'book' | 'music';
type SortMode = 'recent' | 'title' | 'rating';
type ViewMode = 'grid' | 'compact';

interface DashboardItem {
    id: string;
    type: 'movie' | 'book' | 'music';
    title: string;
    imageUrl: string | null;
    rating: number | null;
    createdAt: string;
    href: string;
    badgeLabel: string;
}

export default function DashboardPage() {
    const [items, setItems] = useState<DashboardItem[]>([]);
    const [filterType, setFilterType] = useState<ItemFilter>('all');
    const [sortMode, setSortMode] = useState<SortMode>('recent');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalItems: 0 });

    useEffect(() => {
        async function loadData() {
            const dataClient = createClient();
            const [moviesRes, booksRes, musicRes, moviesCount, booksCount, musicCount] = await Promise.all([
                dataClient.from('movies').select('*').order('created_at', { ascending: false }).limit(30),
                dataClient.from('books').select('*').order('created_at', { ascending: false }).limit(30),
                dataClient.from('music').select('*').order('created_at', { ascending: false }).limit(30),
                dataClient.from('movies').select('*', { count: 'exact', head: true }),
                dataClient.from('books').select('*', { count: 'exact', head: true }),
                dataClient.from('music').select('*', { count: 'exact', head: true }),
            ]);

            const movieItems = ((moviesRes.data as Movie[]) || []).map((movie) => ({
                id: movie.id,
                type: 'movie' as const,
                title: movie.title,
                imageUrl: movie.poster_url,
                rating: movie.rating,
                createdAt: movie.created_at,
                href: `/movies/${movie.id}`,
                badgeLabel: movie.media_type === 'tv' ? 'TV' : 'FILM',
            }));
            const bookItems = ((booksRes.data as Book[]) || []).map((book) => ({
                id: book.id,
                type: 'book' as const,
                title: book.title,
                imageUrl: book.cover_url,
                rating: book.rating,
                createdAt: book.created_at,
                href: `/books/${book.id}`,
                badgeLabel: 'BOOK',
            }));
            const musicItems = ((musicRes.data as Music[]) || []).map((item) => ({
                id: item.id,
                type: 'music' as const,
                title: item.title,
                imageUrl: item.artwork_url,
                rating: item.rating,
                createdAt: item.created_at,
                href: `/music/${item.id}`,
                badgeLabel: 'MUSIC',
            }));

            const merged = [...movieItems, ...bookItems, ...musicItems].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setItems(merged);
            setStats({ totalItems: (moviesCount.count || 0) + (booksCount.count || 0) + (musicCount.count || 0) });
            setLoading(false);
        }

        loadData();
    }, []);

    const filteredItems = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        const filtered = items.filter((item) => {
            const typeMatch = filterType === 'all' || item.type === filterType;
            const textMatch = normalized.length === 0 || item.title.toLowerCase().includes(normalized);
            return typeMatch && textMatch;
        });

        return filtered.sort((a, b) => {
            if (sortMode === 'title') return a.title.localeCompare(b.title);
            if (sortMode === 'rating') return (b.rating || 0) - (a.rating || 0);
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
    }, [items, filterType, search, sortMode]);

    function cycleSortMode() {
        setSortMode((prev) => {
            if (prev === 'recent') return 'title';
            if (prev === 'title') return 'rating';
            return 'recent';
        });
    }

    const sortLabel = sortMode === 'recent' ? 'Recent' : sortMode === 'title' ? 'Title' : 'Rating';
    const sortLabelShort = sortMode === 'recent' ? 'R' : sortMode === 'title' ? 'T' : '★';

    function toDateLabel(date: string) {
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return '--';
        return parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }).toUpperCase();
    }

    return (
        <div className={styles.root}>
            <header className={styles.toolbar}>
                <div className={styles.topStat}>
                    <div className={styles.topStatValue}>{loading ? '-' : stats.totalItems}</div>
                    <div className={styles.topStatLabel}>TOTAL ITEMS</div>
                </div>
                <div className={styles.controls}>
                    <div className={styles.filterTabs}>
                        {([
                            { label: 'All', value: 'all' },
                            { label: 'Films', value: 'movie' },
                            { label: 'Books', value: 'book' },
                            { label: 'Music', value: 'music' },
                        ] as const).map((option) => (
                            <button
                                key={option.value}
                                className={`${styles.filterBtn} ${filterType === option.value ? styles.filterBtnActive : ''}`}
                                onClick={() => setFilterType(option.value)}
                                type="button"
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="SEARCH..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button className={`${styles.iconBtn} ${styles.sortBtn}`} aria-label={`sort: ${sortLabel}`} title={`Sort: ${sortLabel}`} type="button" onClick={cycleSortMode}>
                        <span className={styles.sortBtnLabel}>{sortLabel}</span>
                        <span className={styles.sortBtnLabelShort}>{sortLabelShort}</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="4" y1="21" x2="4" y2="14" />
                            <line x1="4" y1="10" x2="4" y2="3" />
                            <line x1="12" y1="21" x2="12" y2="12" />
                            <line x1="12" y1="8" x2="12" y2="3" />
                            <line x1="20" y1="21" x2="20" y2="16" />
                            <line x1="20" y1="12" x2="20" y2="3" />
                            <line x1="1" y1="14" x2="7" y2="14" />
                            <line x1="9" y1="8" x2="15" y2="8" />
                            <line x1="17" y1="16" x2="23" y2="16" />
                        </svg>
                    </button>
                    <button
                        className={`${styles.iconBtn} ${styles.viewToggleBtn}`}
                        aria-label={`view: ${viewMode}`}
                        title={`View: ${viewMode === 'grid' ? 'Grid' : 'Compact'}`}
                        type="button"
                        onClick={() => setViewMode((prev) => (prev === 'grid' ? 'compact' : 'grid'))}
                    >
                        {viewMode === 'grid' ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="3" y1="9" x2="21" y2="9" />
                                <line x1="9" y1="21" x2="9" y2="9" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="4" y1="7" x2="20" y2="7" />
                                <line x1="4" y1="12" x2="20" y2="12" />
                                <line x1="4" y1="17" x2="20" y2="17" />
                            </svg>
                        )}
                    </button>
                </div>
            </header>

            <section className={styles.content}>
                {loading ? (
                    <div className={`${styles.grid} ${viewMode === 'compact' ? styles.gridCompact : ''}`}>
                        {[...Array(10)].map((_, i) => <div key={i} className="animate-shimmer aspect-[2/3] rounded-[6px]" />)}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className={styles.empty}>No items match your filter.</div>
                ) : (
                    <div className={`${styles.grid} ${viewMode === 'compact' ? styles.gridCompact : ''}`}>
                        {filteredItems.map((item) => (
                            <div key={`${item.type}-${item.id}`} className={`${styles.card} ${viewMode === 'compact' ? styles.cardCompact : ''}`}>
                                <UnifiedItemCard
                                    href={item.href}
                                    title={item.title}
                                    imageUrl={item.imageUrl}
                                    badgeLabel={item.badgeLabel}
                                    dateLabel={toDateLabel(item.createdAt)}
                                    rating={item.rating}
                                    preserveImage={item.type === 'music'}
                                    compact={viewMode === 'compact'}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
