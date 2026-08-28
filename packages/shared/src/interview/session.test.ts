import { describe, expect, it } from "vitest";

import { formatElapsed, parseTimeLimitSec, timerTone } from "./session";

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

describe("formatElapsed", () => {
  it("mm:ss で整形する", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9)).toBe("0:09");
    expect(formatElapsed(75)).toBe("1:15");
    expect(formatElapsed(-3)).toBe("0:00");
  });
});
