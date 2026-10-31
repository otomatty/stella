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

  it("受講者の先頭はホーム = スキルツリー。ステージ一覧はツリーへ集約したので出さない", () => {
    expect(navForRole("learner")[0]).toMatchObject({ id: "dash", label: "スキルツリー" });
    expect(ids("learner")).not.toContain("stages");
    // staff のホームは各自のダッシュボードのまま (自分の星を持たない)。
    for (const role of ["instructor", "admin"] as const) {
      expect(navForRole(role)[0]?.label).not.toBe("スキルツリー");
    }
  });

  it("学習の記録は受講者だけに、現在のレッスンの直後に出す", () => {
    const items = ids("learner");
    expect(items.indexOf("records")).toBe(items.indexOf("lesson") + 1);
    for (const role of ["instructor", "admin"] as const) {
      expect(ids(role)).not.toContain("records");
    }
  });

  it("発見教材は staff (講師 / 管理者) に出す (Phase 4)", () => {
    // 管理者は課題管理の直後。
    const admin = ids("admin");
    expect(admin.indexOf("discovery")).toBe(admin.indexOf("assignments") + 1);
    // 下書きを読んで承認するのは講師の仕事なので、講師にも導線を出す (API も staff)。
    expect(ids("instructor")).toContain("discovery");
    // 受講者には出さない (レビュー前の下書きを開ける導線を作らない)。
    expect(ids("learner")).not.toContain("discovery");
  });

  it("レビュー (人に回した提出・AI の合格の確認) は講師と管理者に出す (#34)", () => {
    expect(ids("instructor")).toContain("review-queue");
    // 管理者は発見教材の直後 (課題管理 → 発見教材 の並びは崩さない)。
    for (const profileRole of ["admin", "platform_admin"] as const) {
      const admin = ids("admin", profileRole);
      expect(admin.indexOf("review-queue")).toBe(admin.indexOf("discovery") + 1);
    }
    expect(ids("learner")).not.toContain("review-queue");
  });

  it("専用教材は講師と管理者だけに出す", () => {
    expect(ids("instructor")).toContain("stage-grants");
    expect(ids("admin")).toContain("stage-grants");
    expect(ids("learner")).not.toContain("stage-grants");
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

  it("面談対策 (廃止) はどのロールにも出さない", () => {
    for (const role of ["learner", "instructor", "admin"] as const) {
      expect(ids(role) as string[]).not.toContain("interview-prep");
    }
  });
});
