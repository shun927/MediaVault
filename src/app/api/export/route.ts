import { authenticateRequest, forbidden } from "@/lib/auth";
import { exportV1 } from "@/lib/d1/transfer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, env } = await authenticateRequest(request);
    const data = await exportV1(env.DB, user.id);
    const date = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mediavault-export-${date}.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return forbidden(error);
  }
}
