import { describe, expect, it } from "vitest";
import { navForRole } from "./sidebar-nav";

const ids = (role: Parameters<typeof navForRole>[0]) => navForRole(role).map((item) => item.id);

describe("navForRole", () => {
  it("受講者には管理者専用の項目を出さない", () => {
    const items = ids("learner");
    expect(items).not.toContain("users");
    expect(items).not.toContain("audit");
  });

  it("受講者の先頭はホーム = スキルツリー。ステージ一覧はツリーへ集約したので出さない", () => {
    expect(navForRole("learner")[0]).toMatchObject({ id: "dash", label: "スキルツリー" });
    expect(ids("learner")).not.toContain("stages");
    expect(navForRole("admin")[0]).toMatchObject({ id: "dash", label: "ダッシュボード" });
  });

  it("発見教材は管理者に出す", () => {
    // 管理者はダッシュボード → ステージ管理 → 発見教材の順。
    const admin = ids("admin");
    expect(admin.slice(0, 3)).toEqual(["dash", "stages", "discovery"]);
    // 受講者には出さない (レビュー前の下書きを開ける導線を作らない)。
    expect(ids("learner")).not.toContain("discovery");
  });

  it("レビュー (人に回した提出・AI の合格の確認) は管理者に出す (#34)", () => {
    // 管理者は発見教材の直後。
    const admin = ids("admin");
    expect(admin.indexOf("review-queue")).toBe(admin.indexOf("discovery") + 1);
    expect(ids("learner")).not.toContain("review-queue");
  });

  it("Extra の割当はステージの画面にまとめたので、別ナビは出さない", () => {
    for (const role of ["learner", "admin"] as const) {
      expect(ids(role)).not.toContain("stage-grants");
    }
    expect(navForRole("admin").find((item) => item.id === "stages")?.label).toBe("ステージ管理");
  });

  it("本棚は受講者にだけ出す (管理者は受講者画面に切り替えて使う)", () => {
    expect(ids("learner")).toContain("library");
    expect(ids("admin")).not.toContain("library");
  });

  it("廃止した画面はどのロールにも出さない", () => {
    for (const role of ["learner", "admin"] as const) {
      for (const retired of [
        "assignments",
        "records",
        "interview-prep",
        "hall-of-fame",
        "hall-of-fame-admin",
        "orgs",
        "students",
      ]) {
        expect(ids(role) as string[]).not.toContain(retired);
      }
    }
  });
});
