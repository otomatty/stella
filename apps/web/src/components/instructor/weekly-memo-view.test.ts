import { describe, expect, it } from "vitest";
import { memosForWeek, weeklyMemoIntro } from "./weekly-memo-view";

const data = { week: "2026-10-05", memos: [{ id: "a" }] };

describe("memosForWeek", () => {
  it("表示中の週の結果だけを返す", () => {
    expect(memosForWeek(data, "2026-10-05")).toEqual([{ id: "a" }]);
    // 既定の週 (週を選んでいない) はサーバーが決めた週の結果を使う。
    expect(memosForWeek(data, null)).toEqual([{ id: "a" }]);
  });

  it("週を切り替えて取得している間は、前の週のメモを出さない (操作させない)", () => {
    expect(memosForWeek(data, "2026-09-28")).toBeNull();
    expect(memosForWeek(null, "2026-10-05")).toBeNull();
  });
});

describe("weeklyMemoIntro", () => {
  it("講師には担当の受講者、管理者にはテナントの受講者のメモだと書く (API が返す範囲と同じ)", () => {
    expect(weeklyMemoIntro("assigned").scope).toContain("担当している受講者");
    expect(weeklyMemoIntro("tenant").scope).toContain("担当講師のいる受講者");
    expect(weeklyMemoIntro("tenant").scope).not.toContain("担当している");
    expect(weeklyMemoIntro("tenant").empty).not.toBe(weeklyMemoIntro("assigned").empty);
  });
});
