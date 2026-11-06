import { describe, expect, it } from "vitest";
import { navForRole } from "./sidebar-nav";

const ids = (role: Parameters<typeof navForRole>[0]) => navForRole(role).map((item) => item.id);

describe("navForRole", () => {
  it("受講者 / 講師には admin 専用の項目を出さない", () => {
    for (const role of ["learner", "instructor"] as const) {
      const items = ids(role);
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

  it("発見教材は staff (講師 / 管理者) に出す (Phase 4)", () => {
    // 管理者は KPI → ステージ管理 → 発見教材の順。
    const admin = ids("admin");
    expect(admin.slice(0, 3)).toEqual(["dash", "stages", "discovery"]);
    // 下書きを読んで承認するのは講師の仕事なので、講師にも導線を出す (API も staff)。
    expect(ids("instructor")).toContain("discovery");
    // 受講者には出さない (レビュー前の下書きを開ける導線を作らない)。
    expect(ids("learner")).not.toContain("discovery");
  });

  it("レビュー (人に回した提出・AI の合格の確認) は講師と管理者に出す (#34)", () => {
    expect(ids("instructor")).toContain("review-queue");
    // 管理者は発見教材の直後。
    const admin = ids("admin");
    expect(admin.indexOf("review-queue")).toBe(admin.indexOf("discovery") + 1);
    expect(ids("learner")).not.toContain("review-queue");
  });

  it("Extra の割当はステージの画面にまとめたので、別ナビは出さない", () => {
    for (const role of ["learner", "instructor", "admin"] as const) {
      expect(ids(role)).not.toContain("stage-grants");
    }
    expect(navForRole("instructor").find((item) => item.id === "stages")?.label).toBe("ステージ");
    expect(navForRole("admin").find((item) => item.id === "stages")?.label).toBe("ステージ管理");
  });

  it("本棚は受講者にだけ出す (staff は受講者画面に切り替えて使う)", () => {
    expect(ids("learner")).toContain("library");
    expect(ids("instructor")).not.toContain("library");
    expect(ids("admin")).not.toContain("library");
  });

  it("廃止した画面はどのロールにも出さない", () => {
    for (const role of ["learner", "instructor", "admin"] as const) {
      for (const retired of [
        "assignments",
        "records",
        "interview-prep",
        "hall-of-fame",
        "hall-of-fame-admin",
        "orgs",
      ]) {
        expect(ids(role) as string[]).not.toContain(retired);
      }
    }
  });
});
