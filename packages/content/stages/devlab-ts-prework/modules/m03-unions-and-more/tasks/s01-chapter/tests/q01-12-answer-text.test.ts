// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { answerText, type Reply } from "../src/q01-12-answer-text";
test("問12 answerText", () => {
  expectTypeOf<Reply>().toEqualTypeOf<boolean | "未回答">();
  expect(answerText(true)).toBe("はい");
  expect(answerText(false)).toBe("いいえ");
  expect(answerText("未回答")).toBe("未回答");
  expectTypeOf(answerText).parameters.toEqualTypeOf<[Reply]>();
  expectTypeOf(answerText).returns.toEqualTypeOf<string>();
});
