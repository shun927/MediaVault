'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import StarRating from '@/components/ui/StarRating';

interface TimelineEntry {
    id: string;
    type: 'movie' | 'book';
    title: string;
    image_url: string | null;
    rating: number | null;
    date: string;
    note: string | null;
    media_type?: string;
    year?: number | null;
}

export default function TimelinePage() {
    const [entries, setEntries] = useState<TimelineEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'all' | 'movie' | 'book'>('all');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadTimeline(); }, []);

    async function loadTimeline() {
        const supabase = createClient();
        const [{ data: movies }, { data: books }] = await Promise.all([
            supabase.from('movies').select('*').order('watched_at', { ascending: false }),
            supabase.from('books').select('*').order('read_at', { ascending: false }),
        ]);

        const movieEntries: TimelineEntry[] = (movies || []).map(m => ({
            id: m.id,
            type: 'movie' as const,
            title: m.title,
            image_url: m.poster_url,
            rating: m.rating,
            date: m.watched_at || m.created_at,
            note: m.note,
            media_type: m.media_type,
            year: m.year,
        }));

        const bookEntries: TimelineEntry[] = (books || []).map(b => ({
            id: b.id,
            type: 'book' as const,
            title: b.title,
            image_url: b.cover_url,
            rating: b.rating,
            date: b.read_at || b.created_at,
            note: b.note,
            year: b.year,
        }));

        const all = [...movieEntries, ...bookEntries].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setEntries(all);
        setLoading(false);
    }

    const filtered = filterType === 'all' ? entries : entries.filter(e => e.type === filterType);

    // Group by month
    const grouped: Record<string, TimelineEntry[]> = {};
    for (const entry of filtered) {
        const d = new Date(entry.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(entry);
    }

    const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: '#e1e3e5' }}>Timeline</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">Your culture history — {entries.length} entries</p>
                </div>
                <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {(['all', 'movie', 'book'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setFilterType(t)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-[4px] transition-all cursor-pointer ${filterType === t
                                    ? 'bg-[var(--accent)] text-[#14181c]'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {t === 'all' ? 'All' : t === 'movie' ? 'Films' : 'Books'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex gap-6 overflow-hidden">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="animate-shimmer rounded-xl h-64 w-48 shrink-0" />
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <div className="py-16 text-center" style={{ border: '1px dashed #2c3440', borderRadius: '8px' }}>
                    <p className="text-lg font-medium mb-2" style={{ color: '#556' }}>No Timeline Data</p>
                    <p className="text-sm text-[var(--text-muted)]">
                        Add films or books to your collection to see your timeline
                    </p>
                </div>
            ) : (
                /* Horizontal scrolling timeline */
                <div className="relative">
                    {/* Horizontal line */}
                    <div className="absolute top-[18px] left-0 right-0 h-px" style={{ background: '#2c3440' }} />

                    <div
                        ref={scrollRef}
                        className="flex gap-0 overflow-x-auto pb-4 scrollbar-thin"
                        style={{ scrollbarColor: '#2c3440 transparent' }}
                    >
                        {months.map(monthKey => {
                            const d = new Date(monthKey + '-01');
                            const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                            return (
                                <div key={monthKey} className="shrink-0 pr-2">
                                    {/* Month marker */}
                                    <div className="flex items-center gap-2 mb-4 relative">
                                        <div className="w-3 h-3 rounded-full border-2 z-10 shrink-0" style={{ borderColor: '#00e054', background: '#14181c' }} />
                                        <span className="text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: '#9ab' }}>
                                            {label}
                                        </span>
                                    </div>

                                    {/* Cards in this month */}
                                    <div className="flex gap-2 ml-1.5">
                                        {grouped[monthKey].map(entry => (
                                            <Link
                                                key={entry.id}
                                                href={entry.type === 'movie' ? `/movies/${entry.id}` : `/books/${entry.id}`}
                                                className="group no-underline shrink-0 w-[120px]"
                                            >
                                                {/* Poster */}
                                                <div className="w-[120px] aspect-[2/3] rounded-lg overflow-hidden border border-transparent group-hover:border-[var(--accent)] transition-all relative" style={{ background: '#242c34' }}>
                                                    {entry.image_url ? (
                                                        <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-medium" style={{ color: '#556' }}>NO IMAGE</div>
                                                    )}
                                                    {/* Gradient overlay at bottom */}
                                                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                                                    {/* Type badge */}
                                                    <div className="absolute bottom-1.5 left-1.5">
                                                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase backdrop-blur-sm ${entry.type === 'movie'
                                                                ? (entry.media_type === 'tv' ? 'bg-purple-500/80 text-white' : 'bg-blue-500/80 text-white')
                                                                : 'bg-emerald-500/80 text-white'
                                                            }`}>
                                                            {entry.type === 'movie' ? (entry.media_type === 'tv' ? 'TV' : 'Film') : 'Book'}
                                                        </span>
                                                    </div>
                                                    {/* Rating */}
                                                    {entry.rating != null && entry.rating > 0 && (
                                                        <div className="absolute bottom-1.5 right-1.5">
                                                            <span className="text-[10px] font-bold text-yellow-400/90">{'★'.repeat(entry.rating)}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Title */}
                                                <p className="text-[11px] mt-1.5 leading-tight line-clamp-2 text-[var(--text-secondary)] group-hover:text-[var(--accent)] transition-colors">
                                                    {entry.title}
                                                </p>
                                                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
