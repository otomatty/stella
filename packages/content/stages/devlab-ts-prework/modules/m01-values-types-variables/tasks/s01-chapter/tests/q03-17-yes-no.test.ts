// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { yesNo } from "../src/q03-17-yes-no";
test("問17 yesNo", () => {
  expect(yesNo(true)).toBe("はい");
  expect(yesNo(false)).toBe("いいえ");
  expectTypeOf(yesNo).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(yesNo).returns.toEqualTypeOf<"はい" | "いいえ">();
});
