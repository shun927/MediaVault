'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import StarRating from '@/components/ui/StarRating';
import StatusBadge from '@/components/ui/StatusBadge';
import { createClient } from '@/lib/data-client';
import type { Book, Movie, Music } from '@/lib/types';
import { getRawStatusesForSidebarFilter, isSidebarStatusFilter, SIDEBAR_STATUS_OPTIONS } from '@/lib/status';

export default function StatusPage() {
    return (
        <Suspense fallback={<div className="w-full" />}>
            <StatusPageContent />
        </Suspense>
    );
}

function StatusPageContent() {
    const searchParams = useSearchParams();
    const viewParam = searchParams.get('view');
    const view = isSidebarStatusFilter(viewParam) ? viewParam : 'in-progress';
    const allowedStatuses = useMemo(() => getRawStatusesForSidebarFilter(view), [view]);

    const [movies, setMovies] = useState<Movie[]>([]);
    const [books, setBooks] = useState<Book[]>([]);
    const [music, setMusic] = useState<Music[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const dataClient = createClient();
            const [{ data: movieData }, { data: bookData }, { data: musicData }] = await Promise.all([
                dataClient.from('movies').select('*').in('status', allowedStatuses).order('updated_at', { ascending: false }),
                dataClient.from('books').select('*').in('status', allowedStatuses).order('updated_at', { ascending: false }),
                dataClient.from('music').select('*').in('status', allowedStatuses).order('updated_at', { ascending: false }),
            ]);

            setMovies((movieData as Movie[]) || []);
            setBooks((bookData as Book[]) || []);
            setMusic((musicData as Music[]) || []);
            setLoading(false);
        }
        void load();
    }, [allowedStatuses]);

    const activeLabel = SIDEBAR_STATUS_OPTIONS.find((option) => option.value === view)?.label || 'Status';
    const total = movies.length + books.length + music.length;

    return (
        <div className="w-full">
            <div className="app-topbar">
                <div className="app-topbar-main">
                    <div className="app-topbar-title">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{activeLabel}</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{total} titles</p>
                    </div>
                    <div className="app-pill-group">
                        {SIDEBAR_STATUS_OPTIONS.map((option) => (
                            <Link
                                key={option.value}
                                href={`/status?view=${option.value}`}
                                className={`app-pill-btn no-underline ${view === option.value ? 'is-active' : ''}`}
                            >
                                {option.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 lg:px-9 pt-5 pb-8">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className="animate-shimmer rounded-xl aspect-[2/3]" />
                        ))}
                    </div>
                ) : total === 0 ? (
                    <Card hover={false}>
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <p className="text-lg mb-1 font-semibold text-[var(--text-primary)]">No titles in {activeLabel}</p>
                            <p className="text-sm text-[var(--text-muted)]">作品を追加または更新すると、ここに表示されます。</p>
                        </div>
                    </Card>
                ) : (
                    <div className="space-y-7">
                        <StatusSection title="映画・TV" items={movies} hrefPrefix="/movies" />
                        <StatusSection title="本" items={books} hrefPrefix="/books" />
                        <StatusSection title="音楽" items={music} hrefPrefix="/music" />
                    </div>
                )}
                </div>
        </div>
    );
}

function StatusSection({
    title,
    items,
    hrefPrefix,
}: {
    title: string;
    items: (Movie | Book | Music)[];
    hrefPrefix: '/movies' | '/books' | '/music';
}) {
    if (items.length === 0) return null;

    const squareImage = hrefPrefix === '/music';

    function getImageUrl(item: Movie | Book | Music) {
        if (hrefPrefix === '/movies') return (item as Movie).poster_url;
        if (hrefPrefix === '/books') return (item as Book).cover_url;
        return (item as Music).artwork_url;
    }

    return (
        <section className="space-y-3">
            <h2 className="text-base font-bold tracking-[0.06em] uppercase text-[var(--text-muted)]">{title}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {items.map((item) => (
                    <Card key={item.id} className="p-0 overflow-hidden group relative">
                        <Link href={`${hrefPrefix}/${item.id}`}>
                            <div className={`${squareImage ? 'aspect-square' : 'aspect-[2/3]'} bg-[var(--bg-tertiary)] relative`}>
                                {getImageUrl(item) ? (
                                    <Image
                                        src={getImageUrl(item) as string}
                                        alt={item.title}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[var(--text-muted)]">NO IMAGE</div>
                                )}
                            </div>
                            <div className="p-3 space-y-1.5">
                                <p className="text-sm font-medium leading-snug text-[var(--text-primary)] line-clamp-2">{item.title}</p>
                                <div className="flex items-center gap-2">
                                    <StarRating value={item.rating || 0} readonly size="sm" />
                                </div>
                                <StatusBadge status={item.status} />
                            </div>
                        </Link>
                    </Card>
                ))}
            </div>
        </section>
    );
}
