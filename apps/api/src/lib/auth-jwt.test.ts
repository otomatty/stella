import { Hono } from "hono";
import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import type { Env } from "../env.js";
import { signAccessToken, verifyAccessToken } from "./auth-jwt.js";
import { errorResponse, verifyToken } from "./authz.js";

const SECRET = "phase-c-test-secret-at-least-32-characters";

async function tokenWithClaims(issuer: string, audience: string) {
  return new SignJWT({ email: "learner@example.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("learner")
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(new TextEncoder().encode(SECRET));
}

describe("Stella access tokens", () => {
  it("issues and verifies the new claims with the existing user identity and lifetime", async () => {
    const token = await signAccessToken(SECRET, "learner", "learner@example.com");
    const payload = await verifyAccessToken(SECRET, token);
    expect(payload).toMatchObject({
      iss: "stella-api",
      aud: "stella-web",
      sub: "learner",
      email: "learner@example.com",
    });
    expect(Number(payload.exp) - Number(payload.iat)).toBe(24 * 60 * 60);
  });

  // 旧名は失効の回帰テストだけに残す。同じ署名鍵でも旧セッションを拒否する。
  it.each([
    ["falcon-api", "falcon-web"],
    ["falcon-api", "stella-web"],
    ["stella-api", "falcon-web"],
  ])("rejects issuer %s / audience %s as HTTP 401", async (issuer, audience) => {
    const app = new Hono<{ Bindings: Env }>();
    app.get("/protected", async (c) => {
      try {
        await verifyToken(c);
        return c.json({ ok: true });
      } catch (error) {
        return errorResponse(c, error);
      }
    });
    const token = await tokenWithClaims(issuer, audience);
    await expect(verifyAccessToken(SECRET, token)).rejects.toMatchObject({
      code: "ERR_JWT_CLAIM_VALIDATION_FAILED",
    });
    const response = await app.request(
      "/protected",
      { headers: { Authorization: `Bearer ${token}` } },
      { AUTH_JWT_SECRET: SECRET },
    );
    expect(response.status).toBe(401);
  });
});
