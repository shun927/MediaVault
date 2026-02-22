'use client';

import { useEffect, useState, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import StatusBadge from '@/components/ui/StatusBadge';
import Badge from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase';
import type { Book, Tag } from '@/lib/types';
import Link from 'next/link';

export default function BooksPage() {
    const [books, setBooks] = useState<Book[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState({ status: '', search: '', tagId: '' });
    const [sort, setSort] = useState('created_at');

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

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void loadBooks();
    }, [loadBooks]);

    return (
        <div className="w-full space-y-6">
            <div className="app-topbar">
                <div className="app-topbar-controls">
                    <div className="app-topbar-title">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Books</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">{books.length} titles</p>
                    </div>
                    <div className="app-topbar-controls ml-auto">
                        <input
                            className="app-control-input"
                            placeholder="タイトルで検索..."
                            value={filter.search}
                            onChange={(e) => setFilter(prev => ({ ...prev, search: e.target.value }))}
                        />
                        <select className="app-control-select" value={filter.status} onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}>
                            <option value="">All</option>
                            <option value="read">Read</option>
                            <option value="reading">Reading</option>
                            <option value="wishlist">Wishlist</option>
                        </select>
                        <select className="app-control-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                            <option value="created_at">Recent</option>
                            <option value="title">Title</option>
                            <option value="rating">Rating</option>
                        </select>
                        <Link href="/search?tab=books">
                            <Button>+ Add Book</Button>
                        </Link>
                    </div>
                </div>
            </div>

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
                                        <div className="w-full h-full flex items-center justify-center text-xs font-medium text-[var(--text-muted)]">NO IMAGE</div>
                                    )}
                                </div>
                                <div className="p-3 space-y-1.5">
                                    <p className="text-sm font-medium leading-snug text-[var(--text-primary)] line-clamp-2">{book.title}</p>
                                    {book.author && <p className="text-xs text-[var(--text-muted)] line-clamp-1">{book.author}</p>}
                                    <div className="flex items-center gap-2">
                                        <StarRating value={book.rating || 0} readonly size="sm" />
                                    </div>
                                    <StatusBadge status={book.status} />
                                    {book.tags && book.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {book.tags.slice(0, 2).map(tag => (
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
    );
}
