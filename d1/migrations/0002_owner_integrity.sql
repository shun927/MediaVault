-- Keep relationship rows inside the authenticated owner's data boundary.
-- Existing tables remain intact; these guards apply to every future insert/update,
-- including imports and direct D1 access through application code.

CREATE TRIGGER movie_tags_owner_insert
BEFORE INSERT ON movie_tags
WHEN NOT EXISTS (SELECT 1 FROM movies WHERE id = NEW.movie_id AND owner_id = NEW.owner_id)
  OR NOT EXISTS (SELECT 1 FROM tags WHERE id = NEW.tag_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'movie_tags owner mismatch');
END;

CREATE TRIGGER movie_tags_owner_update
BEFORE UPDATE OF owner_id, movie_id, tag_id ON movie_tags
WHEN NOT EXISTS (SELECT 1 FROM movies WHERE id = NEW.movie_id AND owner_id = NEW.owner_id)
  OR NOT EXISTS (SELECT 1 FROM tags WHERE id = NEW.tag_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'movie_tags owner mismatch');
END;

CREATE TRIGGER book_tags_owner_insert
BEFORE INSERT ON book_tags
WHEN NOT EXISTS (SELECT 1 FROM books WHERE id = NEW.book_id AND owner_id = NEW.owner_id)
  OR NOT EXISTS (SELECT 1 FROM tags WHERE id = NEW.tag_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'book_tags owner mismatch');
END;

CREATE TRIGGER book_tags_owner_update
BEFORE UPDATE OF owner_id, book_id, tag_id ON book_tags
WHEN NOT EXISTS (SELECT 1 FROM books WHERE id = NEW.book_id AND owner_id = NEW.owner_id)
  OR NOT EXISTS (SELECT 1 FROM tags WHERE id = NEW.tag_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'book_tags owner mismatch');
END;

CREATE TRIGGER music_tags_owner_insert
BEFORE INSERT ON music_tags
WHEN NOT EXISTS (SELECT 1 FROM music WHERE id = NEW.music_id AND owner_id = NEW.owner_id)
  OR NOT EXISTS (SELECT 1 FROM tags WHERE id = NEW.tag_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'music_tags owner mismatch');
END;

CREATE TRIGGER music_tags_owner_update
BEFORE UPDATE OF owner_id, music_id, tag_id ON music_tags
WHEN NOT EXISTS (SELECT 1 FROM music WHERE id = NEW.music_id AND owner_id = NEW.owner_id)
  OR NOT EXISTS (SELECT 1 FROM tags WHERE id = NEW.tag_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'music_tags owner mismatch');
END;

CREATE TRIGGER viewing_history_owner_insert
BEFORE INSERT ON viewing_history
WHEN NOT EXISTS (SELECT 1 FROM movies WHERE id = NEW.movie_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'viewing_history owner mismatch');
END;

CREATE TRIGGER viewing_history_owner_update
BEFORE UPDATE OF owner_id, movie_id ON viewing_history
WHEN NOT EXISTS (SELECT 1 FROM movies WHERE id = NEW.movie_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'viewing_history owner mismatch');
END;

CREATE TRIGGER reading_history_owner_insert
BEFORE INSERT ON reading_history
WHEN NOT EXISTS (SELECT 1 FROM books WHERE id = NEW.book_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'reading_history owner mismatch');
END;

CREATE TRIGGER reading_history_owner_update
BEFORE UPDATE OF owner_id, book_id ON reading_history
WHEN NOT EXISTS (SELECT 1 FROM books WHERE id = NEW.book_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'reading_history owner mismatch');
END;

CREATE TRIGGER listening_history_owner_insert
BEFORE INSERT ON listening_history
WHEN NOT EXISTS (SELECT 1 FROM music WHERE id = NEW.music_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'listening_history owner mismatch');
END;

CREATE TRIGGER listening_history_owner_update
BEFORE UPDATE OF owner_id, music_id ON listening_history
WHEN NOT EXISTS (SELECT 1 FROM music WHERE id = NEW.music_id AND owner_id = NEW.owner_id)
BEGIN
  SELECT RAISE(ABORT, 'listening_history owner mismatch');
END;
