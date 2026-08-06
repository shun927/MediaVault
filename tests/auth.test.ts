import { beforeAll, describe, expect, it } from "vitest";
import { generateKeyPair, SignJWT } from "jose";
import { authenticateRequest, forbidden, verifyAccessToken } from "@/lib/auth";
import type { MediaVaultEnv } from "@/lib/cloudflare";

const issuer = "https://example.cloudflareaccess.com";
const audience = "test-audience";
const env = { TEAM_DOMAIN: issuer, POLICY_AUD: audience } as MediaVaultEnv;
let privateKey: CryptoKey;
let publicKey: CryptoKey;
let otherPrivateKey: CryptoKey;

beforeAll(async () => {
  ({ privateKey, publicKey } = await generateKeyPair("RS256"));
  ({ privateKey: otherPrivateKey } = await generateKeyPair("RS256"));
});

function token(overrides: { issuer?: string; audience?: string; key?: CryptoKey } = {}) {
  return new SignJWT({ email: "owner@example.com", name: "Owner" })
    .setProtectedHeader({ alg: "RS256" })
    .setSubject("owner-sub")
    .setIssuer(overrides.issuer || issuer)
    .setAudience(overrides.audience || audience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(overrides.key || privateKey);
}

describe("Cloudflare Access JWT", () => {
  it("accepts a valid signed token", async () => {
    await expect(verifyAccessToken(await token(), env, publicKey)).resolves.toMatchObject({
      id: "owner-sub",
      email: "owner@example.com",
    });
  });

  it("rejects a token signed by another key", async () => {
    await expect(verifyAccessToken(await token({ key: otherPrivateKey }), env, publicKey)).rejects.toThrow();
  });

  it("rejects the wrong issuer", async () => {
    await expect(verifyAccessToken(await token({ issuer: "https://wrong.example" }), env, publicKey)).rejects.toThrow();
  });

  it("rejects the wrong audience", async () => {
    await expect(verifyAccessToken(await token({ audience: "wrong" }), env, publicKey)).rejects.toThrow();
  });
  it("rejects a request without an Access assertion as 403", async () => {
    await expect(authenticateRequest(new Request("https://app.example"), env)).rejects.toThrow("token is required");
    expect(forbidden().status).toBe(403);
  });
});
