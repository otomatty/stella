import { describe, expect, it } from "vitest";
import {
  canManageInterviewPrep,
  canPracticeInterviewPrep,
  isAssignableProfileRole,
  isProfileRole,
  validateInviteUsersRequest,
} from "./types.js";

describe("profile roles", () => {
  it("recognizes platform_admin as a profile role but not assignable", () => {
    expect(isProfileRole("platform_admin")).toBe(true);
    expect(isAssignableProfileRole("platform_admin")).toBe(false);
    expect(isAssignableProfileRole("admin")).toBe(true);
    expect(isAssignableProfileRole("sales")).toBe(true);
  });

  it("rejects platform_admin in invite validation", () => {
    const result = validateInviteUsersRequest({
      invites: [{ email: "a@example.com", displayName: "A", role: "platform_admin" }],
    });
    expect(result.ok).toBe(false);
  });

  it("allows interview-prep management for staff and sales, not students", () => {
    expect(canManageInterviewPrep("instructor")).toBe(true);
    expect(canManageInterviewPrep("admin")).toBe(true);
    expect(canManageInterviewPrep("platform_admin")).toBe(true);
    expect(canManageInterviewPrep("sales")).toBe(true);
    expect(canManageInterviewPrep("student")).toBe(false);
  });

  it("面談対策を受けられるのは受講者と管理者 (講師・営業は対象外)", () => {
    expect(canPracticeInterviewPrep("student")).toBe(true);
    expect(canPracticeInterviewPrep("admin")).toBe(true);
    expect(canPracticeInterviewPrep("platform_admin")).toBe(true);
    expect(canPracticeInterviewPrep("instructor")).toBe(false);
    expect(canPracticeInterviewPrep("sales")).toBe(false);
  });
});
