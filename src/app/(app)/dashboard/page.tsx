'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { Book, Movie } from '@/lib/types';
import styles from './DashboardPage.module.css';

type ItemFilter = 'all' | 'movie' | 'book';

interface DashboardItem {
    id: string;
    type: 'movie' | 'book';
    title: string;
    imageUrl: string | null;
    rating: number | null;
    createdAt: string;
    href: string;
}

export default function DashboardPage() {
    const [items, setItems] = useState<DashboardItem[]>([]);
    const [filterType, setFilterType] = useState<ItemFilter>('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalItems: 0 });

    useEffect(() => {
        async function loadData() {
            const supabase = createClient();
            const [moviesRes, booksRes, moviesCount, booksCount] = await Promise.all([
                supabase.from('movies').select('*').order('created_at', { ascending: false }).limit(30),
                supabase.from('books').select('*').order('created_at', { ascending: false }).limit(30),
                supabase.from('movies').select('*', { count: 'exact', head: true }),
                supabase.from('books').select('*', { count: 'exact', head: true }),
            ]);

            const movieItems = ((moviesRes.data as Movie[]) || []).map((movie) => ({
                id: movie.id,
                type: 'movie' as const,
                title: movie.title,
                imageUrl: movie.poster_url,
                rating: movie.rating,
                createdAt: movie.created_at,
                href: `/movies/${movie.id}`,
            }));
            const bookItems = ((booksRes.data as Book[]) || []).map((book) => ({
                id: book.id,
                type: 'book' as const,
                title: book.title,
                imageUrl: book.cover_url,
                rating: book.rating,
                createdAt: book.created_at,
                href: `/books/${book.id}`,
            }));

            const merged = [...movieItems, ...bookItems].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            setItems(merged);
            setStats({ totalItems: (moviesCount.count || 0) + (booksCount.count || 0) });
            setLoading(false);
        }

        loadData();
    }, []);

    const filteredItems = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        return items.filter((item) => {
            const typeMatch = filterType === 'all' || item.type === filterType;
            const textMatch = normalized.length === 0 || item.title.toLowerCase().includes(normalized);
            return typeMatch && textMatch;
        });
    }, [items, filterType, search]);

    function toStars(value: number | null) {
        const rounded = Math.max(0, Math.min(5, Math.round(value || 0)));
        return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`;
    }

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
                    <button className={styles.iconBtn} aria-label="filters" type="button">
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
                    <Link href="/timeline" className={styles.iconBtn} aria-label="timeline">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                    </Link>
                </div>
            </header>

            <section className={styles.content}>
                {loading ? (
                    <div className={styles.grid}>
                        {[...Array(10)].map((_, i) => <div key={i} className="animate-shimmer aspect-[2/3] rounded-[6px]" />)}
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className={styles.empty}>No items match your filter.</div>
                ) : (
                    <div className={styles.grid}>
                        {filteredItems.map((item) => (
                            <Link key={`${item.type}-${item.id}`} href={item.href} className={styles.card}>
                                <div className={styles.posterWrap}>
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.title} className={styles.poster} />
                                    ) : (
                                        <div className={styles.noImage}>NO IMAGE</div>
                                    )}
                                </div>
                                <div className={styles.cardMeta}>
                                    <h3 className={styles.cardTitle}>{item.title}</h3>
                                    <span className={styles.dateChip}>{toDateLabel(item.createdAt)}</span>
                                </div>
                                <div className={styles.rating}>{toStars(item.rating)}</div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
