/**
 * Google OAuth 2.0 (Authorization Code) + ID トークン検証。
 */

import { createRemoteJWKSet, jwtVerify } from "jose";

import type { Env } from "../env.js";
import { isAllowedOrigin } from "./cors.js";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const STATE_TTL_SEC = 600;

interface OAuthStatePayload {
  returnTo: string;
  nonce: string;
  exp: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  let base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signState(secret: string, payloadB64: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return toBase64Url(new Uint8Array(sig));
}

async function verifyStateSignature(secret: string, payloadB64: string, sigB64: string): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(sigB64),
    new TextEncoder().encode(payloadB64),
  );
}

export function resolveOAuthReturnTo(env: Env, returnToParam: string | undefined): string {
  const fallbackBase = (env.INVITE_REDIRECT_URL ?? "http://localhost:5173").replace(/\/+$/, "");
  const fallback = `${fallbackBase}/auth/callback`;

  const candidate = returnToParam?.trim();
  if (!candidate) return fallback;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return fallback;
    if (!isAllowedOrigin(url.origin, env.ALLOWED_ORIGINS)) return fallback;
    if (!url.pathname.startsWith("/auth/callback")) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

export function googleRedirectUri(requestUrl: string): string {
  const url = new URL(requestUrl);
  url.pathname = "/api/auth/google/callback";
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function createOAuthState(
  secret: string,
  returnTo: string,
): Promise<string> {
  const payload: OAuthStatePayload = {
    returnTo,
    nonce: crypto.randomUUID(),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SEC,
  };
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sigB64 = await signState(secret, payloadB64);
  return `${payloadB64}.${sigB64}`;
}

export async function parseOAuthState(
  secret: string,
  state: string,
): Promise<OAuthStatePayload | null> {
  const [payloadB64, sigB64] = state.split(".");
  if (!payloadB64 || !sigB64) return null;
  if (!(await verifyStateSignature(secret, payloadB64, sigB64))) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payloadB64));
    const payload = JSON.parse(json) as OAuthStatePayload;
    if (typeof payload.returnTo !== "string") return null;
    if (typeof payload.nonce !== "string") return null;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(
  clientId: string,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

export async function exchangeGoogleCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<string> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = (await res.json()) as GoogleTokenResponse;
  if (!res.ok || !data.id_token) {
    const detail = data.error_description ?? data.error ?? `HTTP ${res.status}`;
    throw new Error(`Google token exchange failed: ${detail}`);
  }
  return data.id_token;
}

export interface GoogleUserClaims {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
): Promise<GoogleUserClaims> {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  const sub = payload.sub;
  const email = payload.email;
  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("Google ID token missing sub or email");
  }

  const emailVerified = payload.email_verified === true;
  if (!emailVerified) {
    throw new Error("Google email is not verified");
  }

  return {
    sub,
    email: email.toLowerCase(),
    emailVerified,
    ...(typeof payload.name === "string" ? { name: payload.name } : {}),
    ...(typeof payload.picture === "string" ? { picture: payload.picture } : {}),
  };
}

export function redirectWithAuthResult(returnTo: string, params: Record<string, string>): Response {
  const url = new URL(returnTo);
  url.hash = new URLSearchParams(params).toString();
  return Response.redirect(url.toString(), 302);
}
