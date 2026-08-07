import type { AuthenticatedUser } from '@/lib/auth';

export type HistoryKind = 'movies' | 'books' | 'music';

const settings = {
    movies: { historyTable: 'viewing_history', parentKey: 'movie_id', dateKey: 'watched_at', status: 'watched' },
    books: { historyTable: 'reading_history', parentKey: 'book_id', dateKey: 'read_at', status: 'read' },
    music: { historyTable: 'listening_history', parentKey: 'music_id', dateKey: 'listened_at', status: 'listened' },
} as const;

export async function appendHistory(db: D1Database, user: AuthenticatedUser, kind: HistoryKind, itemId: string, occurredAt: string, note?: string) {
    const config = settings[kind];
    const exists = await db.prepare(`SELECT id FROM "${kind}" WHERE id = ? AND owner_id = ?`).bind(itemId, user.id).first();
    if (!exists) return null;

    const historyId = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.batch([
        db.prepare(`INSERT INTO "${config.historyTable}" (id, owner_id, "${config.parentKey}", "${config.dateKey}", note, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
            .bind(historyId, user.id, itemId, occurredAt, note || null, now),
        db.prepare(`UPDATE "${kind}" SET status = ?, "${config.dateKey}" = ?, updated_at = ? WHERE id = ? AND owner_id = ?`)
            .bind(config.status, occurredAt, now, itemId, user.id),
    ]);
    return { historyId, occurredAt };
}
