import { describe, expect, it } from "vitest";
import { navForRole } from "./sidebar-nav";

const ids = (
  role: Parameters<typeof navForRole>[0],
  profileRole?: Parameters<typeof navForRole>[1],
) => navForRole(role, profileRole).map((item) => item.id);

describe("navForRole", () => {
  it("組織マスタは platform_admin にだけ、 ユーザー管理の直後に出す", () => {
    const items = ids("admin", "platform_admin");
    expect(items).toContain("orgs");
    expect(items.indexOf("orgs")).toBe(items.indexOf("users") + 1);
  });

  it("テナント管理者 (admin) には組織マスタを出さない", () => {
    expect(ids("admin", "admin")).not.toContain("orgs");
    expect(ids("admin")).not.toContain("orgs");
  });

  it("受講者 / 講師には admin 専用の項目を出さない", () => {
    for (const role of ["learner", "instructor"] as const) {
      const items = ids(role, "platform_admin");
      expect(items).not.toContain("orgs");
      expect(items).not.toContain("users");
      expect(items).not.toContain("audit");
    }
  });
});
