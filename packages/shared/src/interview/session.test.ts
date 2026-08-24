import { describe, expect, it } from "vitest";

import {
  buildSessionTurns,
  formatElapsed,
  nextTurnIndex,
  parseTimeLimitSec,
  timerTone,
} from "./session";

describe("buildSessionTurns", () => {
  it("質問 → 深掘り の順で、 深掘りは質問部分とヒントに割る", () => {
    expect(
      buildSessionTurns({
        question: "経験年数は？",
        deep1: "具体的には？→数字を添える",
        deep2: null,
        deep3: "直近の実装は？",
      }),
    ).toEqual([
      { part: "question", ask: "経験年数は？", hint: null },
      { part: "deep1", ask: "具体的には？", hint: "数字を添える" },
      { part: "deep3", ask: "直近の実装は？", hint: null },
    ]);
  });

  it("深掘りが無ければ質問 1 ターンだけ", () => {
    expect(buildSessionTurns({ question: "Q" })).toHaveLength(1);
  });
});

describe("parseTimeLimitSec", () => {
  it("秒・分・レンジを解釈する (レンジは上限)", () => {
    expect(parseTimeLimitSec("30秒")).toBe(30);
    expect(parseTimeLimitSec("30〜45秒")).toBe(45);
    expect(parseTimeLimitSec("45〜60秒")).toBe(60);
    expect(parseTimeLimitSec("1分")).toBe(60);
    expect(parseTimeLimitSec("1分30秒")).toBe(90);
  });

  it("目安が無い・数値が読めないものは null", () => {
    expect(parseTimeLimitSec("（逆質問）")).toBeNull();
    expect(parseTimeLimitSec(null)).toBeNull();
    expect(parseTimeLimitSec("")).toBeNull();
  });
});

describe("timerTone", () => {
  it("目安の 80% で warn、 超過で over", () => {
    expect(timerTone(0, 30)).toBe("normal");
    expect(timerTone(23, 30)).toBe("normal");
    expect(timerTone(24, 30)).toBe("warn");
    expect(timerTone(30, 30)).toBe("over");
    expect(timerTone(45, 30)).toBe("over");
  });

  it("目安が無ければ常に normal", () => {
    expect(timerTone(600, null)).toBe("normal");
    expect(timerTone(600, 0)).toBe("normal");
  });
});

describe("formatElapsed / nextTurnIndex", () => {
  it("mm:ss で整形する", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9)).toBe("0:09");
    expect(formatElapsed(75)).toBe("1:15");
    expect(formatElapsed(-3)).toBe("0:00");
  });

  it("最後のターンの次は null (振り返りへ)", () => {
    const turns = buildSessionTurns({ question: "Q", deep1: "D1" });
    expect(nextTurnIndex(turns, 0)).toBe(1);
    expect(nextTurnIndex(turns, 1)).toBeNull();
  });
});
