import { authenticateRequest, forbidden } from "@/lib/auth";
import { Repository, type DataRequest } from "@/lib/d1/repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ table: string }> }) {
  try {
    const { user, env } = await authenticateRequest(request);
    const { table } = await context.params;
    const body = await request.json() as DataRequest;
    const result = await new Repository(env.DB, user).execute(table, body);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof SyntaxError) return Response.json({ error: "Invalid JSON" }, { status: 400 });
    if (error instanceof Error && /Access|token|JWT|claim|configured/.test(error.message)) return forbidden(error);
    console.error("Data API failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Request failed" }, { status: 400 });
  }
}

