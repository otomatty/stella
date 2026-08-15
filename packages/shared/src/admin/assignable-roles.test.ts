import { describe, expect, it } from "vitest";
import { isAssignableProfileRole, isProfileRole, validateInviteUsersRequest } from "./types.js";

describe("profile roles", () => {
  it("recognizes platform_admin as a profile role but not assignable", () => {
    expect(isProfileRole("platform_admin")).toBe(true);
    expect(isAssignableProfileRole("platform_admin")).toBe(false);
    expect(isAssignableProfileRole("admin")).toBe(true);
  });

  it("rejects platform_admin in invite validation", () => {
    const result = validateInviteUsersRequest({
      invites: [{ email: "a@example.com", displayName: "A", role: "platform_admin" }],
    });
    expect(result.ok).toBe(false);
  });
});
