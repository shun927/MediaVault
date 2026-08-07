import { z } from "zod";
import { authenticateRequest, forbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  kind: z.enum(["movies","books","music"]),
  item: z.record(z.string(), z.unknown()),
  tagIds: z.array(z.string().min(1)).max(100).default([]),
  addHistory: z.boolean().default(false),
});

const fields = {
  movies: ["tmdb_id","title","poster_url","director","year","overview","rating","status","note","watched_at","media_type","number_of_seasons","number_of_episodes","watched_episode"],
  books: ["google_books_id","title","cover_url","author","year","description","rating","status","note","read_at"],
  music: ["spotify_id","title","artwork_url","artist","year","type","rating","status","note","listened_at"],
} as const;

export async function POST(request: Request) {
  try {
    const { user, env } = await authenticateRequest(request);
    const input = schema.parse(await request.json());
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const row: Record<string, unknown> = { id, owner_id: user.id, created_at: now, updated_at: now };
    for (const key of fields[input.kind]) if (key in input.item) row[key] = input.item[key] ?? null;
    if (typeof row.title !== "string" || !row.title.trim()) return Response.json({ error: "Title is required" }, { status: 400 });

    const externalKey = input.kind === "movies" ? "tmdb_id" : input.kind === "books" ? "google_books_id" : "spotify_id";
    const externalId = row[externalKey];
    if (externalId !== null && externalId !== undefined && externalId !== "") {
      const discriminator = input.kind === "movies" ? "media_type" : input.kind === "music" ? "type" : null;
      const duplicate = discriminator
        ? await env.DB.prepare(`SELECT id FROM "${input.kind}" WHERE owner_id = ? AND "${externalKey}" = ? AND "${discriminator}" = ?`).bind(user.id, externalId, row[discriminator]).first<{ id: string }>()
        : await env.DB.prepare(`SELECT id FROM "${input.kind}" WHERE owner_id = ? AND "${externalKey}" = ?`).bind(user.id, externalId).first<{ id: string }>();
      if (duplicate) {
        return Response.json({ error: "追加済みの作品です", data: { id: duplicate.id } }, { status: 409, headers: { "Cache-Control": "no-store" } });
      }
    }

    const names = Object.keys(row);
    const statements: D1PreparedStatement[] = [
      env.DB.prepare(`INSERT INTO "${input.kind}" (${names.map((key) => `"${key}"`).join(",")}) VALUES (${names.map(() => "?").join(",")})`).bind(...Object.values(row)),
    ];
    const singular = input.kind === "movies" ? "movie" : input.kind === "books" ? "book" : "music";
    for (const tagId of new Set(input.tagIds)) {
      statements.push(env.DB.prepare(
        `INSERT INTO "${singular}_tags" (owner_id, "${singular}_id", tag_id)
         SELECT ?, ?, id FROM tags WHERE id = ? AND owner_id = ?`
      ).bind(user.id, id, tagId, user.id));
    }
    if (input.addHistory) {
      const history = input.kind === "movies" ? ["viewing_history","movie_id","watched_at"] : input.kind === "books" ? ["reading_history","book_id","read_at"] : ["listening_history","music_id","listened_at"];
      statements.push(env.DB.prepare(
        `INSERT INTO "${history[0]}" (id, owner_id, "${history[1]}", "${history[2]}", note, created_at) VALUES (?, ?, ?, ?, NULL, ?)`
      ).bind(crypto.randomUUID(), user.id, id, now, now));
    }
    await env.DB.batch(statements);
    return Response.json({ data: { id } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && /Access|token|JWT|claim|configured/.test(error.message)) return forbidden(error);
    console.error("Atomic library create failed", error);
    return Response.json({ error: "Could not add item; no changes were committed" }, { status: 400 });
  }
}

