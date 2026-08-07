'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/data-client';
import type { Movie } from '@/lib/types';
import styles from './CinemaLogbookView.module.css';

export default function CinemaLogbookView() {
    const [query, setQuery] = useState('');
    const [movies, setMovies] = useState<Movie[]>([]);
    const [movieCount, setMovieCount] = useState(0);
    const [avgRating, setAvgRating] = useState(0);

    useEffect(() => {
        async function load() {
            const dataClient = createClient();
            const [movieRows, movieCounter] = await Promise.all([
                dataClient.from('movies').select('*').order('created_at', { ascending: false }).limit(24),
                dataClient.from('movies').select('*', { count: 'exact', head: true }),
            ]);

            const movieData = (movieRows.data as Movie[]) || [];
            setMovies(movieData);
            setMovieCount(movieCounter.count || 0);

            const rated = movieData.filter((movie) => typeof movie.rating === 'number');
            const average = rated.length
                ? rated.reduce((sum, movie) => sum + (movie.rating || 0), 0) / rated.length
                : 0;
            setAvgRating(average);
        }

        load();
    }, []);

    const filteredMovies = useMemo(() => {
        if (!query.trim()) return movies;
        const normalized = query.trim().toLowerCase();
        return movies.filter((movie) => movie.title.toLowerCase().includes(normalized));
    }, [movies, query]);

    const watchedHours = useMemo(() => {
        const watched = movies.filter((movie) => movie.status === 'watched').length;
        return watched * 2;
    }, [movies]);

    function toStars(value: number | null) {
        const rounded = Math.max(0, Math.min(5, Math.round(value || 0)));
        return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`;
    }

    function toDateLabel(date: string) {
        const parsed = new Date(date);
        if (Number.isNaN(parsed.getTime())) return '--';
        return parsed
            .toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
            .toUpperCase();
    }

    return (
        <div className={styles.root}>
            <header className={styles.toolbar}>
                <h1 className={`${styles.pageTitle} ${styles.fontExpressive}`}>映画ログ</h1>
                <div className={styles.controls}>
                    <input
                        type="text"
                        className={styles.searchInput}
                        placeholder="SEARCH..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button className={styles.iconBtn} aria-label="filters">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
                    <button className={styles.iconBtn} aria-label="layout">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                            <line x1="9" y1="21" x2="9" y2="9" />
                        </svg>
                    </button>
                </div>
            </header>

            <section className={styles.content}>
                <div className={`${styles.stats} ${styles.fontData}`}>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{watchedHours}</div>
                        <div className={styles.statLabel}>視聴時間</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{movieCount}</div>
                        <div className={styles.statLabel}>映画</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{avgRating ? avgRating.toFixed(1) : '-'}</div>
                        <div className={styles.statLabel}>平均評価</div>
                    </div>
                </div>

                {filteredMovies.length === 0 ? (
                    <div className={styles.empty}>該当する映画がありません。検索条件を変えてください。</div>
                ) : (
                    <div className={styles.mediaGrid}>
                        {filteredMovies.map((item, index) => (
                            <Link key={item.id} href={`/movies/${item.id}`} className={styles.mediaCard}>
                                <div className={styles.cardImageWrap}>
                                    {index === 0 && <div className={styles.sticker}>新着</div>}
                                    <Image
                                        src={item.poster_url || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop'}
                                        className={styles.cardImage}
                                        alt={item.title}
                                        fill
                                        sizes="(max-width: 980px) 50vw, 20vw"
                                    />
                                </div>
                                <div>
                                    <div className={styles.cardMeta}>
                                        <h3 className={styles.cardTitle}>{item.title}</h3>
                                        <span className={`${styles.cardDate} ${styles.fontData}`}>{toDateLabel(item.created_at)}</span>
                                    </div>
                                    <div className={styles.rating}>{toStars(item.rating)}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
