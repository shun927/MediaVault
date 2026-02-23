'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { ListeningHistory, Music, Tag } from '@/lib/types';
import { MUSIC_STATUS_OPTIONS } from '@/lib/status';

export default function MusicDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Music | null>(null);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [history, setHistory] = useState<ListeningHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingMeta, setSavingMeta] = useState(false);
    const [editMeta, setEditMeta] = useState({ rating: 0, status: 'wishlist', note: '', selectedTags: [] as string[] });
    const [showHistoryForm, setShowHistoryForm] = useState(false);
    const [historyForm, setHistoryForm] = useState({ date: new Date().toISOString().slice(0, 10), note: '' });
    const [savingHistory, setSavingHistory] = useState(false);

    const loadMusic = useCallback(async () => {
        const supabase = createClient();
        const { data } = await supabase.from('music').select('*').eq('id', params.id).single();
        if (!data) { router.push('/music'); return; }

        const [{ data: musicTags }, { data: historyData }, { data: allTagData }] = await Promise.all([
            supabase.from('music_tags').select('tag_id').eq('music_id', params.id),
            supabase.from('listening_history').select('*').eq('music_id', params.id).order('listened_at', { ascending: false }),
            supabase.from('tags').select('*').order('name'),
        ]);

        const selectedTagIds = (musicTags || []).map(mt => mt.tag_id);
        const availableTags = (allTagData as Tag[]) || [];
        setAllTags(availableTags);
        setEditMeta({
            rating: (data as Music).rating || 0,
            status: (data as Music).status,
            note: (data as Music).note || '',
            selectedTags: selectedTagIds,
        });

        setHistory((historyData as ListeningHistory[]) || []);
        setItem(data as Music);
        setLoading(false);
    }, [params.id, router]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadMusic();
    }, [loadMusic]);

    async function handleSaveMeta() {
        if (!item) return;
        setSavingMeta(true);
        const supabase = createClient();
        const movingToListened = item.status !== 'listened' && editMeta.status === 'listened';

        await supabase.from('music').update({
            rating: editMeta.rating || null,
            status: editMeta.status,
            note: editMeta.note.trim() || null,
            listened_at: editMeta.status === 'listened' ? (item.listened_at || new Date().toISOString()) : item.listened_at,
            updated_at: new Date().toISOString(),
        }).eq('id', item.id);

        await supabase.from('music_tags').delete().eq('music_id', item.id);
        if (editMeta.selectedTags.length > 0) {
            await supabase.from('music_tags').insert(
                editMeta.selectedTags.map(tagId => ({ music_id: item.id, tag_id: tagId }))
            );
        }

        if (movingToListened) {
            const today = new Date().toISOString().slice(0, 10);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: existingToday } = await supabase
                    .from('listening_history')
                    .select('id, listened_at')
                    .eq('music_id', item.id)
                    .gte('listened_at', `${today}T00:00:00.000Z`)
                    .lt('listened_at', `${today}T23:59:59.999Z`)
                    .limit(1);

                if (!existingToday || existingToday.length === 0) {
                    await supabase.from('listening_history').insert({
                        music_id: item.id,
                        user_id: user.id,
                        listened_at: new Date().toISOString(),
                        note: null,
                    });
                }
            }
        }

        setSavingMeta(false);
        await loadMusic();
    }

    async function handleAddHistory() {
        if (!item) return;
        setSavingHistory(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setSavingHistory(false);
            return;
        }

        await supabase.from('listening_history').insert({
            music_id: item.id,
            user_id: user.id,
            listened_at: new Date(historyForm.date).toISOString(),
            note: historyForm.note.trim() || null,
        });

        setHistoryForm({ date: new Date().toISOString().slice(0, 10), note: '' });
        setShowHistoryForm(false);
        setSavingHistory(false);
        await loadMusic();
    }

    async function handleDeleteHistory(historyId: string) {
        const supabase = createClient();
        await supabase.from('listening_history').delete().eq('id', historyId);
        await loadMusic();
    }

    async function handleDelete() {
        if (!confirm('Delete this title from your collection?')) return;
        const supabase = createClient();
        await supabase.from('listening_history').delete().eq('music_id', params.id);
        await supabase.from('music_tags').delete().eq('music_id', params.id);
        await supabase.from('music').delete().eq('id', params.id);
        router.push('/music');
    }

    if (loading) return (
        <div className="max-w-4xl mx-auto">
            <div className="animate-shimmer rounded-lg h-64 mb-6" />
            <div className="animate-shimmer rounded h-8 w-48 mb-3" />
            <div className="animate-shimmer rounded h-4 w-32" />
        </div>
    );

    if (!item) return null;

    return (
        <div className="detail-page-shell">
            <div className="detail-page-header">
                <div className="detail-page-back-slot">
                    <Link
                        href="/music"
                        className="detail-page-back-link"
                    >
                        ← Back to Music
                    </Link>
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">{item.title}</h1>
                    {item.artist && <p className="text-[var(--text-muted)] mt-1">{item.artist}</p>}
                    <p className="text-sm text-[var(--text-muted)] mt-1">{item.type.toUpperCase()}{item.year ? ` · ${item.year}` : ''}</p>
                </div>
            </div>

            <div className="detail-page-media-row">
                <div className="detail-page-poster-wrap">
                    <div className="detail-page-poster-box aspect-square">
                        {item.artwork_url ? (
                            <Image src={item.artwork_url} alt={item.title} fill sizes="(max-width: 640px) 100vw, 224px" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-medium text-[var(--text-muted)]">NO IMAGE</div>
                        )}
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <Card hover={false} className="space-y-3">
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rating</label>
                            <StarRating value={editMeta.rating} onChange={(v) => setEditMeta((prev) => ({ ...prev, rating: v }))} />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Status</label>
                            <select
                                value={editMeta.status}
                                onChange={(e) => setEditMeta((prev) => ({ ...prev, status: e.target.value }))}
                                className="w-full px-3 py-2 text-sm rounded-[8px] bg-[var(--input-bg)] border border-[var(--input-border)] text-[var(--input-text)] focus:border-[var(--input-focus)] focus:outline-none"
                            >
                                {MUSIC_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                            </select>
                        </div>
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
                            onChange={(e) => setEditMeta((prev) => ({ ...prev, note: e.target.value }))}
                        />
                        <div className="flex items-center gap-3">
                            <Button onClick={handleSaveMeta} isLoading={savingMeta}>Save Changes</Button>
                            <StatusBadge status={editMeta.status} />
                        </div>
                    </Card>

                    <div className="pt-2">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Listening History
                                {history.length > 0 && <span className="ml-2 text-[var(--text-primary)]">({history.length})</span>}
                            </h3>
                            <button
                                onClick={() => setShowHistoryForm(!showHistoryForm)}
                                className="detail-page-history-trigger text-xs font-medium px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer"
                            >
                                + Log Relisten
                            </button>
                        </div>

                        {showHistoryForm && (
                            <Card hover={false} className="!bg-[var(--bg-tertiary)] mb-3">
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Date</label>
                                        <input
                                            type="date"
                                            value={historyForm.date}
                                            onChange={e => setHistoryForm(p => ({ ...p, date: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm rounded-[4px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1">Note (optional)</label>
                                        <input
                                            type="text"
                                            value={historyForm.note}
                                            onChange={e => setHistoryForm(p => ({ ...p, note: e.target.value }))}
                                            placeholder="Thoughts on this relisten..."
                                            className="w-full px-3 py-2 text-sm rounded-[4px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none placeholder:text-[var(--text-muted)]"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button onClick={handleAddHistory} isLoading={savingHistory}>Save</Button>
                                        <Button variant="secondary" onClick={() => setShowHistoryForm(false)}>Cancel</Button>
                                    </div>
                                </div>
                            </Card>
                        )}

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
                                                    {new Date(h.listened_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                                </p>
                                                {h.note && <p className="text-xs text-[var(--text-muted)] truncate">{h.note}</p>}
                                            </div>
                                        </div>
                                        <button
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
                            <p className="text-xs text-[var(--text-muted)] italic">No listening history logged yet</p>
                        )}
                    </div>

                    <div className="flex gap-2 pt-2">
                        <Button variant="danger" onClick={handleDelete}>Delete</Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
