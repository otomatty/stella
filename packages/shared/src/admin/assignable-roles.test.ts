import { describe, expect, it } from "vitest";
import { isAssignableProfileRole, isProfileRole, validateInviteUsersRequest } from "./types.js";

describe("profile roles", () => {
  it("廃止したプラットフォーム管理者ロール (platform_admin) はロールとしても割当先としても認めない", () => {
    expect(isProfileRole("platform_admin")).toBe(false);
    expect(isAssignableProfileRole("platform_admin")).toBe(false);
    const result = validateInviteUsersRequest({
      invites: [{ email: "a@example.com", displayName: "A", role: "platform_admin" }],
    });
    expect(result.ok).toBe(false);
  });

  it("廃止した講師ロールはロールとしても割当先としても認めない", () => {
    expect(isProfileRole("instructor")).toBe(false);
    expect(isAssignableProfileRole("instructor")).toBe(false);
    const result = validateInviteUsersRequest({
      invites: [{ email: "t@example.com", displayName: "T", role: "instructor" }],
    });
    expect(result.ok).toBe(false);
  });

  it("廃止した営業ロール (sales) はロールとしても割当先としても認めない", () => {
    expect(isProfileRole("sales")).toBe(false);
    expect(isAssignableProfileRole("sales")).toBe(false);
    const result = validateInviteUsersRequest({
      invites: [{ email: "s@example.com", displayName: "S", role: "sales" }],
    });
    expect(result.ok).toBe(false);
  });
});
