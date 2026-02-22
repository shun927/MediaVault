'use client';

import { useEffect, useState } from 'react';
import StarRating from '@/components/ui/StarRating';
import { createClient } from '@/lib/supabase';
import type { Movie, Book } from '@/lib/types';
import Link from 'next/link';

export default function DashboardPage() {
    const [stats, setStats] = useState({ movies: 0, books: 0, tags: 0 });
    const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
    const [recentBooks, setRecentBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        const supabase = createClient();
        const [moviesRes, booksRes, tagsRes, moviesCount, booksCount] = await Promise.all([
            supabase.from('movies').select('*').order('created_at', { ascending: false }).limit(6),
            supabase.from('books').select('*').order('created_at', { ascending: false }).limit(6),
            supabase.from('tags').select('id'),
            supabase.from('movies').select('*', { count: 'exact', head: true }),
            supabase.from('books').select('*', { count: 'exact', head: true }),
        ]);
        setStats({
            movies: moviesCount.count || 0,
            books: booksCount.count || 0,
            tags: tagsRes.data?.length || 0,
        });
        setRecentMovies((moviesRes.data as Movie[]) || []);
        setRecentBooks((booksRes.data as Book[]) || []);
        setLoading(false);
    }

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight" style={{ color: '#e1e3e5' }}>Library</h1>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pb-6 mb-8" style={{ borderBottom: '1px solid #2c3440' }}>
                {[
                    { label: 'FILMS', value: stats.movies, href: '/movies' },
                    { label: 'BOOKS', value: stats.books, href: '/books' },
                    { label: 'TAGS', value: stats.tags, href: '/tags' },
                ].map((s) => (
                    <Link key={s.label} href={s.href} className="text-center group no-underline">
                        <p className="text-2xl font-bold tabular-nums" style={{ color: '#e1e3e5' }}>
                            {loading ? '–' : s.value}
                        </p>
                        <p className="text-xs uppercase mt-0.5 font-medium" style={{ color: '#678', letterSpacing: '0.15em' }}>{s.label}</p>
                    </Link>
                ))}
            </div>

            {/* Recent Films */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold uppercase" style={{ color: '#9ab', letterSpacing: '0.1em' }}>Recent Films</h2>
                    <Link href="/movies" className="text-xs no-underline" style={{ color: '#678' }}>View All →</Link>
                </div>
                {loading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-shimmer aspect-[2/3]" style={{ borderRadius: '4px' }} />
                        ))}
                    </div>
                ) : recentMovies.length === 0 ? (
                    <div className="py-10 text-center" style={{ border: '1px dashed #2c3440', borderRadius: '4px' }}>
                        <p className="text-sm" style={{ color: '#678' }}>No films yet</p>
                        <Link href="/search?tab=movies" className="text-xs mt-2 inline-block no-underline" style={{ color: '#00e054' }}>Search and add films →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {recentMovies.map((movie) => (
                            <Link key={movie.id} href={`/movies/${movie.id}`} className="group no-underline">
                                <div className="poster-card aspect-[2/3]" style={{ background: '#1c2228' }}>
                                    {movie.poster_url ? (
                                        <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-medium" style={{ color: '#556', background: '#242c34' }}>NO IMAGE</div>
                                    )}
                                </div>
                                <p className="text-xs mt-1.5 truncate leading-tight" style={{ color: '#9ab' }}>{movie.title}</p>
                                <div className="mt-0.5">
                                    <StarRating value={movie.rating || 0} readonly size="sm" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>

            {/* Recent Books */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold uppercase" style={{ color: '#9ab', letterSpacing: '0.1em' }}>Recent Books</h2>
                    <Link href="/books" className="text-xs no-underline" style={{ color: '#678' }}>View All →</Link>
                </div>
                {loading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="animate-shimmer aspect-[2/3]" style={{ borderRadius: '4px' }} />
                        ))}
                    </div>
                ) : recentBooks.length === 0 ? (
                    <div className="py-10 text-center" style={{ border: '1px dashed #2c3440', borderRadius: '4px' }}>
                        <p className="text-sm" style={{ color: '#678' }}>No books yet</p>
                        <Link href="/search?tab=books" className="text-xs mt-2 inline-block no-underline" style={{ color: '#00e054' }}>Search and add books →</Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {recentBooks.map((book) => (
                            <Link key={book.id} href={`/books/${book.id}`} className="group no-underline">
                                <div className="poster-card aspect-[2/3]" style={{ background: '#1c2228' }}>
                                    {book.cover_url ? (
                                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-sm font-medium" style={{ color: '#556', background: '#242c34' }}>NO IMAGE</div>
                                    )}
                                </div>
                                <p className="text-xs mt-1.5 truncate leading-tight" style={{ color: '#9ab' }}>{book.title}</p>
                                <div className="mt-0.5">
                                    <StarRating value={book.rating || 0} readonly size="sm" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
