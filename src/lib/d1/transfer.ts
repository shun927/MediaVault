import { z } from "zod";
import type { AuthenticatedUser } from "@/lib/auth";

const row = z.record(z.string(), z.unknown());
const exportSchema = z.object({
  version: z.union([z.literal("1.0"), z.literal(1)]),
  movies: z.array(row).default([]),
  books: z.array(row).default([]),
  music: z.array(row).default([]),
  tags: z.array(row).default([]),
  movie_tags: z.array(row).default([]),
  book_tags: z.array(row).default([]),
  music_tags: z.array(row).default([]),
  viewing_history: z.array(row).default([]),
  reading_history: z.array(row).default([]),
  listening_history: z.array(row).default([]),
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
const orderedTables = ["tags","movies","books","music","movie_tags","book_tags","music_tags","viewing_history","reading_history","listening_history"];

function clean(table: string, input: Record<string, unknown>, ownerId: string) {
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

export async function importV1(db: D1Database, user: AuthenticatedUser, input: unknown) {
  const data = exportSchema.parse(input);
  const statements: D1PreparedStatement[] = [];
  const counts: Record<string, number> = {};
  for (const table of orderedTables) {
    const rows = data[table as keyof typeof data] as Record<string, unknown>[];
    counts[table] = rows.length;
    for (const source of rows) {
      const item = clean(table, source, user.id);
      const names = Object.keys(item);
      const updates = names.filter((name) => !["id","owner_id","movie_id","book_id","music_id","tag_id"].includes(name));
      const conflict = table.endsWith("_tags")
        ? table === "movie_tags" ? "movie_id,tag_id" : table === "book_tags" ? "book_id,tag_id" : "music_id,tag_id"
        : "id";
      const action = updates.length
        ? `DO UPDATE SET ${updates.map((name) => `"${name}"=excluded."${name}"`).join(",")} WHERE owner_id=excluded.owner_id`
        : "DO NOTHING";
      statements.push(db.prepare(
        `INSERT INTO "${table}" (${names.map((name) => `"${name}"`).join(",")}) VALUES (${names.map(() => "?").join(",")}) ON CONFLICT(${conflict}) ${action}`
      ).bind(...Object.values(item)));
    }
  }
  if (statements.length > 5000) throw new Error("Import is limited to 5,000 rows");
  if (statements.length) await db.batch(statements);
  return counts;
}

export async function exportV1(db: D1Database, userId: string) {
  const result: Record<string, unknown> = { version: "1.0", exported_at: new Date().toISOString() };
  for (const table of orderedTables) {
    const rows = await db.prepare(`SELECT * FROM "${table}" WHERE owner_id = ?`).bind(userId).all<Record<string, unknown>>();
    result[table] = rows.results.map((source) => {
      const item: Record<string, unknown> = { ...source, user_id: source.owner_id };
      delete item.owner_id;
      return item;
    });
  }
  return result;
}
