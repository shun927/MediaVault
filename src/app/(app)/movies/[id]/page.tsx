'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { Movie, Tag, ViewingHistory } from '@/lib/types';
import { MOVIE_STATUS_OPTIONS } from '@/lib/status';
import Link from 'next/link';

export default function MovieDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [movie, setMovie] = useState<Movie | null>(null);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [history, setHistory] = useState<ViewingHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingMeta, setSavingMeta] = useState(false);
    const [editMeta, setEditMeta] = useState({
        rating: 0,
        status: 'wishlist',
        note: '',
        selectedTags: [] as string[],
        numberOfEpisodes: 0,
        watchedEpisode: 0,
    });
    const [showHistoryForm, setShowHistoryForm] = useState(false);
    const [historyForm, setHistoryForm] = useState({ date: new Date().toISOString().slice(0, 10), note: '' });
    const [savingHistory, setSavingHistory] = useState(false);

    const loadMovie = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase.from('movies').select('*').eq('id', params.id).single();
        if (!data) { router.push('/movies'); return; }

        const [{ data: movieTags }, { data: historyData }, { data: allTagData }] = await Promise.all([
            supabase.from('movie_tags').select('tag_id').eq('movie_id', params.id),
            supabase.from('viewing_history').select('*').eq('movie_id', params.id).order('watched_at', { ascending: false }),
            supabase.from('tags').select('*').order('name'),
        ]);

        const selectedTagIds = (movieTags || []).map(mt => mt.tag_id);
        const availableTags = (allTagData as Tag[]) || [];
        setAllTags(availableTags);
        setEditMeta({
            rating: (data as Movie).rating || 0,
            status: (data as Movie).status,
            note: (data as Movie).note || '',
            selectedTags: selectedTagIds,
            numberOfEpisodes: (data as Movie).number_of_episodes || 0,
            watchedEpisode: (data as Movie).watched_episode || 0,
        });

        setHistory((historyData as ViewingHistory[]) || []);
        setMovie(data as Movie);
        setLoading(false);
    }, [params.id, router]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadMovie();
    }, [loadMovie]);

    async function handleSaveMeta() {
        if (!movie) return;
        setSavingMeta(true);
        const supabase = createClient();
        const movingToWatched = movie.status !== 'watched' && editMeta.status === 'watched';
        await supabase.from('movies').update({
            rating: editMeta.rating || null,
            status: editMeta.status,
            note: editMeta.note.trim() || null,
            watched_at: editMeta.status === 'watched' ? new Date().toISOString() : movie.watched_at,
            number_of_episodes: movie.media_type === 'tv' ? (editMeta.numberOfEpisodes || null) : null,
            watched_episode: movie.media_type === 'tv' ? (editMeta.watchedEpisode || null) : null,
            updated_at: new Date().toISOString(),
        }).eq('id', movie.id);

        await supabase.from('movie_tags').delete().eq('movie_id', movie.id);
        if (editMeta.selectedTags.length > 0) {
            await supabase.from('movie_tags').insert(
                editMeta.selectedTags.map(tagId => ({ movie_id: movie.id, tag_id: tagId }))
            );
        }

        if (movingToWatched) {
            const today = new Date().toISOString().slice(0, 10);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: existingToday } = await supabase
                    .from('viewing_history')
                    .select('id, watched_at')
                    .eq('movie_id', movie.id)
                    .gte('watched_at', `${today}T00:00:00.000Z`)
                    .lt('watched_at', `${today}T23:59:59.999Z`)
                    .limit(1);

                if (!existingToday || existingToday.length === 0) {
                    await supabase.from('viewing_history').insert({
                        movie_id: movie.id,
                        user_id: user.id,
                        watched_at: new Date().toISOString(),
                        note: null,
                    });
                }
            }
        }

        setSavingMeta(false);
        await loadMovie();
    }

    async function handleAddHistory() {
        if (!movie) return;
        setSavingHistory(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setSavingHistory(false);
            return;
        }

        await supabase.from('viewing_history').insert({
            movie_id: movie.id,
            user_id: user.id,
            watched_at: new Date(historyForm.date).toISOString(),
            note: historyForm.note.trim() || null,
        });

        setHistoryForm({ date: new Date().toISOString().slice(0, 10), note: '' });
        setShowHistoryForm(false);
        setSavingHistory(false);
        await loadMovie();
    }

    async function handleDeleteHistory(historyId: string) {
        const supabase = createClient();
        await supabase.from('viewing_history').delete().eq('id', historyId);
        await loadMovie();
    }

    async function handleSaveAll() {
        await handleSaveMeta();
        if (showHistoryForm) {
            await handleAddHistory();
        }
    }

    async function handleDelete() {
        if (!confirm('Delete this title from your collection?')) return;
        const supabase = createClient();
        await supabase.from('viewing_history').delete().eq('movie_id', params.id);
        await supabase.from('movie_tags').delete().eq('movie_id', params.id);
        await supabase.from('movies').delete().eq('id', params.id);
        router.push('/movies');
    }

    if (loading) return (
        <div className="max-w-4xl mx-auto">
            <div className="animate-shimmer rounded-lg h-64 mb-6" />
            <div className="animate-shimmer rounded h-8 w-48 mb-3" />
            <div className="animate-shimmer rounded h-4 w-32" />
        </div>
    );

    if (!movie) return null;

    return (
        <div className="detail-page-shell">
            <div className="detail-page-header">
                <div className="detail-page-back-slot">
                    <Link
                        href="/movies"
                        className="detail-page-back-link"
                    >
                        ← Back to Films
                    </Link>
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{movie.title}</h1>
                    {movie.year && <p className="text-[var(--text-muted)] mt-1">{movie.year}</p>}
                    {movie.director && <p className="text-sm text-[var(--text-muted)]">Directed by {movie.director}</p>}
                </div>
            </div>

            <div className="detail-page-media-row">
                {/* Poster */}
                <div className="detail-page-poster-wrap">
                    <div className="detail-page-poster-box aspect-[2/3] relative">
                        {movie.poster_url ? (
                            <Image src={movie.poster_url} alt={movie.title} fill sizes="(max-width: 640px) 100vw, 224px" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-medium text-[var(--text-muted)]">NO IMAGE</div>
                        )}
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                    {movie.overview && (
                        <div>
                            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Overview</h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{movie.overview}</p>
                        </div>
                    )}

                    <Card hover={false} className="space-y-4">
                        <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">My Info</h3>

                        <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-y-2 gap-x-3 text-sm leading-relaxed">
                            <span className="text-[var(--text-muted)]">Rating</span>
                            <div className="flex items-center gap-2">
                                <StarRating value={movie.rating || 0} readonly size="sm" />
                                <span className="text-[var(--text-secondary)]">{movie.rating ? `${movie.rating}/5` : 'Not rated'}</span>
                            </div>

                            {movie.media_type === 'tv' && (
                                <>
                                    <span className="text-[var(--text-muted)]">Progress</span>
                                    <span className="text-[var(--text-secondary)]">
                                        Ep. {movie.watched_episode || 0}
                                        {movie.number_of_episodes ? ` / ${movie.number_of_episodes}` : ''}
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="border-t border-[var(--border)] pt-3">
                            <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Tags</h4>
                            {editMeta.selectedTags.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {allTags
                                        .filter((tag) => editMeta.selectedTags.includes(tag.id))
                                        .map((tag) => (
                                            <Badge key={tag.id} label={tag.name} color={tag.color} />
                                        ))}
                                </div>
                            ) : (
                                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">No tags</p>
                            )}
                        </div>

                        <div className="border-t border-[var(--border)] pt-3">
                            <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Comment</h4>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{movie.note || 'No comment'}</p>
                        </div>
                        <div className="border-t border-[var(--border)] pt-3">
                            <div className="mb-3">
                                <h4 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                    Watch History
                                    {history.length > 0 && <span className="ml-2 text-[var(--text-primary)]">({history.length})</span>}
                                </h4>
                            </div>

                            {history.length > 0 ? (
                                <div className="space-y-1.5">
                                    {history.map(h => (
                                        <div key={h.id} className="flex items-start justify-between gap-3 px-3 py-2 rounded-[4px] border border-[var(--border)] bg-[var(--bg-secondary)]">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <svg className="w-4 h-4 shrink-0 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                <div className="min-w-0">
                                                    <p className="text-sm text-[var(--text-primary)]">
                                                        {new Date(h.watched_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </p>
                                                    {h.note && <p className="text-xs text-[var(--text-muted)] truncate">{h.note}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] italic">No watch history logged yet</p>
                            )}
                        </div>
                    </Card>

                    <Card hover={false} className="space-y-3 !bg-[var(--bg-tertiary)] border border-[var(--border)]">
                        <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Edit Settings</h3>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rating</label>
                            <StarRating value={editMeta.rating} onChange={(v) => setEditMeta(prev => ({ ...prev, rating: v }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Status</label>
                            <select
                                value={editMeta.status}
                                onChange={(e) => setEditMeta(prev => ({ ...prev, status: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-[8px] bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:border-[var(--input-focus)] focus:outline-none"
                            >
                                {MOVIE_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        {movie.media_type === 'tv' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Total Episodes</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={editMeta.numberOfEpisodes || ''}
                                        onChange={(e) => setEditMeta(prev => ({ ...prev, numberOfEpisodes: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 text-sm rounded-[8px] bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:border-[var(--input-focus)] focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Watched Episode</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={editMeta.numberOfEpisodes || undefined}
                                        value={editMeta.watchedEpisode || ''}
                                        onChange={(e) => setEditMeta(prev => ({ ...prev, watchedEpisode: parseInt(e.target.value) || 0 }))}
                                        className="w-full px-3 py-2 text-sm rounded-[8px] bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:border-[var(--input-focus)] focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        )}
                        {allTags.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {allTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            onClick={() => setEditMeta(prev => ({
                                                ...prev,
                                                selectedTags: prev.selectedTags.includes(tag.id)
                                                    ? prev.selectedTags.filter(id => id !== tag.id)
                                                    : [...prev.selectedTags, tag.id],
                                            }))}
                                            className={`cursor-pointer rounded-full ${editMeta.selectedTags.includes(tag.id) ? 'ring-2 ring-white/30' : ''}`}
                                        >
                                            <Badge label={tag.name} color={tag.color} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Textarea
                            label="Comment"
                            placeholder="Write your thoughts..."
                            value={editMeta.note}
                            onChange={(e) => setEditMeta(prev => ({ ...prev, note: e.target.value }))}
                        />
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Watch History (Edit)</label>
                                <button
                                    onClick={() => setShowHistoryForm(!showHistoryForm)}
                                    className="detail-page-history-trigger text-xs font-medium px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer"
                                >
                                    + Log Rewatch
                                </button>
                            </div>
                            {showHistoryForm && (
                                <div className="space-y-3 mb-3 p-3 rounded-[4px] border border-[var(--border)] bg-[var(--bg-secondary)]">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={historyForm.date}
                                            onChange={e => setHistoryForm(p => ({ ...p, date: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm rounded-[4px] bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Note (optional)</label>
                                        <input
                                            type="text"
                                            value={historyForm.note}
                                            onChange={e => setHistoryForm(p => ({ ...p, note: e.target.value }))}
                                            placeholder="Thoughts on this rewatch..."
                                            className="w-full px-3 py-2 text-sm rounded-[4px] bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none placeholder:text-[var(--text-muted)]"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <p className="text-xs text-[var(--text-muted)] self-center">Use "Save Changes" below to add this log.</p>
                                        <Button variant="secondary" onClick={() => setShowHistoryForm(false)}>Cancel</Button>
                                    </div>
                                </div>
                            )}
                            {history.length > 0 ? (
                                <div className="space-y-1.5">
                                    {history.map(h => (
                                        <div key={`edit-${h.id}`} className="flex items-start justify-between gap-3 px-3 py-2 rounded-[4px] border border-[var(--border)] bg-[var(--bg-secondary)]">
                                            <p className="text-sm text-[var(--text-primary)]">
                                                {new Date(h.watched_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteHistory(h.id)}
                                                className="p-1 rounded text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-[var(--text-muted)] italic">No watch history to edit</p>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button onClick={handleSaveAll} isLoading={savingMeta || savingHistory}>Save Changes</Button>
                            <StatusBadge status={editMeta.status} />
                        </div>
                    </Card>

                    <div className="flex gap-2 pt-2">
                        <Button variant="danger" onClick={handleDelete}>Delete</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
