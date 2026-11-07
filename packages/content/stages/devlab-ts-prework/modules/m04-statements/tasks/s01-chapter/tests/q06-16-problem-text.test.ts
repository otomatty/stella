// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { problemText } from "../src/q06-16-problem-text";
test("問16 problemText", () => {
  expect(problemText(new Error("失敗"))).toBe("失敗");
  expect(problemText("だめ")).toBe("だめ");
  expect(problemText(1)).toBe("エラー");
  expectTypeOf(problemText).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(problemText).returns.toEqualTypeOf<string>();
});
