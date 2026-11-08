// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { judge } from "../src/q03-09-judge";
test("問9 judge", () => {
  expect(judge(60)).toBe("合格");
  expect(judge(59)).toBe("不合格");
  expectTypeOf(judge).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(judge).returns.toEqualTypeOf<"合格" | "不合格">();
});
