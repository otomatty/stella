import { describe, expect, it } from "vitest";

import {
  daysUntilInterview,
  formatInterviewCountdown,
  formatLastPracticed,
  monitoringRisk,
  sortByInterviewDate,
  summarizeMonitoring,
  type MonitoringSummary,
} from "./monitoring";

const TODAY = "2026-09-10";

function row(over: Partial<MonitoringSummary> = {}): MonitoringSummary {
  return { interviewDate: null, prepPercent: 0, lastPracticedAt: null, ...over };
}

describe("daysUntilInterview", () => {
  it("当日は 0、 先は正、 過ぎていれば負", () => {
    expect(daysUntilInterview("2026-09-10", TODAY)).toBe(0);
    expect(daysUntilInterview("2026-09-13", TODAY)).toBe(3);
    expect(daysUntilInterview("2026-09-08", TODAY)).toBe(-2);
  });

  it("月またぎでも日数で数える", () => {
    expect(daysUntilInterview("2026-10-01", "2026-09-28")).toBe(3);
  });

  it("未設定・不正値は null", () => {
    expect(daysUntilInterview(null, TODAY)).toBeNull();
    expect(daysUntilInterview("2026/09/13", TODAY)).toBeNull();
  });
});

describe("formatInterviewCountdown", () => {
  it("本日 / あと n 日 / n 日前", () => {
    expect(formatInterviewCountdown("2026-09-10", TODAY)).toBe("本日");
    expect(formatInterviewCountdown("2026-09-14", TODAY)).toBe("あと 4 日");
    expect(formatInterviewCountdown("2026-09-07", TODAY)).toBe("3 日前");
    expect(formatInterviewCountdown(null, TODAY)).toBeNull();
  });
});

describe("monitoringRisk", () => {
  it("面談が 7 日以内で準備率 60% 未満なら alert", () => {
    expect(monitoringRisk(row({ interviewDate: "2026-09-15", prepPercent: 59 }), TODAY)).toBe(
      "alert",
    );
    expect(monitoringRisk(row({ interviewDate: "2026-09-10", prepPercent: 0 }), TODAY)).toBe(
      "alert",
    );
  });

  it("準備率が足りていれば近くても alert にしない", () => {
    expect(monitoringRisk(row({ interviewDate: "2026-09-12", prepPercent: 85 }), TODAY)).toBe(
      "none",
    );
  });

  it("14 日以内で 80% 未満なら watch", () => {
    expect(monitoringRisk(row({ interviewDate: "2026-09-22", prepPercent: 70 }), TODAY)).toBe(
      "watch",
    );
    // 7 日以内でも 60% 以上なら watch どまり
    expect(monitoringRisk(row({ interviewDate: "2026-09-12", prepPercent: 65 }), TODAY)).toBe(
      "watch",
    );
  });

  it("面談日が未設定 / 過ぎている行は none (フォローの余地がない)", () => {
    expect(monitoringRisk(row({ prepPercent: 0 }), TODAY)).toBe("none");
    expect(monitoringRisk(row({ interviewDate: "2026-09-09", prepPercent: 0 }), TODAY)).toBe(
      "none",
    );
  });

  it("面談が遠ければ準備率が低くても none", () => {
    expect(monitoringRisk(row({ interviewDate: "2026-10-30", prepPercent: 0 }), TODAY)).toBe(
      "none",
    );
  });
});

describe("formatLastPracticed", () => {
  it("今日 / 昨日 / n 日前", () => {
    // アプリ基準 TZ (UTC+9) で 2026-09-10
    expect(formatLastPracticed("2026-09-10T03:00:00.000Z", TODAY)).toBe("今日");
    expect(formatLastPracticed("2026-09-09T03:00:00.000Z", TODAY)).toBe("昨日");
    expect(formatLastPracticed("2026-09-05T03:00:00.000Z", TODAY)).toBe("5 日前");
  });

  it("UTC 深夜は JST では翌日として数える", () => {
    // 2026-09-09T16:00Z = JST 2026-09-10 01:00 → 今日
    expect(formatLastPracticed("2026-09-09T16:00:00.000Z", TODAY)).toBe("今日");
  });

  it("未練習・不正値は 練習なし", () => {
    expect(formatLastPracticed(null, TODAY)).toBe("練習なし");
    expect(formatLastPracticed("not-a-date", TODAY)).toBe("練習なし");
  });
});

describe("sortByInterviewDate", () => {
  it("これからの面談を近い順に、 未設定は表示名順で末尾", () => {
    const sorted = sortByInterviewDate(
      [
        { display_name: "Z", interviewDate: null },
        { display_name: "C", interviewDate: "2026-09-20" },
        { display_name: "A", interviewDate: null },
        { display_name: "B", interviewDate: "2026-09-15" },
      ],
      TODAY,
    );
    expect(sorted.map((r) => r.display_name)).toEqual(["B", "C", "A", "Z"]);
  });

  it("済んだ面談はこれからの面談より後ろ (直近に終わったものが先)", () => {
    const sorted = sortByInterviewDate(
      [
        { display_name: "済んだ(古)", interviewDate: "2026-07-01" },
        { display_name: "明日", interviewDate: "2026-09-11" },
        { display_name: "済んだ(直近)", interviewDate: "2026-09-08" },
        { display_name: "未設定", interviewDate: null },
        { display_name: "本日", interviewDate: TODAY },
      ],
      TODAY,
    );
    expect(sorted.map((r) => r.display_name)).toEqual([
      "本日",
      "明日",
      "済んだ(直近)",
      "済んだ(古)",
      "未設定",
    ]);
  });

  it("同じ日付なら表示名順で安定させる", () => {
    const sorted = sortByInterviewDate(
      [
        { display_name: "B", interviewDate: "2026-09-15" },
        { display_name: "A", interviewDate: "2026-09-15" },
      ],
      TODAY,
    );
    expect(sorted.map((r) => r.display_name)).toEqual(["A", "B"]);
  });
});

describe("summarizeMonitoring", () => {
  it("今月のこれからの面談・練習なし・要フォローを数える", () => {
    const totals = summarizeMonitoring(
      [
        // 今月・これから・準備率が低い → upcoming + alert
        row({
          interviewDate: "2026-09-14",
          prepPercent: 20,
          lastPracticedAt: "2026-09-09T00:00:00.000Z",
        }),
        // 今月・これから・準備できている → upcoming のみ
        row({
          interviewDate: "2026-09-28",
          prepPercent: 90,
          lastPracticedAt: "2026-09-09T00:00:00.000Z",
        }),
        // 今月だが過ぎている → 数えない
        row({
          interviewDate: "2026-09-01",
          prepPercent: 10,
          lastPracticedAt: "2026-09-01T00:00:00.000Z",
        }),
        // 来月 → 今月には数えない。 練習なし
        row({ interviewDate: "2026-10-05", prepPercent: 0 }),
        // 面談日なし・練習なし
        row(),
      ],
      TODAY,
    );
    expect(totals).toEqual({
      total: 5,
      upcomingThisMonth: 2,
      neverPracticed: 2,
      alerts: 1,
    });
  });

  it("空の一覧でも 0 を返す", () => {
    expect(summarizeMonitoring([], TODAY)).toEqual({
      total: 0,
      upcomingThisMonth: 0,
      neverPracticed: 0,
      alerts: 0,
    });
  });
});
