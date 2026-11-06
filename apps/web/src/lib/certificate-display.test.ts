import { describe, expect, it } from "vitest";
import {
  achievementLabel,
  achievementRows,
  achievementSummary,
  buildLinkedInAddUrl,
  findIssuedCertificate,
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

describe("achievementRows", () => {
  it("ある項目だけを所定の順で、done / total と単位にする", () => {
    expect(
      achievementRows({
        assignments: { done: 6, total: 6 },
        quizzes: { done: 3, total: 3 },
        lessons: { done: 24, total: 24 },
      }),
    ).toEqual([
      { label: "レッスン", value: "24 / 24 完了" },
      { label: "小テスト", value: "3 / 3 合格" },
      { label: "課題のレビュー", value: "6 / 6 合格" },
    ]);
  });
  it("無い項目は行にしない", () => {
    expect(
      achievementRows({ lessons: { done: 24, total: 24 }, assignments: { done: 6, total: 6 } }),
    ).toEqual([
      { label: "レッスン", value: "24 / 24 完了" },
      { label: "課題のレビュー", value: "6 / 6 合格" },
    ]);
    expect(achievementRows(null)).toEqual([]);
    expect(achievementRows(undefined)).toEqual([]);
    expect(achievementRows({})).toEqual([]);
  });
});

describe("achievementSummary", () => {
  it("行を中黒でつなぐ。項目が無ければ null", () => {
    expect(
      achievementSummary({
        lessons: { done: 24, total: 24 },
        assignments: { done: 6, total: 6 },
      }),
    ).toBe("レッスン 24 / 24 完了・課題のレビュー 6 / 6 合格");
    expect(achievementSummary(null)).toBeNull();
    expect(achievementSummary({})).toBeNull();
  });
});

describe("buildLinkedInAddUrl", () => {
  const base = {
    stageTitle: "HTML/CSSとデザイン基礎",
    certCode: "FLC-2026-4A9F-2E11",
    verifyUrl: "https://stella.example/verify/FLC-2026-4A9F-2E11",
    organizationName: "STELLA",
  };

  it("日本時間で月と年をまたぐ境目をゼロ埋めせず載せる", () => {
    const january = new URL(buildLinkedInAddUrl({ ...base, issuedAt: "2025-12-31T15:00:00.000Z" }));
    expect(january.searchParams.get("issueYear")).toBe("2026");
    expect(january.searchParams.get("issueMonth")).toBe("1");

    const december = new URL(
      buildLinkedInAddUrl({ ...base, issuedAt: "2025-12-31T14:59:59.000Z" }),
    );
    expect(december.searchParams.get("issueYear")).toBe("2025");
    expect(december.searchParams.get("issueMonth")).toBe("12");

    const october = new URL(
      buildLinkedInAddUrl({ ...base, issuedAt: "2026-10-28T00:00:00+09:00" }),
    );
    expect(october.searchParams.get("issueYear")).toBe("2026");
    expect(october.searchParams.get("issueMonth")).toBe("10");
  });

  it("名前と URL をエンコードし、パラメータの順を保つ", () => {
    const href = buildLinkedInAddUrl({
      stageTitle: "A&B 基礎",
      issuedAt: "2026-10-28T00:00:00+09:00",
      certCode: "FLC 1/2",
      verifyUrl: "https://stella.example/verify/FLC 1/2?x=1",
      organizationName: "STELLA",
    });
    expect(href.startsWith("https://www.linkedin.com/profile/add?")).toBe(true);
    const query = href.slice(href.indexOf("?") + 1);
    expect(query).toBe(
      "startTask=CERTIFICATION_NAME&name=A%26B+%E5%9F%BA%E7%A4%8E&organizationName=STELLA&issueYear=2026&issueMonth=10&certUrl=https%3A%2F%2Fstella.example%2Fverify%2FFLC+1%2F2%3Fx%3D1&certId=FLC+1%2F2",
    );
    const parsed = new URL(href);
    expect(parsed.searchParams.get("name")).toBe("A&B 基礎");
    expect(parsed.searchParams.get("organizationName")).toBe("STELLA");
    expect(parsed.searchParams.get("certUrl")).toBe("https://stella.example/verify/FLC 1/2?x=1");
    expect(parsed.searchParams.get("certId")).toBe("FLC 1/2");
  });

  it("発行日が読めないときは年月を付けない", () => {
    const parsed = new URL(
      buildLinkedInAddUrl({
        ...base,
        stageTitle: "基礎",
        issuedAt: "invalid",
        certCode: "X",
        verifyUrl: "https://example.test/verify/X",
      }),
    );
    expect(parsed.searchParams.get("issueYear")).toBeNull();
    expect(parsed.searchParams.get("issueMonth")).toBeNull();
    expect(parsed.searchParams.get("name")).toBe("基礎");
    expect(parsed.searchParams.get("certId")).toBe("X");
    expect(parsed.searchParams.get("startTask")).toBe("CERTIFICATION_NAME");
  });
});

describe("findIssuedCertificate", () => {
  const rows = [
    { id: "a", revoked: false, name: "A" },
    { id: "b", revoked: true, name: "B" },
  ];

  it("id が一致し取り消されていない行を返す", () => {
    expect(findIssuedCertificate(rows, "a")).toEqual(rows[0]);
  });

  it("取り消し済みと未知の id は見つからない", () => {
    expect(findIssuedCertificate(rows, "b")).toBeNull();
    expect(findIssuedCertificate(rows, "missing")).toBeNull();
    expect(findIssuedCertificate([], "a")).toBeNull();
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
