/**
 * Workers 自前 JWT (HS256) の発行 / 検証。
 */

import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ISSUER = "falcon-api";
const AUDIENCE = "falcon-web";
const TTL_SEC = 60 * 60 * 24 * 7; // 7 日

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

export async function verifyAccessToken(
  secret: string,
  token: string,
): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secretKey(secret), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (!payload.sub) throw new Error("missing sub");
  return payload;
}
