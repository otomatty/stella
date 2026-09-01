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

  // 組織マスタの挿入位置 (ユーザー管理の直後 = 面談対策より後ろ) がずれても
  // 面談対策が成績台帳の隣に残ることを、 admin の両 profileRole で見る。
  it.each(["admin", "platform_admin"] as const)(
    "面談対策は admin (%s) にも出す (質問音声タブは admin 専用のため導線が必要)",
    (profileRole) => {
      const items = ids("admin", profileRole);
      expect(items).toContain("interview-prep");
      expect(items.indexOf("interview-prep")).toBe(items.indexOf("gradebook") + 1);
    },
  );

  it("スキルツリーは受講者だけに、ステージ一覧の直後に出す", () => {
    const items = ids("learner");
    expect(items.indexOf("skill-tree")).toBe(items.indexOf("stages") + 1);
    // staff には出さない (自分の星を持たないので、見ても空のツリーになる)。
    for (const role of ["instructor", "admin", "sales"] as const) {
      expect(ids(role)).not.toContain("skill-tree");
    }
  });

  it("発見教材は staff (講師 / 管理者) に出す (Phase 4)", () => {
    // 管理者は課題管理の直後。
    const admin = ids("admin");
    expect(admin.indexOf("discovery")).toBe(admin.indexOf("assignments") + 1);
    // 下書きを読んで承認するのは講師の仕事なので、講師にも導線を出す (API も staff)。
    expect(ids("instructor")).toContain("discovery");
    // 受講者・営業には出さない (レビュー前の下書きを開ける導線を作らない)。
    for (const role of ["learner", "sales"] as const) {
      expect(ids(role)).not.toContain("discovery");
    }
  });

  it("専用教材は講師と管理者だけに出す", () => {
    expect(ids("instructor")).toContain("stage-grants");
    expect(ids("admin")).toContain("stage-grants");
    for (const role of ["learner", "sales"] as const) {
      expect(ids(role)).not.toContain("stage-grants");
    }
  });

  it("殿堂は受講者と staff の一覧の最後に出す (Phase 5)", () => {
    // 毎日の学習動線に割り込ませない = 常に最後尾。
    for (const role of ["learner", "instructor"] as const) {
      expect(ids(role).at(-1)).toBe("hall-of-fame");
    }
    // 管理者のナビだけは運用画面 (推薦 / 公開) を指す。
    expect(ids("admin").at(-1)).toBe("hall-of-fame-admin");
    expect(ids("admin", "platform_admin").at(-1)).toBe("hall-of-fame-admin");
    // 受講者・講師には運用画面の導線を出さない。
    for (const role of ["learner", "instructor"] as const) {
      expect(ids(role)).not.toContain("hall-of-fame-admin");
    }
  });

  it("営業はダッシュボードと面談対策だけを出す", () => {
    expect(ids("sales", "sales")).toEqual(["dash", "interview-prep"]);
  });
});
