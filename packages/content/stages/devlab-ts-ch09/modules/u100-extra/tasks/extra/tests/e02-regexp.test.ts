import { describe, expect, expectTypeOf, test } from "vitest";
import {
  type LogLine,
  camelToKebab,
  extractHashtags,
  isPostalCode,
  maskPhone,
  parseLogLine,
} from "../src/e02-regexp";

describe("isPostalCode", () => {
  test("123-4567 の形だけ", () => {
    expect(isPostalCode("123-4567")).toBe(true);
    expect(isPostalCode("1234567")).toBe(false);
    expect(isPostalCode("〒123-4567")).toBe(false);
    expect(isPostalCode("123-45678")).toBe(false);
    expect(isPostalCode("abc-defg")).toBe(false);
  });
});

describe("extractHashtags", () => {
  test("出てきた順", () => {
    expect(extractHashtags("今日は #TypeScript と #型 の勉強")).toEqual(["TypeScript", "型"]);
    expect(extractHashtags("#a#b c")).toEqual(["a", "b"]);
    expect(extractHashtags("タグなし")).toEqual([]);
  });

  test("型", () => {
    expectTypeOf(extractHashtags).returns.toEqualTypeOf<string[]>();
  });
});

describe("maskPhone", () => {
  test("真ん中を隠す", () => {
    expect(maskPhone("連絡先: 090-1234-5678")).toBe("連絡先: 090-****-5678");
    expect(maskPhone("080-1111-2222 と 070-3333-4444")).toBe("080-****-2222 と 070-****-4444");
    expect(maskPhone("03-1234-5678")).toBe("03-1234-5678");
  });
});

describe("parseLogLine", () => {
  test("読める行", () => {
    expect(parseLogLine("[ERROR] 2026-04-01 09:00:00 接続できません")).toEqual({
      level: "ERROR",
      time: "2026-04-01 09:00:00",
      message: "接続できません",
    });
    expect(parseLogLine("[INFO] 2026-04-01 09:00:01 開始 します")?.message).toBe("開始 します");
  });

  test("形が違えば null", () => {
    expect(parseLogLine("[DEBUG] 2026-04-01 09:00:00 x")).toBeNull();
    expect(parseLogLine("ERROR 2026-04-01 09:00:00 x")).toBeNull();
    expect(parseLogLine("[WARN] 2026/04/01 09:00:00 x")).toBeNull();
  });

  test("型", () => {
    expectTypeOf(parseLogLine).returns.toEqualTypeOf<LogLine | null>();
  });
});

describe("camelToKebab", () => {
  test("大文字の前に - を入れる", () => {
    expect(camelToKebab("userName")).toBe("user-name");
    expect(camelToKebab("getHTTPStatus")).toBe("get-h-t-t-p-status");
    expect(camelToKebab("id")).toBe("id");
  });
});
