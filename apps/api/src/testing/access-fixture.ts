/**
 * Cloudflare Access のトークンをテストで作る足場。
 *
 * 本物と同じ RS256 の鍵で署名し、`https://<team>/cdn-cgi/access/certs` への fetch を差し替えて
 * 公開鍵 (JWKS) を返す。API の検証コード (lib/access-auth.ts) はそのまま通る。
 *
 * 検証側は鍵の取得をモジュール内にキャッシュする (jose は 30 秒は取り直さない) ので、
 * 1 つのテストファイルでは `beforeAll` で 1 回だけ作って使い回すこと。
 */
import { exportJWK, generateKeyPair, SignJWT, type JWK } from "jose";
import { vi } from "vitest";

export const TEST_TEAM_DOMAIN = "stella-test.cloudflareaccess.com";
export const TEST_ACCESS_AUD = "a".repeat(64);

export interface AccessFixture {
  /** Access がオリジンに付けるのと同じ形のトークンを作る。 */
  sign(claims: {
    email?: string;
    country?: string;
    iat?: number;
    aud?: string;
    iss?: string;
  }): Promise<string>;
  /** 別の鍵で署名した (偽の) トークン。 */
  signForged(claims: { email: string }): Promise<string>;
  restore(): void;
}

export async function setupAccessFixture(): Promise<AccessFixture> {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const forged = await generateKeyPair("RS256");
  const kid = crypto.randomUUID();
  const jwk: JWK = { ...(await exportJWK(publicKey)), kid, alg: "RS256", use: "sig" };
  const realFetch = globalThis.fetch;
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === `https://${TEST_TEAM_DOMAIN}/cdn-cgi/access/certs`) {
      return new Response(JSON.stringify({ keys: [jwk] }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    return realFetch(input, init);
  });
  const build = (claims: {
    email?: string;
    country?: string;
    iat?: number;
    aud?: string;
    iss?: string;
  }) => {
    const jwt = new SignJWT({
      ...(claims.email !== undefined ? { email: claims.email } : {}),
      ...(claims.country ? { country: claims.country } : {}),
      type: "app",
    })
      .setProtectedHeader({ alg: "RS256", kid })
      .setSubject("access-user-id")
      .setIssuer(claims.iss ?? `https://${TEST_TEAM_DOMAIN}`)
      .setAudience(claims.aud ?? TEST_ACCESS_AUD)
      .setExpirationTime("24h");
    return claims.iat !== undefined ? jwt.setIssuedAt(claims.iat) : jwt.setIssuedAt();
  };
  return {
    sign: (claims) => build(claims).sign(privateKey),
    signForged: (claims) => build(claims).sign(forged.privateKey),
    restore: () => spy.mockRestore(),
  };
}
