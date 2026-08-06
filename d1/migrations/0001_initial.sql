PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#7c3aed',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(owner_id, name)
);

CREATE TABLE movies (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  poster_url TEXT,
  director TEXT,
  year INTEGER,
  overview TEXT,
  rating REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  status TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN ('watched','watching','wishlist')),
  note TEXT,
  watched_at TEXT,
  media_type TEXT NOT NULL DEFAULT 'movie' CHECK (media_type IN ('movie','tv')),
  number_of_seasons INTEGER,
  number_of_episodes INTEGER,
  watched_episode INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(owner_id, tmdb_id, media_type)
);

CREATE TABLE books (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_books_id TEXT,
  title TEXT NOT NULL,
  cover_url TEXT,
  author TEXT,
  year INTEGER,
  description TEXT,
  rating REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  status TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN ('read','reading','wishlist')),
  note TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(owner_id, google_books_id)
);

CREATE TABLE music (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spotify_id TEXT,
  title TEXT NOT NULL,
  artwork_url TEXT,
  artist TEXT,
  year INTEGER,
  type TEXT NOT NULL DEFAULT 'album' CHECK (type IN ('track','album')),
  rating REAL CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  status TEXT NOT NULL DEFAULT 'wishlist' CHECK (status IN ('listened','listening','wishlist')),
  note TEXT,
  listened_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(owner_id, spotify_id, type)
);

CREATE TABLE movie_tags (
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(movie_id, tag_id)
);
CREATE TABLE book_tags (
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(book_id, tag_id)
);
CREATE TABLE music_tags (
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  music_id TEXT NOT NULL REFERENCES music(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY(music_id, tag_id)
);

CREATE TABLE viewing_history (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
  watched_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE reading_history (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  read_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE listening_history (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  music_id TEXT NOT NULL REFERENCES music(id) ON DELETE CASCADE,
  listened_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE rate_limits (
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(owner_id, route, window_start)
);

CREATE INDEX idx_movies_owner_created ON movies(owner_id, created_at DESC);
CREATE INDEX idx_movies_owner_status ON movies(owner_id, status);
CREATE INDEX idx_movies_owner_title ON movies(owner_id, title);
CREATE INDEX idx_books_owner_created ON books(owner_id, created_at DESC);
CREATE INDEX idx_books_owner_status ON books(owner_id, status);
CREATE INDEX idx_books_owner_title ON books(owner_id, title);
CREATE INDEX idx_music_owner_created ON music(owner_id, created_at DESC);
CREATE INDEX idx_music_owner_status ON music(owner_id, status);
CREATE INDEX idx_music_owner_title ON music(owner_id, title);
CREATE INDEX idx_tags_owner ON tags(owner_id, name);
CREATE INDEX idx_movie_tags_owner_tag ON movie_tags(owner_id, tag_id);
CREATE INDEX idx_book_tags_owner_tag ON book_tags(owner_id, tag_id);
CREATE INDEX idx_music_tags_owner_tag ON music_tags(owner_id, tag_id);
CREATE INDEX idx_viewing_history_owner_date ON viewing_history(owner_id, watched_at DESC);
CREATE INDEX idx_reading_history_owner_date ON reading_history(owner_id, read_at DESC);
CREATE INDEX idx_listening_history_owner_date ON listening_history(owner_id, listened_at DESC);
