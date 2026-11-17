// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { labelWithCount } from "../src/q02-15-label-with-count";
test("問15 labelWithCount", () => {
  expect(labelWithCount("メッセージ", 3)).toBe("メッセージ（3件）");
  expect(labelWithCount("通知", 0)).toBe("通知（0件）");
  expectTypeOf(labelWithCount).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(labelWithCount).returns.toEqualTypeOf<string>();
});
