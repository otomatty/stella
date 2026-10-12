import { describe, expect, it } from "vitest";
import { ApiError } from "./authz.js";
import {
  createVscodeLinkCode,
  hashVscodeLinkCode,
  INVALID_VSCODE_LINK,
  redeemVscodeLink,
  type VscodeLinkRow,
} from "./vscode-link.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

describe("createVscodeLinkCode", () => {
  it("returns 8 chars from the safe alphabet", () => {
    const code = createVscodeLinkCode();
    expect(code).toHaveLength(8);
    expect([...code].every((c) => ALPHABET.includes(c))).toBe(true);
  });

  it("does not emit I, O, 0, or 1", () => {
    for (let i = 0; i < 50; i++) {
      const code = createVscodeLinkCode();
      expect(code).not.toMatch(/[IO01]/);
    }
  });
});

describe("hashVscodeLinkCode", () => {
  it("is stable and hex-encoded sha-256", async () => {
    const a = await hashVscodeLinkCode("ABCD2345");
    const b = await hashVscodeLinkCode("ABCD2345");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different codes", async () => {
    const a = await hashVscodeLinkCode("ABCD2345");
    const b = await hashVscodeLinkCode("ABCD2346");
    expect(a).not.toBe(b);
  });
});

function liveRow(overrides: Partial<VscodeLinkRow> = {}): VscodeLinkRow {
  return {
    id: "link-1",
    userId: "user-1",
    usedAt: null,
    expiresAt: new Date("2026-08-14T12:10:00.000Z"),
    accessToken: "access.jwt.token",
    ...overrides,
  };
}

describe("redeemVscodeLink", () => {
  const now = new Date("2026-08-14T12:05:00.000Z");

  type Profile = { email: string | null; disabled: boolean } | null;
  const cases: Array<[string, () => Promise<Profile>, () => Promise<string | null>]> = [
    ["the profile is missing", async () => null, async () => "tok"],
    ["the email is missing", async () => ({ email: null, disabled: false }), async () => "tok"],
    [
      "the account is disabled",
      async () => ({ email: "a@example.com", disabled: true }),
      async () => "tok",
    ],
    [
      "no token can be issued",
      async () => ({ email: "a@example.com", disabled: false }),
      async () => null,
    ],
  ];
  it.each(cases)("does not consume when %s", async (_label, loadProfile, issueToken) => {
    let consumed = false;
    await expect(
      redeemVscodeLink({
        row: liveRow(),
        now,
        loadProfile,
        consume: async () => {
          consumed = true;
          return true;
        },
        issueToken,
      }),
    ).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: INVALID_VSCODE_LINK,
    });
    expect(consumed).toBe(false);
  });

  it("returns the same 401 for expired and already-used codes without consuming", async () => {
    for (const row of [
      liveRow({ expiresAt: new Date("2026-08-14T12:00:00.000Z") }),
      liveRow({ usedAt: new Date("2026-08-14T12:04:00.000Z") }),
      undefined,
    ]) {
      let consumed = false;
      let resolved = false;
      const err = await redeemVscodeLink({
        row,
        now,
        loadProfile: async () => {
          resolved = true;
          return { email: "a@example.com", disabled: false };
        },
        consume: async () => {
          consumed = true;
          return true;
        },
        issueToken: async () => "tok",
      }).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err).toMatchObject({ status: 401, message: INVALID_VSCODE_LINK });
      expect(consumed).toBe(false);
      expect(resolved).toBe(false);
    }
  });

  it("consumes and returns a token-shaped result on success", async () => {
    const usedAtWrites: Date[] = [];
    const result = await redeemVscodeLink({
      row: liveRow(),
      now,
      loadProfile: async (userId) => {
        expect(userId).toBe("user-1");
        return { email: "learner@example.com", disabled: false };
      },
      consume: async (id) => {
        expect(id).toBe("link-1");
        usedAtWrites.push(now);
        return true;
      },
      issueToken: async (row, email) => {
        expect(row.userId).toBe("user-1");
        expect(email).toBe("learner@example.com");
        return row.accessToken ?? null;
      },
    });
    expect(usedAtWrites).toEqual([now]);
    expect(result).toEqual({ access_token: "access.jwt.token", userId: "user-1" });
  });
});
