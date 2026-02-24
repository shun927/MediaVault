'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import StarRating from '@/components/ui/StarRating';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase';
import type { TMDBSearchResult, BookSearchResult, SpotifySearchResult, Tag } from '@/lib/types';
import { BOOK_STATUS_OPTIONS, MOVIE_STATUS_OPTIONS, MUSIC_STATUS_OPTIONS } from '@/lib/status';

export default function SearchPageWrapper() {
    return (
        <Suspense fallback={<div className="max-w-4xl mx-auto"><div className="animate-shimmer rounded-xl h-64" /></div>}>
            <SearchPage />
        </Suspense>
    );
}

function SearchPage() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab');
    const initialQuery = searchParams.get('q') || '';
    const sharedTitleHint = searchParams.get('titleHint');
    const autoSearchFromShare = searchParams.get('auto') === '1';
    const sharedSpotifyId = searchParams.get('spotifyId');
    const sharedSpotifyType = searchParams.get('spotifyType');
    const [tab, setTab] = useState<'movies' | 'books' | 'music'>(
        initialTab === 'books' ? 'books' : initialTab === 'music' ? 'music' : 'movies'
    );
    const [query, setQuery] = useState(initialQuery);
    const [movieResults, setMovieResults] = useState<TMDBSearchResult[]>([]);
    const [bookResults, setBookResults] = useState<BookSearchResult[]>([]);
    const [musicResults, setMusicResults] = useState<SpotifySearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [tags, setTags] = useState<Tag[]>([]);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [scannerError, setScannerError] = useState<string | null>(null);
    const [scannerActive, setScannerActive] = useState(false);
    const [barcodeSupported, setBarcodeSupported] = useState(true);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const stopLoopRef = useRef(false);
    const sharedSearchDoneRef = useRef(false);

    // 追加モーダル
    const [selectedMovie, setSelectedMovie] = useState<TMDBSearchResult | null>(null);
    const [selectedBook, setSelectedBook] = useState<BookSearchResult | null>(null);
    const [selectedMusic, setSelectedMusic] = useState<SpotifySearchResult | null>(null);
    const [addForm, setAddForm] = useState({ rating: 0, status: 'wishlist', note: '', selectedTags: [] as string[], watchedEpisode: 0 });
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.from('tags').select('*').then(({ data }) => setTags((data as Tag[]) || []));
    }, []);

    async function searchBooksByQuery(bookQuery: string, options?: { titleHint?: string | null }) {
        const endpoint = options?.titleHint
            ? `/api/search/books?q=${encodeURIComponent(bookQuery)}&titleHint=${encodeURIComponent(options.titleHint)}`
            : `/api/search/books?q=${encodeURIComponent(bookQuery)}`;
        const res = await fetch(endpoint);
        const data = await res.json();
        setBookResults(data.items || []);
        if (!res.ok || data.error) {
            setSearchError(data.error || `Search failed (${res.status})`);
        } else if (!data.items?.length) {
            setSearchError('No books found.');
        }
    }

    async function runSearch(
        targetTab: 'movies' | 'books' | 'music',
        searchQuery: string,
        options?: { spotifyId?: string | null; spotifyType?: string | null; titleHint?: string | null }
    ) {
        const q = searchQuery.trim();
        if (!q && !(targetTab === 'music' && options?.spotifyId && options?.spotifyType)) return;
        setSearching(true);
        setSearchError(null);
        try {
            if (targetTab === 'movies') {
                const res = await fetch(`/api/search/movies?q=${encodeURIComponent(q)}`);
                const data = await res.json();
                setMovieResults(data.results || []);
            } else if (targetTab === 'books') {
                await searchBooksByQuery(q, { titleHint: options?.titleHint });
            } else {
                const endpoint = (options?.spotifyId && (options?.spotifyType === 'track' || options?.spotifyType === 'album'))
                    ? `/api/search/music?q=${encodeURIComponent(q || options.spotifyId)}&spotifyId=${encodeURIComponent(options.spotifyId)}&spotifyType=${options.spotifyType}`
                    : `/api/search/music?q=${encodeURIComponent(q)}`;
                const res = await fetch(endpoint);
                const data = await res.json();
                setMusicResults(data.items || []);
                if (!res.ok || data.error) {
                    setSearchError(data.error || `Search failed (${res.status})`);
                } else if (!data.items?.length) {
                    setSearchError('No music found.');
                }
            }
        } catch {
            setSearchError('Search failed. Please try again.');
        }
        setSearching(false);
    }

    async function handleSearch(searchQuery?: string) {
        const q = (searchQuery ?? query).trim();
        await runSearch(tab, q);
    }

    function stopScanner() {
        stopLoopRef.current = true;
        setScannerActive(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }

    function normalizeIsbn(rawValue: string): string | null {
        const digits = rawValue.replace(/[^\dXx]/g, '');
        const isbn13 = digits.match(/\d{13}/)?.[0];
        if (isbn13 && (isbn13.startsWith('978') || isbn13.startsWith('979'))) return isbn13;
        const isbn10 = digits.match(/\d{9}[\dXx]/)?.[0];
        if (isbn10) return isbn10.toUpperCase();
        return null;
    }

    async function startScanner() {
        if (typeof window === 'undefined') return;
        setScannerError(null);
        setBarcodeSupported(true);
        stopLoopRef.current = false;

        if (!('mediaDevices' in navigator) || !navigator.mediaDevices.getUserMedia) {
            setScannerError('Camera API is not available in this browser.');
            return;
        }
        const BarcodeDetectorCtor = (window as { BarcodeDetector?: new (config?: unknown) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;
        if (!BarcodeDetectorCtor) {
            setBarcodeSupported(false);
            setScannerError(null);
            setScannerActive(false);
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }
            setScannerActive(true);

            const detector = new BarcodeDetectorCtor({
                formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'],
            });

            const scanLoop = async () => {
                if (stopLoopRef.current || !videoRef.current) return;
                try {
                    const barcodes = await detector.detect(videoRef.current);
                    if (barcodes.length > 0) {
                        const hit = barcodes.find((b) => normalizeIsbn(b.rawValue || ''));
                        if (hit?.rawValue) {
                            const isbn = normalizeIsbn(hit.rawValue);
                            if (isbn) {
                                setQuery(isbn);
                                setTab('books');
                                setScannerOpen(false);
                                stopScanner();
                                await runSearch('books', isbn);
                                return;
                            }
                        }
                    }
                } catch {
                    setScannerError('Failed to detect barcode. Please keep the barcode in frame and retry.');
                }
                window.setTimeout(scanLoop, 220);
            };

            void scanLoop();
        } catch {
            setScannerError('Unable to access camera. Please allow camera permission and retry.');
        }
    }

    useEffect(() => {
        if (!scannerOpen) {
            stopScanner();
            return;
        }
        void startScanner();
        return () => stopScanner();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scannerOpen]);

    useEffect(() => {
        if (!autoSearchFromShare || sharedSearchDoneRef.current) return;

        const targetTab = initialTab === 'books' ? 'books' : initialTab === 'music' ? 'music' : 'movies';
        const q = initialQuery.trim();
        if (!q && !(targetTab === 'music' && sharedSpotifyId && sharedSpotifyType)) return;

        sharedSearchDoneRef.current = true;
        setTab(targetTab);
        setQuery(q);
        void runSearch(targetTab, q, {
            spotifyId: sharedSpotifyId,
            spotifyType: sharedSpotifyType,
            titleHint: sharedTitleHint,
        });
    }, [autoSearchFromShare, initialQuery, initialTab, sharedSpotifyId, sharedSpotifyType, sharedTitleHint]);

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

        if (movie && addForm.status === 'watched') {
            await supabase.from('viewing_history').insert({
                movie_id: movie.id,
                user_id: user.id,
                watched_at: new Date().toISOString(),
                note: null,
            });
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

        if (book && addForm.status === 'read') {
            await supabase.from('reading_history').insert({
                book_id: book.id,
                user_id: user.id,
                read_at: new Date().toISOString(),
                note: null,
            });
        }

        setSelectedBook(null);
        resetAddForm();
        setAdding(false);
    }

    async function addMusic() {
        if (!selectedMusic) return;
        setAdding(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const yearMatch = selectedMusic.releaseDate?.match(/\d{4}/);
        const { data: created } = await supabase.from('music').insert({
            user_id: user.id,
            spotify_id: selectedMusic.id,
            title: selectedMusic.title,
            artwork_url: selectedMusic.image || null,
            artist: selectedMusic.artist || null,
            year: yearMatch ? parseInt(yearMatch[0], 10) : null,
            type: selectedMusic.type,
            rating: addForm.rating || null,
            status: addForm.status,
            note: addForm.note || null,
            listened_at: addForm.status === 'listened' ? new Date().toISOString() : null,
        }).select('id').single();

        if (created && addForm.selectedTags.length > 0) {
            await supabase.from('music_tags').insert(
                addForm.selectedTags.map(tagId => ({ music_id: created.id, tag_id: tagId }))
            );
        }

        if (created && addForm.status === 'listened') {
            await supabase.from('listening_history').insert({
                music_id: created.id,
                user_id: user.id,
                listened_at: new Date().toISOString(),
                note: null,
            });
        }

        setSelectedMusic(null);
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
                            {(['movies', 'books', 'music'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setTab(t); setMovieResults([]); setBookResults([]); setMusicResults([]); }}
                                    className={`app-pill-btn ${tab === t ? 'is-active' : ''}`}
                                >
                                    {t === 'movies' ? 'Films' : t === 'books' ? 'Books' : 'Music'}
                                </button>
                            ))}
                        </div>
                        <input
                            className="app-control-input"
                            placeholder={
                                tab === 'movies'
                                    ? 'Search movies, anime, TV shows...'
                                    : tab === 'books'
                                        ? 'Search books...'
                                        : 'Search songs and albums...'
                            }
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <Button onClick={() => void handleSearch()} isLoading={searching} variant="secondary">Search</Button>
                        {tab === 'books' && (
                            <Button onClick={() => setScannerOpen(true)} variant="secondary">Scan ISBN</Button>
                        )}
                    </div>
                </div>
            </div>

            {(tab === 'books' || tab === 'music') && searchError && (
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
                                    <Image
                                        src={`https://image.tmdb.org/t/p/w300${item.poster_path}`}
                                        alt={item.title}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        className="w-full h-full object-cover"
                                    />
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

            {/* 音楽結果 */}
            {tab === 'music' && musicResults.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {musicResults.map(item => (
                        <Card
                            key={`${item.type}-${item.id}`}
                            className="p-0 overflow-hidden group cursor-pointer"
                            onClick={() => { setSelectedMusic(item); resetAddForm(); }}
                        >
                            <div className="no-underline">
                                <div className="aspect-square bg-[var(--bg-tertiary)] relative">
                                    {item.image ? (
                                        <Image
                                            src={item.image}
                                            alt={item.title}
                                            fill
                                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                            className="w-full h-full object-cover"
                                        />
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
                                            {item.type}
                                        </span>
                                    </div>
                                    {item.artist && <p className="text-xs text-[var(--text-muted)] line-clamp-1">{item.artist}</p>}
                                    {item.albumName && <p className="text-xs text-[var(--text-muted)] line-clamp-1">{item.albumName}</p>}
                                    {item.releaseDate && <p className="text-[10px] text-[var(--text-muted)]">{item.releaseDate.slice(0, 4)}</p>}
                                </div>
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
                                    <Image
                                        src={book.thumbnail}
                                        alt={book.title}
                                        fill
                                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        className="w-full h-full object-cover"
                                    />
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
                            {selectedMovie.poster_path && (
                                <Image
                                    src={`https://image.tmdb.org/t/p/w200${selectedMovie.poster_path}`}
                                    alt=""
                                    className="w-20 rounded-lg"
                                    width={80}
                                    height={120}
                                />
                            )}
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
                        <Select label="Status" value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))} options={MOVIE_STATUS_OPTIONS} />

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
                            {selectedBook.thumbnail && (
                                <Image
                                    src={selectedBook.thumbnail}
                                    alt=""
                                    className="w-20 rounded-lg"
                                    width={80}
                                    height={120}
                                />
                            )}
                            <div>
                                <p className="font-medium">{selectedBook.title}</p>
                                {selectedBook.author && <p className="text-xs text-[var(--text-muted)]">{selectedBook.author}</p>}
                            </div>
                        </div>
                        <div><label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rating</label><StarRating value={addForm.rating} onChange={v => setAddForm(p => ({ ...p, rating: v }))} size="lg" /></div>
                        <Select label="Status" value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))} options={BOOK_STATUS_OPTIONS} />
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

            {/* 音楽追加モーダル */}
            <Modal isOpen={!!selectedMusic} onClose={() => setSelectedMusic(null)} title={selectedMusic?.type === 'album' ? 'Add Album' : 'Add Track'}>
                {selectedMusic && (
                    <div className="space-y-4">
                        <div className="flex gap-3">
                            {selectedMusic.image && (
                                <Image
                                    src={selectedMusic.image}
                                    alt=""
                                    className="w-20 rounded-lg"
                                    width={80}
                                    height={80}
                                />
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-medium">{selectedMusic.title}</p>
                                    <span
                                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                                        style={{ backgroundColor: 'var(--media-accent-soft)', color: 'var(--media-accent)' }}
                                    >
                                        {selectedMusic.type}
                                    </span>
                                </div>
                                {selectedMusic.artist && <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedMusic.artist}</p>}
                                {selectedMusic.albumName && <p className="text-xs text-[var(--text-muted)]">{selectedMusic.albumName}</p>}
                                {selectedMusic.releaseDate && <p className="text-xs text-[var(--text-muted)]">{selectedMusic.releaseDate.slice(0, 4)}</p>}
                                {selectedMusic.spotifyUrl && (
                                    <a
                                        href={selectedMusic.spotifyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-[var(--accent)] hover:underline inline-block mt-1"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        Open in Spotify
                                    </a>
                                )}
                            </div>
                        </div>
                        <div><label className="block text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Rating</label><StarRating value={addForm.rating} onChange={v => setAddForm(p => ({ ...p, rating: v }))} size="lg" /></div>
                        <Select label="Status" value={addForm.status} onChange={e => setAddForm(p => ({ ...p, status: e.target.value }))} options={MUSIC_STATUS_OPTIONS} />
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
                        <Button onClick={addMusic} isLoading={adding} className="w-full">Add to Collection</Button>
                    </div>
                )}
            </Modal>

            {/* ISBNスキャナ */}
            <Modal isOpen={scannerOpen} onClose={() => setScannerOpen(false)} title="Scan ISBN Barcode">
                <div className="space-y-3">
                    <p className="text-sm text-[var(--text-muted)]">
                        本のバーコードをカメラにかざすと自動で検索します。
                    </p>
                    <div className="rounded-[8px] overflow-hidden border border-[var(--border)] bg-black/40">
                        <video ref={videoRef} className="w-full aspect-video object-cover" muted playsInline />
                    </div>
                    {!barcodeSupported && (
                        <p className="text-xs text-[var(--text-muted)]">
                            このブラウザはバーコード読み取りに未対応です。
                        </p>
                    )}
                    {scannerError && <p className="text-xs text-red-400">{scannerError}</p>}
                    <div className="flex items-center justify-end gap-2">
                        <Button variant="secondary" onClick={() => setScannerOpen(false)}>Close</Button>
                        {!scannerActive && barcodeSupported && (
                            <Button onClick={startScanner}>Retry</Button>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
