import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Env } from "../env.js";

const revokeClerkUser = vi.fn(async () => true);
const revokeAccessSessions = vi.fn(async () => true);
vi.mock("./clerk-auth.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./clerk-auth.js")>()),
  revokeClerkUser: (...args: unknown[]) => revokeClerkUser(...(args as [])),
}));
vi.mock("./security-cloudflare.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./security-cloudflare.js")>()),
  revokeAccessSessions: (...args: unknown[]) => revokeAccessSessions(...(args as [])),
}));

const { revokeUserSessions, sessionRevokeConfigured } = await import("./session-revoke.js");

beforeEach(() => {
  revokeClerkUser.mockClear();
  revokeAccessSessions.mockClear();
});

const clerkEnv = { CLERK_SECRET_KEY: "sk_test_x", ALLOWED_ORIGINS: "https://stella.example.com" };
const accessEnv = { CF_ACCESS_API_TOKEN: "cf", CLOUDFLARE_ACCOUNT_ID: "acct" };

describe("revokeUserSessions", () => {
  it("受講者は Clerk のセッションだけを失効する (Access は講師・管理者の入口だけ)", async () => {
    const env = { ...clerkEnv, ...accessEnv } as unknown as Env;
    expect(sessionRevokeConfigured(env)).toBe(true);
    expect(
      await revokeUserSessions(env, { email: "learner@example.test", role: "student" }),
    ).toEqual({ clerk: true, access: false });
    expect(revokeClerkUser).toHaveBeenCalledTimes(1);
    expect(revokeAccessSessions).not.toHaveBeenCalled();
  });

  it("講師・管理者・営業は Clerk と Access の両方を失効する", async () => {
    const env = { ...clerkEnv, ...accessEnv } as unknown as Env;
    for (const role of ["instructor", "admin", "sales"]) {
      expect(await revokeUserSessions(env, { email: "staff@example.test", role })).toEqual({
        clerk: true,
        access: true,
      });
    }
    expect(revokeAccessSessions).toHaveBeenCalledTimes(3);
  });

  it("設定の無い側は飛ばす", async () => {
    const none = { ALLOWED_ORIGINS: "https://stella.example.com" } as unknown as Env;
    expect(sessionRevokeConfigured(none)).toBe(false);
    expect(await revokeUserSessions(none, { email: "a@example.test", role: "admin" })).toEqual({
      clerk: false,
      access: false,
    });
    expect(revokeClerkUser).not.toHaveBeenCalled();
    expect(revokeAccessSessions).not.toHaveBeenCalled();
  });
});
