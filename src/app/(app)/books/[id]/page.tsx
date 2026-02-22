'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase';
import type { Book, Tag, ReadingHistory } from '@/lib/types';
import Link from 'next/link';

export default function BookDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [book, setBook] = useState<Book | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const [history, setHistory] = useState<ReadingHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [showHistoryForm, setShowHistoryForm] = useState(false);
    const [historyForm, setHistoryForm] = useState({ date: new Date().toISOString().slice(0, 10), note: '' });
    const [savingHistory, setSavingHistory] = useState(false);

    useEffect(() => {
        loadBook();
    }, [params.id]);

    async function loadBook() {
        const supabase = createClient();
        const { data } = await supabase.from('books').select('*').eq('id', params.id).single();
        if (!data) { router.push('/books'); return; }

        const [{ data: bookTags }, { data: historyData }] = await Promise.all([
            supabase.from('book_tags').select('tag_id').eq('book_id', params.id),
            supabase.from('reading_history').select('*').eq('book_id', params.id).order('read_at', { ascending: false }),
        ]);

        if (bookTags && bookTags.length > 0) {
            const tagIds = bookTags.map(bt => bt.tag_id);
            const { data: tagData } = await supabase.from('tags').select('*').in('id', tagIds);
            setTags((tagData as Tag[]) || []);
        }

        setHistory((historyData as ReadingHistory[]) || []);
        setBook(data as Book);
        setLoading(false);
    }

    async function handleAddHistory() {
        if (!book) return;
        setSavingHistory(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase.from('reading_history').insert({
            book_id: book.id,
            user_id: user.id,
            read_at: new Date(historyForm.date).toISOString(),
            note: historyForm.note.trim() || null,
        });

        setHistoryForm({ date: new Date().toISOString().slice(0, 10), note: '' });
        setShowHistoryForm(false);
        setSavingHistory(false);
        loadBook();
    }

    async function handleDeleteHistory(historyId: string) {
        const supabase = createClient();
        await supabase.from('reading_history').delete().eq('id', historyId);
        loadBook();
    }

    async function handleDelete() {
        if (!confirm('Delete this book from your collection?')) return;
        const supabase = createClient();
        await supabase.from('reading_history').delete().eq('book_id', params.id);
        await supabase.from('book_tags').delete().eq('book_id', params.id);
        await supabase.from('books').delete().eq('id', params.id);
        router.push('/books');
    }

    if (loading) return (
        <div className="max-w-4xl mx-auto">
            <div className="animate-shimmer rounded-lg h-64 mb-6" />
            <div className="animate-shimmer rounded h-8 w-48 mb-3" />
            <div className="animate-shimmer rounded h-4 w-32" />
        </div>
    );

    if (!book) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <Link href="/books" className="text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]">← Back to Books</Link>

            <div className="flex flex-col sm:flex-row gap-6">
                <div className="w-full sm:w-56 shrink-0">
                    <div className="aspect-[2/3] bg-[var(--bg-secondary)] rounded-lg overflow-hidden border border-[var(--border)]">
                        {book.cover_url ? (
                            <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-medium" style={{ color: '#556' }}>NO IMAGE</div>
                        )}
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div>
                        <h1 className="text-2xl font-bold">{book.title}</h1>
                        {book.author && <p className="text-[var(--text-muted)] mt-1">{book.author}</p>}
                    </div>

                    <div className="flex items-center gap-3">
                        <StarRating value={book.rating || 0} readonly />
                        <StatusBadge status={book.status} />
                    </div>

                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map(tag => <Badge key={tag.id} label={tag.name} color={tag.color} />)}
                        </div>
                    )}

                    {book.note && (
                        <Card hover={false}>
                            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Notes</h3>
                            <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{book.note}</p>
                        </Card>
                    )}

                    {book.description && (
                        <div>
                            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2">Description</h3>
                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{book.description}</p>
                        </div>
                    )}

                    {/* Reading History */}
                    <div className="pt-2">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                                Reading History
                                {history.length > 0 && <span className="ml-2 text-[var(--text-primary)]">({history.length})</span>}
                            </h3>
                            <button
                                onClick={() => setShowHistoryForm(!showHistoryForm)}
                                className="text-xs font-medium px-2.5 py-1 rounded-[4px] transition-colors cursor-pointer"
                                style={{ color: '#00e054', border: '1px solid rgba(0,224,84,0.3)' }}
                            >
                                + Log Reread
                            </button>
                        </div>

                        {/* Add history form */}
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
                                            placeholder="Thoughts on this reread..."
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

                        {/* History list */}
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
                                                    {new Date(h.read_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
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
                            <p className="text-xs text-[var(--text-muted)] italic">No reading history logged yet</p>
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
