'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import StatusBadge from '@/components/ui/StatusBadge';
import { createClient } from '@/lib/data-client';
import type { Music } from '@/lib/types';
import { MUSIC_STATUS_OPTIONS } from '@/lib/status';

export default function MusicPage() {
    const [music, setMusic] = useState<Music[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', search: '' });
    const [sort, setSort] = useState('created_at');

    const loadMusic = useCallback(async () => {
        const dataClient = createClient();
        let query = dataClient.from('music').select('*').order(sort, { ascending: sort === 'title' });

        if (filter.status) query = query.eq('status', filter.status);
        if (filter.search) query = query.ilike('title', `%${filter.search}%`);

        const { data } = await query;
        setMusic((data as Music[]) || []);
        setLoading(false);
    }, [filter, sort]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadMusic();
    }, [loadMusic]);

    return (
        <div className="w-full">
            <div className="app-topbar">
                <div className="app-topbar-controls">
                    <div className="app-topbar-title">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Music</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{music.length} titles</p>
                    </div>
                    <div className="app-topbar-controls ml-auto">
                        <input
                            className="app-control-input"
                            placeholder="Search titles..."
                            value={filter.search}
                            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
                        />
                        <select className="app-control-select" value={filter.status} onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}>
                            <option value="">All</option>
                            {MUSIC_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <select className="app-control-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="created_at">Recent</option>
                            <option value="title">Title</option>
                            <option value="rating">Rating</option>
                        </select>
                        <Link href="/search?tab=music">
                            <Button>+ Add Music</Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 lg:px-9 pt-5 pb-8">
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="animate-shimmer rounded aspect-square" />
                        ))}
                    </div>
                ) : music.length === 0 ? (
                    <Card hover={false}>
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <p className="text-lg mb-2 font-medium" style={{ color: '#556' }}>No Music</p>
                            <Link href="/search?tab=music" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">
                                Search and add music →
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {music.map((item) => (
                            <Card key={item.id} className="p-0 overflow-hidden group relative">
                                <Link href={`/music/${item.id}`}>
                                    <div className="aspect-square bg-[var(--bg-tertiary)] relative">
                                        {item.artwork_url ? (
                                            <Image
                                                src={item.artwork_url}
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
                                        <div className="flex items-start gap-2">
                                            <p className="text-sm font-medium leading-snug text-[var(--text-primary)] line-clamp-2">{item.title}</p>
                                            <span
                                                className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                                style={{ backgroundColor: 'var(--media-accent-soft)', color: 'var(--media-accent)' }}
                                            >
                                                {item.type}
                                            </span>
                                        </div>
                                        {item.artist && <p className="text-xs text-[var(--text-muted)] line-clamp-1">{item.artist}</p>}
                                        <div className="flex items-center gap-2">
                                            <StarRating value={item.rating || 0} readonly size="sm" />
                                        </div>
                                        <StatusBadge status={item.status} />
                                    </div>
                                </Link>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
