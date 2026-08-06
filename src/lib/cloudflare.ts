import { getCloudflareContext } from "@opennextjs/cloudflare";

export type MediaVaultEnv = CloudflareEnv & {
  DB: D1Database;
  TEAM_DOMAIN?: string;
  POLICY_AUD?: string;
  DEV_AUTH_SUB?: string;
  DEV_AUTH_EMAIL?: string;
  TMDB_API_KEY?: string;
  RAKUTEN_APP_ID?: string;
  RAKUTEN_ACCESS_KEY?: string;
  RAKUTEN_ALLOWED_ORIGIN?: string;
  RAKUTEN_ALLOWED_REFERRER?: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
  SPOTIFY_MARKET?: string;
};

export async function getEnv(): Promise<MediaVaultEnv> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.DB) throw new Error("D1 binding DB is not configured");
  return env as MediaVaultEnv;
}
