/**
 * Better Auth: Google login, sessions and sign-out (Issue #117).
 *
 * The web reaches the API through its own origin (`apps/web/worker`), so the session is an
 * HttpOnly cookie on the web origin. The VS Code extension gets a session token from the link-code
 * exchange and sends it as `Authorization: Bearer` (resolved in `authz.ts`).
 *
 * Sessions live in D1 (`auth_sessions`), so signing out, disabling a user or deleting a session
 * takes effect on the next request.
 */

import { and, eq, ne } from "drizzle-orm";
import { betterAuth } from "better-auth/minimal";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { getDb, type Db } from "../db/client.js";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
  profiles,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { recordAudit } from "./audit.js";

function createAuth(env: Env & AuthSettings) {
  const db = getDb(env);
  return betterAuth({
    appName: "STELLA",
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
      },
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: "select_account",
        // Keep the Google name and picture current; profiles copy them (syncProfile).
        overrideUserInfoOnSignIn: true,
      },
    },
    account: {
      accountLinking: {
        trustedProviders: ["google"],
        // An invited person already has an auth_users row (made by the admin, so not
        // verified). Google verifies the address, and Google is the only way to sign in, so
        // the first Google login links to that row and keeps its id (= profiles.id).
        requireLocalEmailVerified: false,
        updateUserInfoOnLink: true,
      },
    },
    advanced: {
      // Better Auth skips the return-URL / origin checks when NODE_ENV is "test"; keep them on
      // everywhere so the tests check what production runs.
      disableOriginCheck: false,
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    // Google is the only sign-in (no password to guess), and its limiter keeps counts in one
    // isolate's memory, so it would only throttle an office sharing one IP.
    rateLimit: { enabled: false },
    telemetry: { enabled: false },
    databaseHooks: {
      session: {
        create: {
          after: async (session, ctx) => {
            // Web logins only; the VS Code exchange records its own login.
            if (!ctx?.path?.startsWith("/callback/")) return;
            await syncProfile(db, session.userId);
            const headers = ctx.request?.headers ?? ctx.headers;
            await recordLogin(db, session.userId, session.ipAddress || ipOf(headers));
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

interface AuthSettings {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

/** Whether Google login can run (all four settings present). Health reports this. */
export function authConfigured(env: Env): env is Env & AuthSettings {
  return Boolean(
    env.BETTER_AUTH_SECRET &&
      env.BETTER_AUTH_URL &&
      env.GOOGLE_CLIENT_ID &&
      env.GOOGLE_CLIENT_SECRET,
  );
}

// One instance per env object (Workers reuse it across requests in an isolate).
const instances = new WeakMap<Env, Auth>();
/** The Better Auth instance, or null when login is not configured (local dev, tests). */
export function getAuth(env: Env): Auth | null {
  if (!authConfigured(env)) return null;
  let auth = instances.get(env);
  if (!auth) {
    auth = createAuth(env);
    instances.set(env, auth);
  }
  return auth;
}

function ipOf(headers: Headers | undefined): string | null {
  return (
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null
  );
}

/**
 * Copy the Google name and picture to the profile. The invited display name is the email's local
 * part, so the first login replaces it; once the person renames themselves (name_source='user')
 * it is kept. The picture is always refreshed (its URL can expire). A failure does not block login.
 */
async function syncProfile(db: Db, userId: string): Promise<void> {
  try {
    const user = (
      await db
        .select({ name: authUsers.name, image: authUsers.image })
        .from(authUsers)
        .where(eq(authUsers.id, userId))
        .limit(1)
    )[0];
    const displayName = user?.name.trim();
    const avatarUrl = user?.image?.trim();
    if (avatarUrl) await db.update(profiles).set({ avatarUrl }).where(eq(profiles.id, userId));
    if (displayName)
      await db
        .update(profiles)
        .set({
          displayName,
          initials: displayName.slice(0, 2).toUpperCase(),
          nameSource: "google",
        })
        .where(and(eq(profiles.id, userId), ne(profiles.nameSource, "user")));
  } catch (err) {
    console.error("[auth] google profile sync failed", err);
  }
}

/**
 * Audit a successful login (Issue #64). Not before the invitation: without a profile the tenant
 * is unknown, and the person cannot use the app anyway.
 */
export async function recordLogin(
  db: Db,
  userId: string,
  ip: string | null,
  provider: "google" | "vscode" = "google",
): Promise<void> {
  const profile = (
    await db
      .select({
        id: profiles.id,
        tenantId: profiles.tenantId,
        role: profiles.role,
        displayName: profiles.displayName,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1)
  )[0];
  if (!profile) return;
  await recordAudit(
    db,
    { id: profile.id, tenantId: profile.tenantId, role: profile.role, name: profile.displayName },
    { action: "login", targetType: "user", targetId: profile.id, ip, metadata: { provider } },
  );
}
