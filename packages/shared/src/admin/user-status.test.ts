import { describe, expect, it } from "vitest";
import { deriveUserStatus, userStatusLabel, userStatusNeedsFollowUp } from "./user-status.js";

const base = {
  role: "student",
  today: "2026-11-28",
  registeredDate: "2026-11-14",
  lastStudyDate: null,
  hasActiveEnrollment: false,
  level: 1,
  stumbleSignals: [],
  pendingReviews: 0,
} as const;

describe("deriveUserStatus", () => {
  it("受講中の未学習が7日になると、つまずきと確認待ちに優先する", () => {
    const input = {
      ...base,
      hasActiveEnrollment: true,
      stumbleSignals: ["idle"],
      pendingReviews: 2,
    };
    expect(deriveUserStatus({ ...input, lastStudyDate: "2026-11-22" })).toEqual({
      kind: "stumble",
    });
    expect(deriveUserStatus({ ...input, lastStudyDate: "2026-11-21" })).toEqual({
      kind: "idle",
      days: 7,
    });
    expect(deriveUserStatus({ ...input, registeredDate: "2026-11-21" })).toEqual({
      kind: "idle",
      days: 7,
    });
    expect(deriveUserStatus({ ...input, role: "admin" })).toEqual({ kind: "stumble" });
  });

  it("確認待ち、新規、管理者、順調の順に判定する", () => {
    expect(deriveUserStatus({ ...base, pendingReviews: 2 })).toEqual({
      kind: "pending_review",
      count: 2,
    });
    expect(deriveUserStatus({ ...base, role: "admin" })).toEqual({ kind: "new" });
    expect(deriveUserStatus({ ...base, registeredDate: "2026-11-13" })).toEqual({ kind: "ok" });
    expect(deriveUserStatus({ ...base, role: "admin", level: 2 })).toEqual({ kind: "admin" });
    expect(deriveUserStatus({ ...base, level: 2 })).toEqual({ kind: "ok" });
  });

  it("短い表示と要フォローを返す", () => {
    expect(userStatusLabel({ kind: "idle", days: 9 })).toBe("9日 学習なし");
    expect(userStatusLabel({ kind: "stumble" })).toBe("つまずき");
    expect(userStatusLabel({ kind: "pending_review", count: 2 })).toBe("確認待ち 2件");
    expect(userStatusLabel({ kind: "new" })).toBe("はじめたばかり");
    expect(userStatusLabel({ kind: "admin" })).toBe("管理者");
    expect(userStatusLabel({ kind: "ok" })).toBe("順調");
    expect(userStatusNeedsFollowUp({ kind: "idle", days: 9 })).toBe(true);
    expect(userStatusNeedsFollowUp({ kind: "stumble" })).toBe(true);
    expect(userStatusNeedsFollowUp({ kind: "pending_review", count: 2 })).toBe(false);
  });
});
