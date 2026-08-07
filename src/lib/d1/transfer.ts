import { z } from "zod";
import type { AuthenticatedUser } from "@/lib/auth";

const id = z.string().min(1).max(200);
const text = (max: number) => z.string().max(max).nullable().optional();
const date = z.string().max(64).nullable().optional();
const integer = z.number().int().finite().nullable().optional();
const base = {
  id: id.optional(),
  user_id: id.optional(),
  owner_id: id.optional(),
  created_at: date,
  updated_at: date,
};

const tagSchema = z.object({
  ...base,
  name: z.string().min(1).max(200),
  color: z.string().max(64).nullable().optional(),
}).passthrough();

const movieSchema = z.object({
  ...base,
  tmdb_id: integer,
  title: z.string().min(1).max(500),
  poster_url: text(2_000),
  director: text(500),
  year: z.number().int().min(0).max(9_999).nullable().optional(),
  overview: text(50_000),
  rating: z.number().min(0).max(5).nullable().optional(),
  status: z.enum(["watched", "watching", "wishlist"]).optional(),
  note: text(100_000),
  watched_at: date,
  media_type: z.enum(["movie", "tv"]).optional(),
  number_of_seasons: integer,
  number_of_episodes: integer,
  watched_episode: integer,
}).passthrough();

const bookSchema = z.object({
  ...base,
  google_books_id: text(500),
  title: z.string().min(1).max(500),
  cover_url: text(2_000),
  author: text(1_000),
  year: z.number().int().min(0).max(9_999).nullable().optional(),
  description: text(50_000),
  rating: z.number().min(0).max(5).nullable().optional(),
  status: z.enum(["read", "reading", "wishlist"]).optional(),
  note: text(100_000),
  read_at: date,
}).passthrough();

const musicSchema = z.object({
  ...base,
  spotify_id: text(500),
  title: z.string().min(1).max(500),
  artwork_url: text(2_000),
  artist: text(1_000),
  year: z.number().int().min(0).max(9_999).nullable().optional(),
  type: z.enum(["track", "album"]).optional(),
  rating: z.number().min(0).max(5).nullable().optional(),
  status: z.enum(["listened", "listening", "wishlist"]).optional(),
  note: text(100_000),
  listened_at: date,
}).passthrough();

const relationSchema = (foreignKey: "movie_id" | "book_id" | "music_id") => z.object({
  user_id: id.optional(),
  owner_id: id.optional(),
  [foreignKey]: id,
  tag_id: id,
}).passthrough();

const historySchema = (foreignKey: "movie_id" | "book_id" | "music_id", dateKey: "watched_at" | "read_at" | "listened_at") => z.object({
  ...base,
  [foreignKey]: id,
  [dateKey]: z.string().min(1).max(64),
  note: text(100_000),
}).passthrough();

const exportSchema = z.object({
  version: z.union([z.literal("1.0"), z.literal(1)]),
  movies: z.array(movieSchema).max(5_000).default([]),
  books: z.array(bookSchema).max(5_000).default([]),
  music: z.array(musicSchema).max(5_000).default([]),
  tags: z.array(tagSchema).max(5_000).default([]),
  movie_tags: z.array(relationSchema("movie_id")).max(5_000).default([]),
  book_tags: z.array(relationSchema("book_id")).max(5_000).default([]),
  music_tags: z.array(relationSchema("music_id")).max(5_000).default([]),
  viewing_history: z.array(historySchema("movie_id", "watched_at")).max(5_000).default([]),
  reading_history: z.array(historySchema("book_id", "read_at")).max(5_000).default([]),
  listening_history: z.array(historySchema("music_id", "listened_at")).max(5_000).default([]),
});

const columns: Record<string, string[]> = {
  tags: ["id","name","color","created_at","updated_at"],
  movies: ["id","tmdb_id","title","poster_url","director","year","overview","rating","status","note","watched_at","media_type","number_of_seasons","number_of_episodes","watched_episode","created_at","updated_at"],
  books: ["id","google_books_id","title","cover_url","author","year","description","rating","status","note","read_at","created_at","updated_at"],
  music: ["id","spotify_id","title","artwork_url","artist","year","type","rating","status","note","listened_at","created_at","updated_at"],
  movie_tags: ["movie_id","tag_id"],
  book_tags: ["book_id","tag_id"],
  music_tags: ["music_id","tag_id"],
  viewing_history: ["id","movie_id","watched_at","note","created_at"],
  reading_history: ["id","book_id","read_at","note","created_at"],
  listening_history: ["id","music_id","listened_at","note","created_at"],
};

const orderedTables = ["tags","movies","books","music","movie_tags","book_tags","music_tags","viewing_history","reading_history","listening_history"] as const;
const idTables = ["tags","movies","books","music","viewing_history","reading_history","listening_history"] as const;
type TableName = typeof orderedTables[number];

function clean(table: TableName, input: Record<string, unknown>, ownerId: string) {
  const now = new Date().toISOString();
  const result: Record<string, unknown> = { owner_id: ownerId };
  for (const key of columns[table]) {
    if (key === "id") result.id = typeof input.id === "string" ? input.id : crypto.randomUUID();
    else if (key in input) result[key] = input[key] ?? null;
  }
  if ("created_at" in result === false && columns[table].includes("created_at")) result.created_at = now;
  if ("updated_at" in result === false && columns[table].includes("updated_at")) result.updated_at = now;
  return result;
}

async function prepareRows(db: D1Database, ownerId: string, input: z.infer<typeof exportSchema>) {
  const prepared = Object.fromEntries(
    orderedTables.map((table) => [table, (input[table] as Record<string, unknown>[]).map((row) => ({ ...row }))]),
  ) as Record<TableName, Record<string, unknown>[]>;
  const idMaps = new Map<string, Map<string, string>>();

  for (const table of idTables) {
    const rows = prepared[table];
    const sourceIds = new Set<string>();
    for (const row of rows) {
      const sourceId = typeof row.id === "string" ? row.id : crypto.randomUUID();
      if (sourceIds.has(sourceId)) throw new Error("Duplicate " + table + " id in import");
      sourceIds.add(sourceId);
      row.id = sourceId;
    }

    const existingOwners = new Map<string, string>();
    const ids = [...sourceIds];
    for (let offset = 0; offset < ids.length; offset += 100) {
      const chunk = ids.slice(offset, offset + 100);
      if (!chunk.length) continue;
      const result = await db.prepare(
        'SELECT id, owner_id FROM "' + table + '" WHERE id IN (' + chunk.map(() => "?").join(",") + ')'
      ).bind(...chunk).all<{ id: string; owner_id: string }>();
      for (const row of result.results) existingOwners.set(row.id, row.owner_id);
    }

    const map = new Map<string, string>();
    for (const sourceId of sourceIds) {
      map.set(sourceId, existingOwners.has(sourceId) && existingOwners.get(sourceId) !== ownerId ? crypto.randomUUID() : sourceId);
    }
    idMaps.set(table, map);
    for (const row of rows) row.id = map.get(row.id as string);
  }

  const reference = (table: "tags" | "movies" | "books" | "music", value: unknown) =>
    typeof value === "string" ? idMaps.get(table)?.get(value) || value : value;

  for (const row of prepared.movie_tags) {
    row.movie_id = reference("movies", row.movie_id);
    row.tag_id = reference("tags", row.tag_id);
  }
  for (const row of prepared.book_tags) {
    row.book_id = reference("books", row.book_id);
    row.tag_id = reference("tags", row.tag_id);
  }
  for (const row of prepared.music_tags) {
    row.music_id = reference("music", row.music_id);
    row.tag_id = reference("tags", row.tag_id);
  }
  for (const row of prepared.viewing_history) row.movie_id = reference("movies", row.movie_id);
  for (const row of prepared.reading_history) row.book_id = reference("books", row.book_id);
  for (const row of prepared.listening_history) row.music_id = reference("music", row.music_id);

  return prepared;
}

export async function importV1(db: D1Database, user: AuthenticatedUser, input: unknown) {
  const data = exportSchema.parse(input);
  const prepared = await prepareRows(db, user.id, data);
  const statements: D1PreparedStatement[] = [];
  const counts: Record<string, number> = {};

  for (const table of orderedTables) {
    const rows = prepared[table];
    counts[table] = rows.length;
    for (const source of rows) {
      const item = clean(table, source, user.id);
      const names = Object.keys(item);
      const updates = names.filter((name) => !["id","owner_id","movie_id","book_id","music_id","tag_id"].includes(name));
      const conflict = table.endsWith("_tags")
        ? table === "movie_tags" ? "movie_id,tag_id" : table === "book_tags" ? "book_id,tag_id" : "music_id,tag_id"
        : "id";
      const action = updates.length
        ? "DO UPDATE SET " + updates.map((name) => '"' + name + '"=excluded."' + name + '"').join(",") + " WHERE owner_id=excluded.owner_id"
        : "DO NOTHING";
      const insertSql = 'INSERT INTO "' + table + '" (' + names.map((name) => '"' + name + '"').join(",") + ") VALUES (" + names.map(() => "?").join(",") + ") ON CONFLICT(" + conflict + ") " + action;
      statements.push(db.prepare(insertSql).bind(...Object.values(item)));
    }
  }

  if (statements.length > 5_000) throw new Error("Import is limited to 5,000 rows");
  if (statements.length) await db.batch(statements);
  return counts;
}

export async function exportV1(db: D1Database, userId: string) {
  const result: Record<string, unknown> = { version: "1.0", exported_at: new Date().toISOString() };
  for (const table of orderedTables) {
    const rows = await db.prepare('SELECT * FROM "' + table + '" WHERE owner_id = ?').bind(userId).all<Record<string, unknown>>();
    result[table] = rows.results.map((source) => {
      const item: Record<string, unknown> = { ...source, user_id: source.owner_id };
      delete item.owner_id;
      return item;
    });
  }
  return result;
}
