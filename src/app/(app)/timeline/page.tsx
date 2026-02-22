'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import StarRating from '@/components/ui/StarRating';
import Card from '@/components/ui/Card';

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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadTimeline();
    }, []);

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
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="app-topbar">
                <div className="app-topbar-main">
                    <div>
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Timeline</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">Your culture history — {entries.length} entries</p>
                    </div>
                    <div className="app-pill-group">
                        {(['all', 'movie', 'book'] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`app-pill-btn ${filterType === t ? 'is-active' : ''}`}
                            >
                                {t === 'all' ? 'All' : t === 'movie' ? 'Films' : 'Books'}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="animate-shimmer rounded-[8px] aspect-[2/3]" />
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <Card hover={false}>
                    <div className="py-14 text-center">
                        <p className="text-lg font-medium mb-2" style={{ color: '#7c8591' }}>No Timeline Data</p>
                        <p className="text-sm text-[var(--text-muted)]">Add films or books to your collection to see your timeline</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-8">
                    {months.map((monthKey) => {
                        const d = new Date(monthKey + '-01');
                        const label = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }).toUpperCase();
                        return (
                            <section key={monthKey} className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-[#2f343d]">
                                    <span className="w-2.5 h-2.5 rounded-full border border-[#5b626d] bg-transparent" />
                                    <span className="text-[13px] font-semibold tracking-[0.08em]" style={{ color: '#9ea5af' }}>{label}</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {grouped[monthKey].map(entry => (
                                        <Card key={entry.id} className="p-0 overflow-hidden group relative">
                                            <Link
                                                href={entry.type === 'movie' ? `/movies/${entry.id}` : `/books/${entry.id}`}
                                                className="no-underline"
                                            >
                                                <div className="aspect-[2/3] bg-[var(--bg-tertiary)] relative">
                                                    {entry.image_url ? (
                                                        <img src={entry.image_url} alt={entry.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-xs font-medium" style={{ color: '#556' }}>NO IMAGE</div>
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                                    <div className="absolute top-2 left-2">
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-black/65 text-[#dfe4ea] border border-white/10">
                                                            {entry.type === 'movie' ? (entry.media_type === 'tv' ? 'TV' : 'Film') : 'Book'}
                                                        </span>
                                                    </div>
                                                    <div className="absolute bottom-2 left-2 right-2">
                                                        <p className="text-sm font-medium truncate text-white">{entry.title}</p>
                                                        <p className="text-xs text-[#a8b0ba]">
                                                            {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        </p>
                                                        <div className="mt-1">
                                                            <StarRating value={entry.rating || 0} readonly size="sm" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </Card>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
