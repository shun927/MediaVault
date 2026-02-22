'use client';

import { useEffect, useState, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { Movie, Tag } from '@/lib/types';
import Link from 'next/link';

export default function MoviesPage() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', search: '', tagId: '' });
    const [sort, setSort] = useState('created_at');
    const [editMovie, setEditMovie] = useState<Movie | null>(null);
    const [editForm, setEditForm] = useState({ rating: 0, status: 'wishlist', note: '', selectedTags: [] as string[], watchedEpisode: 0 });

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
            setTags((allTags as Tag[]) || []);

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

    useEffect(() => { loadMovies(); }, [loadMovies]);

    async function handleDelete(id: string) {
        if (!confirm('Delete this title from your collection?')) return;
        const supabase = createClient();
        await supabase.from('movies').delete().eq('id', id);
        loadMovies();
    }

    async function handleEdit() {
        if (!editMovie) return;
        const supabase = createClient();
        await supabase.from('movies').update({
            rating: editForm.rating,
            status: editForm.status,
            note: editForm.note,
            watched_episode: editMovie.media_type === 'tv' ? (editForm.watchedEpisode || null) : null,
            updated_at: new Date().toISOString(),
        }).eq('id', editMovie.id);

        // タグ更新
        await supabase.from('movie_tags').delete().eq('movie_id', editMovie.id);
        if (editForm.selectedTags.length > 0) {
            await supabase.from('movie_tags').insert(
                editForm.selectedTags.map(tagId => ({ movie_id: editMovie.id, tag_id: tagId }))
            );
        }

        setEditMovie(null);
        loadMovies();
    }

    function openEditModal(movie: Movie) {
        setEditMovie(movie);
        setEditForm({
            rating: movie.rating || 0,
            status: movie.status,
            note: movie.note || '',
            selectedTags: movie.tags?.map(t => t.id) || [],
            watchedEpisode: movie.watched_episode || 0,
        });
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: '#e1e3e5' }}>Films</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{movies.length} titles</p>
                </div>
                <Link href="/search?tab=movies">
                    <Button>+ Add Film</Button>
                </Link>
            </div>

            {/* フィルターバー */}
            <Card hover={false} className="flex flex-col sm:flex-row gap-3">
                <Input
                    placeholder="タイトルで検索..."
                    value={filter.search}
                    onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                    className="flex-1"
                />
                <Select
                    value={filter.status}
                    onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                    options={[
                        { value: '', label: 'All' },
                        { value: 'watched', label: 'Watched' },
                        { value: 'watching', label: 'Watching' },
                        { value: 'wishlist', label: 'Wishlist' },
                    ]}
                />
                <Select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    options={[
                        { value: 'created_at', label: 'Recent' },
                        { value: 'title', label: 'Title' },
                        { value: 'rating', label: 'Rating' },
                    ]}
                />
            </Card>

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
                                        <img
                                            src={movie.poster_url}
                                            alt={movie.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-medium" style={{ color: '#556' }}>NO IMAGE</div>
                                    )}
                                    {/* Media type badge */}
                                    <div className="absolute top-2 left-2">
                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${movie.media_type === 'tv'
                                            ? 'bg-purple-500/80 text-white'
                                            : 'bg-blue-500/80 text-white'
                                            }`}>
                                            {movie.media_type === 'tv' ? 'TV' : 'Film'}
                                        </span>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <p className="text-sm font-medium truncate">{movie.title}</p>
                                        {movie.year && <p className="text-xs text-[var(--text-muted)]">{movie.year}</p>}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <StarRating value={movie.rating || 0} readonly size="sm" />
                                        </div>
                                        <div className="mt-1.5">
                                            <StatusBadge status={movie.status} />
                                        </div>
                                        {movie.media_type === 'tv' && movie.watched_episode && (
                                            <p className="text-[10px] text-purple-300 mt-1">Ep. {movie.watched_episode}{movie.number_of_episodes ? ` / ${movie.number_of_episodes}` : ''}</p>
                                        )}
                                        {movie.tags && movie.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {movie.tags.slice(0, 2).map(tag => (
                                                    <Badge key={tag.id} label={tag.name} color={tag.color} size="sm" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                            {/* アクションボタン */}
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.preventDefault(); openEditModal(movie); }}
                                    className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleDelete(movie.id); }}
                                    className="p-1.5 rounded-lg bg-black/60 text-red-400 hover:bg-black/80 transition-colors cursor-pointer"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* 編集モーダル */}
            <Modal isOpen={!!editMovie} onClose={() => setEditMovie(null)} title="Edit Film">
                {editMovie && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            {editMovie.poster_url && (
                                <img src={editMovie.poster_url} alt="" className="w-12 h-18 rounded-lg object-cover" />
                            )}
                            <div>
                                <p className="font-medium">{editMovie.title}</p>
                                {editMovie.year && <p className="text-xs text-[var(--text-muted)]">{editMovie.year}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rating</label>
                            <StarRating value={editForm.rating} onChange={(v) => setEditForm(prev => ({ ...prev, rating: v }))} size="lg" />
                        </div>

                        <Select
                            label="Status"
                            value={editForm.status}
                            onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                            options={[
                                { value: 'watched', label: 'Watched' },
                                { value: 'watching', label: 'Watching' },
                                { value: 'wishlist', label: 'Wishlist' },
                            ]}
                        />

                        {/* TV用進捗入力 */}
                        {editMovie.media_type === 'tv' && (
                            <div className="p-3 rounded-[4px] border border-[var(--border)] bg-[var(--bg-tertiary)] space-y-2">
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Watch Progress</label>
                                {editMovie.number_of_seasons && (
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {editMovie.number_of_seasons} season{editMovie.number_of_seasons > 1 ? 's' : ''}
                                        {editMovie.number_of_episodes && ` · ${editMovie.number_of_episodes} episodes`}
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-[var(--text-muted)] whitespace-nowrap">Watched up to episode</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={editMovie.number_of_episodes || 9999}
                                        value={editForm.watchedEpisode || ''}
                                        onChange={e => setEditForm(prev => ({ ...prev, watchedEpisode: parseInt(e.target.value) || 0 }))}
                                        className="w-20 px-2 py-1 text-sm rounded-[4px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        )}

                        <Textarea
                            label="Notes"
                            placeholder="Write your thoughts..."
                            value={editForm.note}
                            onChange={(e) => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                        />

                        {tags.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => {
                                                setEditForm(prev => ({
                                                    ...prev,
                                                    selectedTags: prev.selectedTags.includes(tag.id)
                                                        ? prev.selectedTags.filter(id => id !== tag.id)
                                                        : [...prev.selectedTags, tag.id],
                                                }));
                                            }}
                                            className={`cursor-pointer ${editForm.selectedTags.includes(tag.id) ? 'ring-2 ring-white/30' : ''} rounded-full`}
                                        >
                                            <Badge label={tag.name} color={tag.color} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button onClick={handleEdit} className="flex-1">Save</Button>
                            <Button variant="ghost" onClick={() => setEditMovie(null)}>Cancel</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
