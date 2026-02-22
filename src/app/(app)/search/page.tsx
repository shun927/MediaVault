'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { TMDBSearchResult, BookSearchResult, Tag } from '@/lib/types';

export default function SearchPageWrapper() {
    return (
        <Suspense fallback={<div className="max-w-4xl mx-auto"><div className="animate-shimmer rounded-xl h-64" /></div>}>
            <SearchPage />
        </Suspense>
    );
}

function SearchPage() {
    const searchParams = useSearchParams();
    const [tab, setTab] = useState<'movies' | 'books'>(searchParams.get('tab') === 'books' ? 'books' : 'movies');
    const [query, setQuery] = useState('');
    const [movieResults, setMovieResults] = useState<TMDBSearchResult[]>([]);
    const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);

    // 追加モーダル
    const [selectedMovie, setSelectedMovie] = useState<TMDBSearchResult | null>(null);
    const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
    const [addForm, setAddForm] = useState({ rating: 0, status: 'wishlist', note: '', selectedTags: [] as string[], watchedEpisode: 0 });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.from('tags').select('*').then(({ data }) => setTags((data as Tag[]) || []));
    }, []);

    async function handleSearch() {
        if (!query.trim()) return;
        setSearching(true);
        setSearchError(null);
        try {
            if (tab === 'movies') {
                const res = await fetch(`/api/search/movies?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setMovieResults(data.results || []);
            } else {
                const res = await fetch(`/api/search/books?q=${encodeURIComponent(query)}`);
                const data = await res.json();
                setBookResults(data.items || []);
                if (!res.ok || data.error) {
                    setSearchError(data.error || `Search failed (${res.status})`);
                } else if (!data.items?.length) {
                    setSearchError('No books found.');
                }
            }
        } catch {
            setSearchError('Search failed. Please try again.');
        }
        setSearching(false);
    }

    async function addMovie() {
        if (!selectedMovie) return;
        setAdding(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: movie } = await supabase.from('movies').insert({
            user_id: user.id,
            tmdb_id: selectedMovie.id,
            title: selectedMovie.title,
            poster_url: selectedMovie.poster_path ? `https://image.tmdb.org/t/p/w500${selectedMovie.poster_path}` : null,
            year: selectedMovie.release_date ? parseInt(selectedMovie.release_date.substring(0, 4)) : null,
            overview: selectedMovie.overview,
            rating: addForm.rating || null,
            status: addForm.status,
            note: addForm.note || null,
            watched_at: addForm.status === 'watched' ? new Date().toISOString() : null,
            media_type: selectedMovie.media_type,
            number_of_seasons: selectedMovie.number_of_seasons || null,
            number_of_episodes: selectedMovie.number_of_episodes || null,
            watched_episode: selectedMovie.media_type === 'tv' ? (addForm.watchedEpisode || null) : null,
        }).select().single();

        if (movie && addForm.selectedTags.length > 0) {
            await supabase.from('movie_tags').insert(
                addForm.selectedTags.map(tagId => ({ movie_id: movie.id, tag_id: tagId }))
            );
        }

        setSelectedMovie(null);
        resetAddForm();
        setAdding(false);
    }

    async function addBook() {
        if (!selectedBook) return;
        setAdding(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const yearMatch = selectedBook.publishedDate?.match(/\d{4}/);
        const { data: book } = await supabase.from('books').insert({
            user_id: user.id,
            google_books_id: selectedBook.isbn || selectedBook.id,
            title: selectedBook.title,
            cover_url: selectedBook.thumbnail || null,
            author: selectedBook.author || null,
            year: yearMatch ? parseInt(yearMatch[0]) : null,
            description: selectedBook.description || null,
            rating: addForm.rating || null,
            status: addForm.status,
            note: addForm.note || null,
            read_at: addForm.status === 'read' ? new Date().toISOString() : null,
        }).select().single();

        if (book && addForm.selectedTags.length > 0) {
            await supabase.from('book_tags').insert(
                addForm.selectedTags.map(tagId => ({ book_id: book.id, tag_id: tagId }))
            );
        }

        setSelectedBook(null);
        resetAddForm();
        setAdding(false);
    }

    function resetAddForm() {
        setAddForm({ rating: 0, status: 'wishlist', note: '', selectedTags: [], watchedEpisode: 0 });
    }

    return (
        <div className="w-full space-y-6">
            <div className="app-topbar">
                <div className="app-topbar-controls">
                    <div className="app-topbar-title">
                        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Search</h1>
                    </div>
                    <div className="app-topbar-controls ml-auto">
                        <div className="app-pill-group">
                            {(['movies', 'books'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setTab(t); setMovieResults([]); setBookResults([]); }}
                                    className={`app-pill-btn ${tab === t ? 'is-active' : ''}`}
                                >
                                    {t === 'movies' ? 'Films' : 'Books'}
                                </button>
                            ))}
                        </div>
                        <input
                            className="app-control-input"
                            placeholder={tab === 'movies' ? 'Search movies, anime, TV shows...' : 'Search books...'}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={handleSearch} isLoading={searching} variant="secondary">Search</Button>
                    </div>
                </div>
            </div>

            {tab === 'books' && searchError && (
                <p className="text-sm text-red-400">{searchError}</p>
            )}

            {/* 映画・TV結果 */}
            {tab === 'movies' && movieResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {movieResults.map(item => (
                        <Card
                            key={`${item.media_type}-${item.id}`}
                            className="p-0 overflow-hidden group cursor-pointer"
                            onClick={() => { setSelectedMovie(item); resetAddForm(); }}
                        >
                            <div className="aspect-[2/3] bg-[var(--bg-tertiary)] relative">
                                {item.poster_path ? (
                                    <img src={`https://image.tmdb.org/t/p/w300${item.poster_path}`} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">NO IMAGE</div>
                                )}
                            </div>
                            <div className="p-3 space-y-1">
                                <div className="flex items-start gap-2">
                                    <p className="text-sm font-medium leading-snug text-[var(--text-primary)] line-clamp-2">{item.title}</p>
                                    <span
                                        className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                                        style={{ backgroundColor: 'var(--media-accent-soft)', color: 'var(--media-accent)' }}
                                    >
                                        {item.media_type === 'tv' ? 'TV' : 'Film'}
                                    </span>
                                </div>
                                {item.release_date && <p className="text-xs text-[var(--text-muted)]">{item.release_date.substring(0, 4)}</p>}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* 本結果 */}
            {tab === 'books' && bookResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {bookResults.map(book => (
                        <Card
                            key={book.id}
                            className="p-0 overflow-hidden group cursor-pointer"
                            onClick={() => { setSelectedBook(book); resetAddForm(); }}
                        >
                            <div className="aspect-[2/3] bg-[var(--bg-tertiary)] relative">
                                {book.thumbnail ? (
                                    <img src={book.thumbnail} alt={book.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-[var(--text-muted)]">NO IMAGE</div>
                                )}
                            </div>
                            <div className="p-3 space-y-1">
                                <p className="text-sm font-medium leading-snug text-[var(--text-primary)] line-clamp-2">{book.title}</p>
                                {book.author && <p className="text-xs text-[var(--text-muted)] line-clamp-1">{book.author}</p>}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* 映画・TV追加モーダル */}
            <Modal isOpen={!!selectedMovie} onClose={() => setSelectedMovie(null)} title={selectedMovie?.media_type === 'tv' ? 'Add TV Show' : 'Add Film'}>
                {selectedMovie && (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            {selectedMovie.poster_path && <img src={`https://image.tmdb.org/t/p/w200${selectedMovie.poster_path}`} alt="" className="w-20 rounded-lg" />}
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">{selectedMovie.title}</p>
                                    <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                                        style={{ backgroundColor: 'var(--media-accent-soft)', color: 'var(--media-accent)' }}
                                    >
                                        {selectedMovie.media_type === 'tv' ? 'TV' : 'Film'}
                                    </span>
                                </div>
                                {selectedMovie.release_date && <p className="text-xs text-[var(--text-muted)]">{selectedMovie.release_date.substring(0, 4)}</p>}
                                {selectedMovie.overview && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-3">{selectedMovie.overview}</p>}
                            </div>
                        </div>
                        <div><label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rating</label><StarRating value={addForm.rating} onChange={v => setAddForm(p => ({ ...p, rating: v }))} size="lg" /></div>
                        <Select label="Status" value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))} options={[{ value: 'watched', label: 'Watched' }, { value: 'watching', label: 'Watching' }, { value: 'wishlist', label: 'Wishlist' }]} />

                        {/* TV用進捗入力 */}
                        {selectedMovie.media_type === 'tv' && (
                            <div className="p-3 rounded-[4px] border border-[var(--border)] bg-[var(--bg-tertiary)] space-y-2">
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Watch Progress</label>
                                {selectedMovie.number_of_seasons && (
                                    <p className="text-xs text-[var(--text-muted)]">
                                        {selectedMovie.number_of_seasons} season{selectedMovie.number_of_seasons > 1 ? 's' : ''}
                                        {selectedMovie.number_of_episodes && ` · ${selectedMovie.number_of_episodes} episodes`}
                                    </p>
                                )}
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-[var(--text-muted)] whitespace-nowrap">Watched up to episode</label>
                                    <input
                                        type="number"
                                        min="0"
                                        max={selectedMovie.number_of_episodes || 9999}
                                        value={addForm.watchedEpisode || ''}
                                        onChange={e => setAddForm(p => ({ ...p, watchedEpisode: parseInt(e.target.value) || 0 }))}
                                        className="w-20 px-2 py-1 text-sm rounded-[4px] bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-[#525b69] focus:outline-none"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        )}

                        <Textarea label="Notes" placeholder="Write your thoughts..." value={addForm.note} onChange={e => setAddForm(p => ({ ...p, note: e.target.value }))} />
                        {tags.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <button key={tag.id} type="button" onClick={() => setAddForm(p => ({ ...p, selectedTags: p.selectedTags.includes(tag.id) ? p.selectedTags.filter(id => id !== tag.id) : [...p.selectedTags, tag.id] }))} className={`cursor-pointer ${addForm.selectedTags.includes(tag.id) ? 'ring-2 ring-white/30' : ''} rounded-full`}>
                                            <Badge label={tag.name} color={tag.color} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Button onClick={addMovie} isLoading={adding} className="w-full">Add to Collection</Button>
                    </div>
                )}
            </Modal>

            {/* 本追加モーダル */}
            <Modal isOpen={!!selectedBook} onClose={() => setSelectedBook(null)} title="Add Book">
                {selectedBook && (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            {selectedBook.thumbnail && <img src={selectedBook.thumbnail} alt="" className="w-20 rounded-lg" />}
                            <div>
                                <p className="font-medium">{selectedBook.title}</p>
                                {selectedBook.author && <p className="text-xs text-[var(--text-muted)]">{selectedBook.author}</p>}
                            </div>
                        </div>
                        <div><label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rating</label><StarRating value={addForm.rating} onChange={v => setAddForm(p => ({ ...p, rating: v }))} size="lg" /></div>
                        <Select label="Status" value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))} options={[{ value: 'read', label: 'Read' }, { value: 'reading', label: 'Reading' }, { value: 'wishlist', label: 'Wishlist' }]} />
                        <Textarea label="Notes" placeholder="Write your thoughts..." value={addForm.note} onChange={e => setAddForm(p => ({ ...p, note: e.target.value }))} />
                        {tags.length > 0 && (
                            <div>
                                <label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Tags</label>
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <button key={tag.id} type="button" onClick={() => setAddForm(p => ({ ...p, selectedTags: p.selectedTags.includes(tag.id) ? p.selectedTags.filter(id => id !== tag.id) : [...p.selectedTags, tag.id] }))} className={`cursor-pointer ${addForm.selectedTags.includes(tag.id) ? 'ring-2 ring-white/30' : ''} rounded-full`}>
                                            <Badge label={tag.name} color={tag.color} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <Button onClick={addBook} isLoading={adding} className="w-full">Add to Collection</Button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
