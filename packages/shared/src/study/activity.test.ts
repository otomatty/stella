import { describe, expect, it } from "vitest";

import {
  addStudyDays,
  buildStudySeries,
  computeStreaks,
  msUntilNextStudyDay,
  studyDateStartMs,
  studyDateWeekday,
  toStudyDate,
  type StudyActivityDay,
} from "./activity.js";

function day(date: string, watched_sec = 60, completed_lessons = 0): StudyActivityDay {
  return { date, watched_sec, completed_lessons };
}

describe("toStudyDate", () => {
  it("JST (UTC+9) で日付を切る", () => {
    // 2026-08-07T14:59Z = 2026-08-07 23:59 JST → まだ 8/7
    expect(toStudyDate(new Date("2026-08-07T14:59:00Z"))).toBe("2026-08-07");
    // 2026-08-07T15:00Z = 2026-08-08 00:00 JST → 8/8
    expect(toStudyDate(new Date("2026-08-07T15:00:00Z"))).toBe("2026-08-08");
  });

  it("UTC 午前中でも前日に落ちない (JST では同日)", () => {
    expect(toStudyDate(new Date("2026-08-07T00:30:00Z"))).toBe("2026-08-07");
  });

  it("ミリ秒でも Date でも同じ結果になる", () => {
    const at = new Date("2026-01-01T12:00:00Z");
    expect(toStudyDate(at.getTime())).toBe(toStudyDate(at));
  });
});

describe("addStudyDays", () => {
  it("月をまたいで加減できる", () => {
    expect(addStudyDays("2026-08-01", -1)).toBe("2026-07-31");
    expect(addStudyDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("うるう日をまたげる", () => {
    expect(addStudyDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addStudyDays("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("不正な日付はそのまま返す", () => {
    expect(addStudyDays("not-a-date", 1)).toBe("not-a-date");
  });
});

describe("studyDateWeekday", () => {
  it("曜日を 0=日曜 で返す", () => {
    expect(studyDateWeekday("2026-08-07")).toBe(5); // 金曜
    expect(studyDateWeekday("2026-08-09")).toBe(0); // 日曜
  });
});

describe("buildStudySeries", () => {
  it("末尾が endDate の昇順・指定日数の系列になる", () => {
    const series = buildStudySeries([], "2026-08-07", 3);
    expect(series.map((d) => d.date)).toEqual(["2026-08-05", "2026-08-06", "2026-08-07"]);
  });

  it("欠損日を 0 で埋める", () => {
    const series = buildStudySeries([day("2026-08-06", 120, 1)], "2026-08-07", 3);
    expect(series).toEqual([
      { date: "2026-08-05", watched_sec: 0, completed_lessons: 0 },
      { date: "2026-08-06", watched_sec: 120, completed_lessons: 1 },
      { date: "2026-08-07", watched_sec: 0, completed_lessons: 0 },
    ]);
  });

  it("範囲外の行は無視し、 同日の重複行は加算する", () => {
    const series = buildStudySeries(
      [day("2026-07-01", 999, 9), day("2026-08-07", 30, 1), day("2026-08-07", 20, 2)],
      "2026-08-07",
      2,
    );
    expect(series).toEqual([
      { date: "2026-08-06", watched_sec: 0, completed_lessons: 0 },
      { date: "2026-08-07", watched_sec: 50, completed_lessons: 3 },
    ]);
  });
});

describe("computeStreaks", () => {
  it("記録が無ければ 0", () => {
    expect(computeStreaks([], "2026-08-07")).toEqual({ current: 0, longest: 0 });
  });

  it("今日を含む連続日数を数える", () => {
    const rows = [day("2026-08-05"), day("2026-08-06"), day("2026-08-07")];
    expect(computeStreaks(rows, "2026-08-07")).toEqual({ current: 3, longest: 3 });
  });

  it("今日がまだ空でも前日まで続いていれば継続とみなす", () => {
    const rows = [day("2026-08-05"), day("2026-08-06")];
    expect(computeStreaks(rows, "2026-08-07").current).toBe(2);
  });

  it("前日も空なら current は 0 (longest は残る)", () => {
    const rows = [day("2026-08-01"), day("2026-08-02"), day("2026-08-03")];
    expect(computeStreaks(rows, "2026-08-07")).toEqual({ current: 0, longest: 3 });
  });

  it("学習量 0 の日は連続を切る", () => {
    const rows = [day("2026-08-05"), day("2026-08-06", 0, 0), day("2026-08-07")];
    expect(computeStreaks(rows, "2026-08-07")).toEqual({ current: 1, longest: 1 });
  });

  it("視聴秒数 0 でもレッスン完了があればカウントする", () => {
    const rows = [day("2026-08-06", 0, 1), day("2026-08-07", 0, 2)];
    expect(computeStreaks(rows, "2026-08-07").current).toBe(2);
  });

  it("最長の連続区間を longest に返す", () => {
    const rows = [
      day("2026-07-01"),
      day("2026-07-02"),
      day("2026-07-03"),
      day("2026-07-04"),
      day("2026-08-06"),
      day("2026-08-07"),
    ];
    expect(computeStreaks(rows, "2026-08-07")).toEqual({ current: 2, longest: 4 });
  });

  it("同日が複数行に分かれていても 1 日として数える", () => {
    const rows = [day("2026-08-07", 10), day("2026-08-07", 20), day("2026-08-06")];
    expect(computeStreaks(rows, "2026-08-07")).toEqual({ current: 2, longest: 2 });
  });
});

describe("studyDateStartMs", () => {
  it("studyDateStartMs は JST 0 時の UTC ミリ秒を返す", () => {
    // 2026-08-20 00:00 JST = 2026-08-19 15:00 UTC
    expect(studyDateStartMs("2026-08-20")).toBe(Date.UTC(2026, 7, 19, 15));
  });
});

describe("msUntilNextStudyDay", () => {
  it("日本時間の 00:00 までの残りを返す", () => {
    // 2026-09-10T03:00Z = JST 12:00 → 境界まで 12 時間
    expect(msUntilNextStudyDay(Date.parse("2026-09-10T03:00:00.000Z"))).toBe(12 * 3_600_000);
    // 2026-09-10T14:00Z = JST 23:00 → 境界まで 1 時間
    expect(msUntilNextStudyDay(Date.parse("2026-09-10T14:00:00.000Z"))).toBe(3_600_000);
  });

  it("境界ちょうどなら次の境界まで丸一日", () => {
    // 2026-09-09T15:00Z = JST 2026-09-10 00:00
    expect(msUntilNextStudyDay(Date.parse("2026-09-09T15:00:00.000Z"))).toBe(86_400_000);
  });

  it("待った先では日付が変わっている", () => {
    const at = Date.parse("2026-09-10T14:30:00.000Z");
    expect(toStudyDate(at)).toBe("2026-09-10");
    expect(toStudyDate(at + msUntilNextStudyDay(at))).toBe("2026-09-11");
  });
});
