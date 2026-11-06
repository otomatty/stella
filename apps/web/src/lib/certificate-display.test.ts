import { describe, expect, it } from "vitest";
import {
  achievementLabel,
  formatIssuedDateJa,
  qrPath,
  splitVerificationUrl,
} from "./certificate-display";

describe("formatIssuedDateJa", () => {
  it("日本語の日付にし、月日をゼロ埋めしない", () => {
    expect(formatIssuedDateJa("2026-10-28")).toBe("2026年10月28日");
    expect(formatIssuedDateJa("2026-01-02")).toBe("2026年1月2日");
  });
  it("UTC の日付境界を日本時間で扱う", () => {
    expect(formatIssuedDateJa("2026-10-27T15:00:00Z")).toBe("2026年10月28日");
    expect(formatIssuedDateJa("2026-10-27T14:59:59Z")).toBe("2026年10月27日");
    expect(formatIssuedDateJa("2026-10-28T01:00:00+09:00")).toBe("2026年10月28日");
  });
  it("不正な値はそのまま返す", () => {
    expect(formatIssuedDateJa("invalid")).toBe("invalid");
    expect(formatIssuedDateJa("")).toBe("");
  });
});

describe("achievementLabel", () => {
  it("存在する項目を所定の順でつなぎ、done を表示する", () => {
    expect(
      achievementLabel({
        assignments: { done: 6, total: 8 },
        quizzes: { done: 3, total: 4 },
        lessons: { done: 24, total: 30 },
      }),
    ).toBe("レッスン 24 件を完了・小テスト 3 件に合格・課題 6 件がレビューに合格");
  });
  it("一部の項目だけでも区切りを余分に付けない", () => {
    expect(achievementLabel({ quizzes: { done: 0, total: 3 } })).toBe("小テスト 0 件に合格");
    expect(
      achievementLabel({ lessons: { done: 24, total: 24 }, assignments: { done: 6, total: 6 } }),
    ).toBe("レッスン 24 件を完了・課題 6 件がレビューに合格");
  });
  it("項目がなければ null", () => {
    expect(achievementLabel(null)).toBeNull();
    expect(achievementLabel(undefined)).toBeNull();
    expect(achievementLabel({})).toBeNull();
  });
});

describe("splitVerificationUrl", () => {
  it("host と path を分ける", () => {
    expect(
      splitVerificationUrl("https://stella.saedgewell.workers.dev/verify/FLC-2026-4A9F-2E11"),
    ).toEqual({ host: "stella.saedgewell.workers.dev", path: "/verify/FLC-2026-4A9F-2E11" });
  });
  it("開発用ポート・クエリ・フラグメントを保持する", () => {
    expect(splitVerificationUrl("http://localhost:5173/verify/a%20b?q=1#code")).toEqual({
      host: "localhost:5173",
      path: "/verify/a%20b?q=1#code",
    });
  });
  it("URL として読めない値を保持する", () => {
    expect(splitVerificationUrl("/verify/example")).toEqual({ host: "", path: "/verify/example" });
    expect(splitVerificationUrl("")).toEqual({ host: "", path: "" });
  });
});

describe("qrPath", () => {
  it("空・すべて白の行列では path を作らない", () => {
    expect(qrPath([])).toBe("");
    expect(qrPath([[], [false, false]])).toBe("");
  });
  it("横の連続だけをまとめ、行ごとに描く", () => {
    expect(
      qrPath([
        [true, true, false, true],
        [true, false, true, true],
        [false, false, false, false],
      ]),
    ).toBe("M0 0h2v1h-2zM3 0h1v1h-1zM0 1h1v1h-1zM2 1h2v1h-2z");
  });
  it("行の末尾まで黒い場合も閉じる", () => {
    expect(qrPath([[true, true, true]])).toBe("M0 0h3v1h-3z");
  });
});
