/**
 * **ローカル開発とテスト専用** の JWT (HS256) の発行 / 検証。
 *
 * 本番の認証は Cloudflare Access (lib/access-auth.ts) で、このトークンは受け付けない
 * (authz.ts の `resolveIdentity` が、Access が未設定かつ localhost のときだけ読む)。
 * seed の利用者で画面・スモーク・route テストを動かすために残している。
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ISSUER = "stella-api";
const AUDIENCE = "stella-web";
const TTL_SEC = 60 * 60 * 24; // 24 時間

function secretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signAccessToken(
  secret: string,
  userId: string,
  email: string,
): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SEC}s`)
    .sign(secretKey(secret));
}

export async function verifyAccessToken(secret: string, token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secretKey(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (!payload.sub) throw new Error("missing sub");
  return payload;
}
