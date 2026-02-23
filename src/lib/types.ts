// ============================================================
// MediaVault 型定義
// ============================================================

export type MediaType = 'movie' | 'tv';
export type MediaStatus = 'watched' | 'watching' | 'wishlist';
export type BookStatus = 'read' | 'reading' | 'wishlist';
export type MusicType = 'track' | 'album';
export type MusicStatus = 'listened' | 'listening' | 'wishlist';

export interface Profile {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface Tag {
    id: string;
    user_id: string;
    name: string;
    color: string;
    created_at: string;
}

export interface Movie {
    id: string;
    user_id: string;
    tmdb_id: number | null;
    title: string;
    poster_url: string | null;
    director: string | null;
    year: number | null;
    overview: string | null;
    rating: number | null;
    status: MediaStatus;
    note: string | null;
    watched_at: string | null;
    created_at: string;
    updated_at: string;
    tags?: Tag[];
    // TV対応カラム
    media_type: MediaType;
    number_of_seasons: number | null;
    number_of_episodes: number | null;
    watched_episode: number | null;
}

export interface Book {
    id: string;
    user_id: string;
    google_books_id: string | null;
    title: string;
    cover_url: string | null;
    author: string | null;
    year: number | null;
    description: string | null;
    rating: number | null;
    status: BookStatus;
    note: string | null;
    read_at: string | null;
    created_at: string;
    updated_at: string;
    tags?: Tag[];
}

export interface Music {
    id: string;
    user_id: string;
    spotify_id: string | null;
    title: string;
    artwork_url: string | null;
    artist: string | null;
    year: number | null;
    type: MusicType;
    rating: number | null;
    status: MusicStatus;
    note: string | null;
    listened_at: string | null;
    created_at: string;
    updated_at: string;
    tags?: Tag[];
}

export interface ViewingHistory {
    id: string;
    movie_id: string;
    user_id: string;
    watched_at: string;
    note: string | null;
}

export interface ReadingHistory {
    id: string;
    book_id: string;
    user_id: string;
    read_at: string;
    note: string | null;
}

// TMDB 検索結果（/search/multi で正規化済み）
export interface TMDBSearchResult {
    id: number;
    media_type: 'movie' | 'tv';
    title: string;           // 正規化済み (movie: title, tv: name)
    poster_path: string | null;
    release_date: string;    // 正規化済み (movie: release_date, tv: first_air_date)
    overview: string;
    number_of_seasons?: number;
    number_of_episodes?: number;
}

// 後方互換用エイリアス
export type TMDBMovie = TMDBSearchResult;

// 書籍検索結果（正規化済み — API を切替えてもクライアントはこの型だけ使う）
export interface BookSearchResult {
    id: string;           // isbn or API-specific ID
    title: string;
    author: string | null;
    publishedDate: string | null;
    description: string | null;
    thumbnail: string | null;
    isbn: string | null;
    publisher: string | null;
}

export interface ListeningHistory {
    id: string;
    music_id: string;
    user_id: string;
    listened_at: string;
    note: string | null;
}

// 後方互換エイリアス
export type GoogleBook = BookSearchResult;

// Spotify 検索結果（正規化済み）
export interface SpotifySearchResult {
    id: string;
    type: 'track' | 'album';
    title: string;
    artist: string | null;
    albumName: string | null;
    releaseDate: string | null;
    image: string | null;
    spotifyUrl: string | null;
}
