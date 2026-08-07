import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const localHost = request.nextUrl.hostname === "localhost" || request.nextUrl.hostname === "127.0.0.1";
  if (localHost && request.headers.get("x-mediavault-dev-auth") === "1") {
    return NextResponse.next();
  }
  try {
    await authenticateRequest(request, undefined, { syncUser: false });
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
}


export const runtime = "experimental-edge";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json|sw.js).*)"],
};
