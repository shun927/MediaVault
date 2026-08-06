import { authenticateRequest, forbidden } from "@/lib/auth";
import { importV1 } from "@/lib/d1/transfer";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user, env } = await authenticateRequest(request);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 10_000_000) return Response.json({ error: "Import file is too large" }, { status: 413 });
    const counts = await importV1(env.DB, user, await request.json());
    return Response.json({ success: true, counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return Response.json({ error: "Invalid export v1 data" }, { status: 400 });
    }
    if (error instanceof Error && /Access|token|JWT|claim|configured/.test(error.message)) return forbidden(error);
    console.error("Import failed", error);
    return Response.json({ error: "Import failed; no rows were committed" }, { status: 400 });
  }
}
