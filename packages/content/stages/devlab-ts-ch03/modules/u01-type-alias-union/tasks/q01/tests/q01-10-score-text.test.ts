// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { scoreText, type Score } from "../src/q01-10-score-text";
test("問10 scoreText", () => {
  expectTypeOf<Score>().toEqualTypeOf<number | "欠席">();
  expect(scoreText(80)).toBe("80点");
  expect(scoreText("欠席")).toBe("欠席");
  expectTypeOf(scoreText).parameters.toEqualTypeOf<[Score]>();
  expectTypeOf(scoreText).returns.toEqualTypeOf<string>();
});
