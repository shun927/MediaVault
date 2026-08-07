import { authenticateRequest, forbidden } from "@/lib/auth";
import { importV1 } from "@/lib/d1/transfer";
import { PayloadTooLargeError, readJsonWithLimit } from "@/lib/http";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user, env } = await authenticateRequest(request);
    const counts = await importV1(env.DB, user, await readJsonWithLimit(request, 10_000_000));
    return Response.json({ success: true, counts }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return Response.json({ error: "Import file is too large" }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return Response.json({ error: "Invalid export v1 data" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof Error && /Access|token|JWT|claim|configured/.test(error.message)) return forbidden(error);
    console.error("Import failed", error);
    return Response.json({ error: "Import failed; no rows were committed" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
