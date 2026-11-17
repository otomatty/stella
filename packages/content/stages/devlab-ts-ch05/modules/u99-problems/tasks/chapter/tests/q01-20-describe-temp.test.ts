// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { describeTemp } from "../src/q01-20-describe-temp";
test("問20 describeTemp", () => {
  expect(describeTemp(30)).toBe("夏日");
  expect(describeTemp(20)).toBe("普通");
  expectTypeOf(describeTemp).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(describeTemp).returns.toEqualTypeOf<"夏日" | "普通">();
});
