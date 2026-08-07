import { z } from 'zod';
import { authenticateRequest, forbidden } from '@/lib/auth';
import { appendHistory, type HistoryKind } from '@/lib/d1/history';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({ occurredAt: z.string().datetime({ offset: true }).optional(), note: z.string().trim().max(1000).optional() }).strict();

export async function POST(request: Request, context: { params: Promise<{ kind: string; id: string }> }) {
    try {
        const { user, env } = await authenticateRequest(request);
        const { kind, id } = await context.params;
        if (kind !== 'movies' && kind !== 'books' && kind !== 'music') return Response.json({ error: 'Unsupported kind' }, { status: 404 });
        const input = bodySchema.parse(await request.json());
        const occurredAt = input.occurredAt ? new Date(input.occurredAt).toISOString() : new Date().toISOString();
        const result = await appendHistory(env.DB, user, kind as HistoryKind, id, occurredAt, input.note);
        if (!result) return Response.json({ error: 'Not found' }, { status: 404 });
        return Response.json({ data: result }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        if (error instanceof z.ZodError || error instanceof SyntaxError) return Response.json({ error: 'Invalid history request' }, { status: 400 });
        if (error instanceof Error && /Access|token|JWT|claim|configured/.test(error.message)) return forbidden(error);
        console.error('History create failed', error);
        return Response.json({ error: 'Could not add history' }, { status: 400 });
    }
}
