import { z } from "zod";
import { authenticateRequest, forbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  values: z.record(z.string(), z.unknown()),
  tagIds: z.array(z.string()).max(100),
  addHistory: z.boolean().default(false),
});

const settings = {
  movies: { singular: "movie", fields: ["rating","status","note","watched_at","number_of_episodes","watched_episode"], history: ["viewing_history","movie_id","watched_at"] },
  books: { singular: "book", fields: ["rating","status","note","read_at"], history: ["reading_history","book_id","read_at"] },
  music: { singular: "music", fields: ["rating","status","note","listened_at"], history: ["listening_history","music_id","listened_at"] },
} as const;

export async function PUT(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
  try {
    const { user, env } = await authenticateRequest(request);
    const { kind, id } = await context.params;
    if (!(kind in settings)) return Response.json({ error: "Unsupported kind" }, { status: 404 });
    const config = settings[kind as keyof typeof settings];
    const input = schema.parse(await request.json());
    const exists = await env.DB.prepare(`SELECT id FROM "${kind}" WHERE id = ? AND owner_id = ?`).bind(id, user.id).first();
    if (!exists) return Response.json({ error: "Not found" }, { status: 404 });

    const values: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const field of config.fields) if (field in input.values) values[field] = input.values[field] ?? null;
    const entries = Object.entries(values);
    const statements: D1PreparedStatement[] = [
      env.DB.prepare(`UPDATE "${kind}" SET ${entries.map(([key]) => `"${key}" = ?`).join(",")} WHERE id = ? AND owner_id = ?`).bind(...entries.map(([, value]) => value), id, user.id),
      env.DB.prepare(`DELETE FROM "${config.singular}_tags" WHERE "${config.singular}_id" = ? AND owner_id = ?`).bind(id, user.id),
    ];
    for (const tagId of new Set(input.tagIds)) {
      statements.push(env.DB.prepare(
        `INSERT INTO "${config.singular}_tags" (owner_id, "${config.singular}_id", tag_id)
         SELECT ?, ?, id FROM tags WHERE id = ? AND owner_id = ?`
      ).bind(user.id, id, tagId, user.id));
    }
    if (input.addHistory) {
      const [historyTable, parentKey, dateKey] = config.history;
      const now = new Date().toISOString();
      const day = now.slice(0, 10);
      statements.push(env.DB.prepare(
        `INSERT INTO "${historyTable}" (id, owner_id, "${parentKey}", "${dateKey}", note, created_at)
         SELECT ?, ?, ?, ?, NULL, ?
         WHERE NOT EXISTS (
           SELECT 1 FROM "${historyTable}" WHERE owner_id = ? AND "${parentKey}" = ? AND "${dateKey}" >= ? AND "${dateKey}" < ?
         )`
      ).bind(crypto.randomUUID(), user.id, id, now, now, user.id, id, `${day}T00:00:00.000Z`, `${day}T23:59:59.999Z`));
    }
    await env.DB.batch(statements);
    return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && /Access|token|JWT|claim|configured/.test(error.message)) return forbidden(error);
    console.error("Atomic metadata update failed", error);
    return Response.json({ error: "Could not save; no changes were committed" }, { status: 400 });
  }
}

