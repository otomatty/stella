// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { answerOf } from "../src/q07-10-answer-of";
test("問10 answerOf", () => {
  expect(answerOf(true)).toBe("yes");
  expect(answerOf(false)).toBe("no");
  expectTypeOf(answerOf).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(answerOf).returns.toEqualTypeOf<"yes" | "no">();
});
