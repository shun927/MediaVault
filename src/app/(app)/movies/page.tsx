'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase';
import type { Movie, Tag } from '@/lib/types';
import { MOVIE_STATUS_OPTIONS } from '@/lib/status';
import Link from 'next/link';

export default function MoviesPage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', search: '', tagId: '' });
    const [sort, setSort] = useState('created_at');

    const loadMovies = useCallback(async () => {
        const supabase = createClient();
        let query = supabase.from('movies').select('*').order(sort, { ascending: sort === 'title' });

        if (filter.status) query = query.eq('status', filter.status);
        if (filter.search) query = query.ilike('title', `%${filter.search}%`);

        const { data } = await query;
        let movieList = (data as Movie[]) || [];

        // タグフィルター
        if (filter.tagId) {
            const { data: movieTagData } = await supabase.from('movie_tags').select('movie_id').eq('tag_id', filter.tagId);
            const movieIds = new Set((movieTagData || []).map(mt => mt.movie_id));
            movieList = movieList.filter(m => movieIds.has(m.id));
        }

        // 映画ごとのタグを取得
        if (movieList.length > 0) {
            const movieIds = movieList.map(m => m.id);
            const { data: movieTagsData } = await supabase
                .from('movie_tags')
                .select('movie_id, tag_id')
                .in('movie_id', movieIds);

            const { data: allTags } = await supabase.from('tags').select('*');

            const tagMap = new Map((allTags as Tag[] || []).map(t => [t.id, t]));
            movieList = movieList.map(movie => ({
                ...movie,
                tags: (movieTagsData || [])
                    .filter(mt => mt.movie_id === movie.id)
                    .map(mt => tagMap.get(mt.tag_id))
                    .filter(Boolean) as Tag[],
            }));
        }

        setMovies(movieList);
        setLoading(false);
    }, [filter, sort]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadMovies();
    }, [loadMovies]);

    return (
        <div className="w-full">
            <div className="app-topbar">
                <div className="app-topbar-controls">
                    <div className="app-topbar-title">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Films</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{movies.length} titles</p>
                    </div>
                    <div className="app-topbar-controls ml-auto">
                        <input
                            className="app-control-input"
                            placeholder="Search titles..."
                            value={filter.search}
                            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                        />
                        <select className="app-control-select" value={filter.status} onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}>
                            <option value="">All</option>
                            {MOVIE_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                        <select className="app-control-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="created_at">Recent</option>
                            <option value="title">Title</option>
                            <option value="rating">Rating</option>
                        </select>
                        <Link href="/search?tab=movies">
                            <Button>+ Add Film</Button>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 lg:px-9 pt-5 pb-8">
                {/* 映画グリッド */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="animate-shimmer rounded-xl aspect-[2/3]" />
                        ))}
                    </div>
                ) : movies.length === 0 ? (
                    <Card hover={false}>
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <p className="text-lg mb-2 font-medium" style={{ color: '#556' }}>No Films</p>
                            <Link href="/search?tab=movies" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">
                                Search and add films →
                            </Link>
                        </div>
                    </Card>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {movies.map((movie) => (
                            <Card key={movie.id} className="p-0 overflow-hidden group relative">
                                <Link href={`/movies/${movie.id}`}>
                                    <div className="aspect-[2/3] bg-[var(--bg-tertiary)] relative">
                                        {movie.poster_url ? (
                                            <Image
                                                src={movie.poster_url}
                                                alt={movie.title}
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
                                            <p className="text-sm font-medium leading-snug text-[var(--text-primary)] line-clamp-2">{movie.title}</p>
                                            <span
                                                className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                                style={{ backgroundColor: 'var(--media-accent-soft)', color: 'var(--media-accent)' }}
                                            >
                                                {movie.media_type === 'tv' ? 'TV' : 'Film'}
                                            </span>
                                        </div>
                                        {movie.year && <p className="text-xs text-[var(--text-muted)]">{movie.year}</p>}
                                        <div className="flex items-center gap-2">
                                            <StarRating value={movie.rating || 0} readonly size="sm" />
                                        </div>
                                        <StatusBadge status={movie.status} />
                                        {movie.media_type === 'tv' && movie.watched_episode && (
                                            <p className="text-[10px] text-[var(--text-muted)]">Ep. {movie.watched_episode}{movie.number_of_episodes ? ` / ${movie.number_of_episodes}` : ''}</p>
                                        )}
                                        {movie.tags && movie.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {movie.tags.slice(0, 2).map(tag => (
                                                    <Badge key={tag.id} label={tag.name} color={tag.color} size="sm" />
                                                ))}
                                            </div>
                                        )}
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
