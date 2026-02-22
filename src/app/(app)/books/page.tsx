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
import type { Book, Tag } from '@/lib/types';
import Link from 'next/link';

export default function BooksPage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', search: '', tagId: '' });
    const [sort, setSort] = useState('created_at');
    const [editBook, setEditBook] = useState<Book | null>(null);
    const [editForm, setEditForm] = useState({ rating: 0, status: 'wishlist', note: '', selectedTags: [] as string[] });

    const loadBooks = useCallback(async () => {
        const supabase = createClient();
        let query = supabase.from('books').select('*').order(sort, { ascending: sort === 'title' });

        if (filter.status) query = query.eq('status', filter.status);
        if (filter.search) query = query.ilike('title', `%${filter.search}%`);

        const { data } = await query;
        let bookList = (data as Book[]) || [];

        if (filter.tagId) {
            const { data: bookTagData } = await supabase.from('book_tags').select('book_id').eq('tag_id', filter.tagId);
            const bookIds = new Set((bookTagData || []).map(bt => bt.book_id));
            bookList = bookList.filter(b => bookIds.has(b.id));
        }

        if (bookList.length > 0) {
            const bookIds = bookList.map(b => b.id);
            const { data: bookTagsData } = await supabase
                .from('book_tags')
                .select('book_id, tag_id')
                .in('book_id', bookIds);

            const { data: allTags } = await supabase.from('tags').select('*');
            setTags((allTags as Tag[]) || []);

            const tagMap = new Map((allTags as Tag[] || []).map(t => [t.id, t]));
            bookList = bookList.map(book => ({
                ...book,
                tags: (bookTagsData || [])
                    .filter(bt => bt.book_id === book.id)
                    .map(bt => tagMap.get(bt.tag_id))
                    .filter(Boolean) as Tag[],
            }));
        }

        setBooks(bookList);
        setLoading(false);
    }, [filter, sort]);

    useEffect(() => { loadBooks(); }, [loadBooks]);

    async function handleDelete(id: string) {
        if (!confirm('Delete this book from your collection?')) return;
        const supabase = createClient();
        await supabase.from('books').delete().eq('id', id);
        loadBooks();
    }

    async function handleEdit() {
        if (!editBook) return;
        const supabase = createClient();
        await supabase.from('books').update({
            rating: editForm.rating,
            status: editForm.status,
            note: editForm.note,
            updated_at: new Date().toISOString(),
        }).eq('id', editBook.id);

        await supabase.from('book_tags').delete().eq('book_id', editBook.id);
        if (editForm.selectedTags.length > 0) {
            await supabase.from('book_tags').insert(
                editForm.selectedTags.map(tagId => ({ book_id: editBook.id, tag_id: tagId }))
            );
        }

        setEditBook(null);
        loadBooks();
    }

    function openEditModal(book: Book) {
        setEditBook(book);
        setEditForm({
            rating: book.rating || 0,
            status: book.status,
            note: book.note || '',
            selectedTags: book.tags?.map(t => t.id) || [],
        });
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: '#e1e3e5' }}>Books</h1>
                    <p className="text-sm text-[var(--text-muted)] mt-1">{books.length} titles</p>
                </div>
                <Link href="/search?tab=books">
                    <Button>+ Add Book</Button>
                </Link>
            </div>

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
                        { value: 'read', label: 'Read' },
                        { value: 'reading', label: 'Reading' },
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

            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="animate-shimmer rounded aspect-[2/3]" />
                    ))}
                </div>
            ) : books.length === 0 ? (
                <Card hover={false}>
                    <div className="text-center py-12 text-[var(--text-muted)]">
                        <p className="text-lg mb-2 font-medium" style={{ color: '#556' }}>No Books</p>
                        <Link href="/search?tab=books" className="text-sm text-[var(--accent)] hover:underline mt-2 inline-block">
                            Search and add books →
                        </Link>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {books.map((book) => (
                        <Card key={book.id} className="p-0 overflow-hidden group relative">
                            <Link href={`/books/${book.id}`}>
                                <div className="aspect-[2/3] bg-[var(--bg-tertiary)] relative">
                                    {book.cover_url ? (
                                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-medium" style={{ color: '#556' }}>NO IMAGE</div>
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    <div className="absolute bottom-0 left-0 right-0 p-3">
                                        <p className="text-sm font-medium truncate">{book.title}</p>
                                        {book.author && <p className="text-xs text-[var(--text-muted)]">{book.author}</p>}
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <StarRating value={book.rating || 0} readonly size="sm" />
                                        </div>
                                        <div className="mt-1.5">
                                            <StatusBadge status={book.status} />
                                        </div>
                                        {book.tags && book.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {book.tags.slice(0, 2).map(tag => (
                                                    <Badge key={tag.id} label={tag.name} color={tag.color} size="sm" />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Link>
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.preventDefault(); openEditModal(book); }} className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                    </svg>
                                </button>
                                <button onClick={(e) => { e.preventDefault(); handleDelete(book.id); }} className="p-1.5 rounded-lg bg-black/60 text-red-400 hover:bg-black/80 transition-colors cursor-pointer">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                    </svg>
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Modal isOpen={!!editBook} onClose={() => setEditBook(null)} title="Edit Book">
                {editBook && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            {editBook.cover_url && <img src={editBook.cover_url} alt="" className="w-12 h-18 rounded-lg object-cover" />}
                            <div>
                                <p className="font-medium">{editBook.title}</p>
                                {editBook.author && <p className="text-xs text-[var(--text-muted)]">{editBook.author}</p>}
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
                                { value: 'read', label: 'Read' },
                                { value: 'reading', label: 'Reading' },
                                { value: 'wishlist', label: 'Wishlist' },
                            ]}
                        />

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
                            <Button variant="ghost" onClick={() => setEditBook(null)}>Cancel</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}
