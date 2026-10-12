/**
 * テスト用の Clerk のセッショントークン。RS256 の鍵を作り、公開鍵 (PEM) を `CLERK_JWT_KEY` として
 * 渡す (API は通信なしで検証する)。トークンは Clerk が画面に渡すものと同じ形 (sub・sid・azp と、
 * セッショントークンに足した `email` クレーム)。
 */

import { exportSPKI, generateKeyPair, SignJWT } from "jose";

export const TEST_WEB_ORIGIN = "https://stella.example.com";
export const TEST_STAFF_ORIGIN = "https://stella-admin.example.com";

export interface ClerkTokenClaims {
  email?: string | null;
  sub?: string;
  sid?: string;
  azp?: string | null;
  /** 発行からの有効秒数 (既定 60)。負なら期限切れ。 */
  expiresIn?: number;
}

export interface ClerkFixture {
  /** `CLERK_JWT_KEY` に入れる公開鍵 (PEM)。 */
  jwtKey: string;
  sign(claims?: ClerkTokenClaims): Promise<string>;
  /** 別の鍵で署名した (偽の) トークン。 */
  signForged(claims?: ClerkTokenClaims): Promise<string>;
}

export async function setupClerkFixture(): Promise<ClerkFixture> {
  const real = await generateKeyPair("RS256", { extractable: true });
  const forged = await generateKeyPair("RS256");
  const jwtKey = await exportSPKI(real.publicKey);
  const build = (claims: ClerkTokenClaims) => {
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      sid: claims.sid ?? "sess_test",
      ...(claims.azp === null ? {} : { azp: claims.azp ?? TEST_WEB_ORIGIN }),
      ...(claims.email === null ? {} : { email: claims.email ?? "learner@example.test" }),
    };
    return new SignJWT(payload)
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "ins_test" })
      .setSubject(claims.sub ?? "user_test")
      .setIssuer("https://stella-test.clerk.accounts.dev")
      .setIssuedAt(now - 1)
      .setNotBefore(now - 5)
      .setExpirationTime(now + (claims.expiresIn ?? 60));
  };
  return {
    jwtKey,
    sign: (claims = {}) => build(claims).sign(real.privateKey),
    signForged: (claims = {}) => build(claims).sign(forged.privateKey),
  };
}
