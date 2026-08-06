import { authenticateRequest, forbidden } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user } = await authenticateRequest(request);
    return Response.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return forbidden(error);
  }
}

