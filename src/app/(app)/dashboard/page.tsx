'use client';

import { useEffect, useMemo, useState } from 'react';
import StarRating from '@/components/ui/StarRating';
import { createClient } from '@/lib/supabase';
import type { Movie, Book } from '@/lib/types';
import Link from 'next/link';

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
    const [stats, setStats] = useState({ totalItems: 0 });
    const [items, setItems] = useState<DashboardItem[]>([]);
    const [filterType, setFilterType] = useState<ItemFilter>('all');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const supabase = createClient();
        const [moviesRes, booksRes, moviesCount, booksCount] = await Promise.all([
            supabase.from('movies').select('*').order('created_at', { ascending: false }).limit(18),
            supabase.from('books').select('*').order('created_at', { ascending: false }).limit(18),
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

    const filteredItems = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        return items.filter((item) => {
            const typeMatch = filterType === 'all' || item.type === filterType;
            const textMatch = normalized.length === 0 || item.title.toLowerCase().includes(normalized);
            return typeMatch && textMatch;
        });
    }, [items, filterType, search]);

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#e1e3e5' }}>Library</h1>
            </div>

            {/* Stats */}
            <div className="pb-6 mb-8" style={{ borderBottom: '1px solid #2c3440' }}>
                <p className="text-2xl font-bold tabular-nums" style={{ color: '#e1e3e5' }}>
                    {loading ? '–' : stats.totalItems}
                </p>
                <p className="text-xs uppercase mt-0.5 font-medium" style={{ color: '#678', letterSpacing: '0.15em' }}>TOTAL ITEMS</p>
            </div>

            {/* Items */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold uppercase" style={{ color: '#9ab', letterSpacing: '0.1em' }}>Recent Items</h2>
                    <Link href="/timeline" className="text-xs no-underline" style={{ color: '#678' }}>Timeline →</Link>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {([
                        { label: 'All', value: 'all' },
                        { label: 'Films', value: 'movie' },
                        { label: 'Books', value: 'book' },
                    ] as const).map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setFilterType(option.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all cursor-pointer ${filterType === option.value
                                ? 'text-white bg-white/12'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search title..."
                        className="ml-auto w-full sm:w-56 px-3 py-1.5 rounded-[4px] text-sm bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                    />
                </div>

                {loading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-shimmer aspect-[2/3]" style={{ borderRadius: '4px' }} />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {filteredItems.length === 0 ? (
                            <div className="col-span-full py-10 text-center" style={{ border: '1px dashed #2c3440', borderRadius: '4px' }}>
                                <p className="text-sm" style={{ color: '#678' }}>No items match the current filter</p>
                            </div>
                        ) : filteredItems.map((item) => (
                            <Link key={`${item.type}-${item.id}`} href={item.href} className="group no-underline">
                                <div className="poster-card aspect-[2/3]" style={{ background: '#1c2228' }}>
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-medium" style={{ color: '#556', background: '#242c34' }}>NO IMAGE</div>
                                    )}
                                </div>
                                <p className="text-xs mt-1.5 truncate leading-tight" style={{ color: '#9ab' }}>{item.title}</p>
                                <div className="mt-0.5">
                                    <StarRating value={item.rating || 0} readonly size="sm" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
