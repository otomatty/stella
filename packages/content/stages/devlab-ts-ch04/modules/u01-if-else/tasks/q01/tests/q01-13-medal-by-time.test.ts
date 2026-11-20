// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { medalByTime } from "../src/q01-13-medal-by-time";
test("問13 medalByTime", () => {
  expect(medalByTime(59)).toBe("金");
  expect(medalByTime(75)).toBe("銀");
  expect(medalByTime(119)).toBe("銅");
  expect(medalByTime(120)).toBe("参加賞");
  expectTypeOf(medalByTime).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(medalByTime).returns.toEqualTypeOf<"金" | "銀" | "銅" | "参加賞">();
});
