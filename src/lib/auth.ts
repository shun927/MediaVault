import { createRemoteJWKSet, jwtVerify } from "jose";
import { getEnv, type MediaVaultEnv } from "@/lib/cloudflare";

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
}

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function normalizeIssuer(teamDomain: string): string {
  return teamDomain.replace(/\/+$/, "");
}

export async function verifyAccessToken(token: string, env: MediaVaultEnv, verificationKey?: CryptoKey): Promise<AuthenticatedUser> {
  if (!env.TEAM_DOMAIN || !env.POLICY_AUD) throw new Error("Cloudflare Access is not configured");
  const issuer = normalizeIssuer(env.TEAM_DOMAIN);
  let jwks = jwksByIssuer.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));
    jwksByIssuer.set(issuer, jwks);
  }
  const { payload } = await jwtVerify(token, verificationKey || jwks, {
    issuer,
    audience: env.POLICY_AUD,
    algorithms: ["RS256"],
  });
  if (!payload.sub || typeof payload.email !== "string") throw new Error("Access token is missing identity claims");
  return {
    id: payload.sub,
    email: payload.email,
    displayName: typeof payload.name === "string" ? payload.name : null,
  };
}

export async function authenticateRequest(request: Request, injectedEnv?: MediaVaultEnv): Promise<{ user: AuthenticatedUser; env: MediaVaultEnv }> {
  const env = injectedEnv || await getEnv();
  let user: AuthenticatedUser;
  if (process.env.NODE_ENV !== "production" && env.DEV_AUTH_SUB) {
    user = {
      id: env.DEV_AUTH_SUB,
      email: env.DEV_AUTH_EMAIL || "local@example.com",
      displayName: "Local user",
    };
  } else {
    const token = request.headers.get("Cf-Access-Jwt-Assertion");
    if (!token) throw new Error("Cloudflare Access token is required");
    user = await verifyAccessToken(token, env);
  }

  await env.DB.prepare(
    `INSERT INTO users (id, email, display_name, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       display_name = COALESCE(excluded.display_name, users.display_name),
       updated_at = excluded.updated_at`
  ).bind(user.id, user.email, user.displayName, new Date().toISOString()).run();

  return { user, env };
}

export async function authenticateSearchRequest(request: Request, route: string) {
  const auth = await authenticateRequest(request);
  const windowStart = new Date(Math.floor(Date.now() / 60_000) * 60_000).toISOString();
  const row = await auth.env.DB.prepare(
    `INSERT INTO rate_limits (owner_id, route, window_start, request_count)
     VALUES (?, ?, ?, 1)
     ON CONFLICT(owner_id, route, window_start)
     DO UPDATE SET request_count = request_count + 1
     RETURNING request_count`
  ).bind(auth.user.id, route, windowStart).first<{ request_count: number }>();
  if ((row?.request_count || 0) > 60) throw new Error("Rate limit exceeded");
  return auth;
}

export function upstreamSignal(request: Request): AbortSignal {
  return AbortSignal.any([request.signal, AbortSignal.timeout(8_000)]);
}
export function forbidden(error?: unknown): Response {
  console.warn("Access denied", error instanceof Error ? error.message : "unknown");
  return Response.json({ error: "Forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
}
