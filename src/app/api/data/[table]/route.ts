import { authenticateRequest, forbidden } from "@/lib/auth";
import { dataRequestSchema, Repository } from "@/lib/d1/repository";
import { PayloadTooLargeError, readJsonWithLimit } from "@/lib/http";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ table: string }> }) {
  try {
    const { user, env } = await authenticateRequest(request);
    const { table } = await context.params;
    const body = dataRequestSchema.parse(await readJsonWithLimit(request, 1_000_000));
    const result = await new Repository(env.DB, user).execute(table, body);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return Response.json({ error: "Request body is too large" }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof SyntaxError || error instanceof ZodError) {
      return Response.json({ error: "Invalid data request" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof Error && /Access|token|JWT|claim|configured/.test(error.message)) return forbidden(error);
    console.error("Data API failed", error);
    return Response.json({ error: "Request failed" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
