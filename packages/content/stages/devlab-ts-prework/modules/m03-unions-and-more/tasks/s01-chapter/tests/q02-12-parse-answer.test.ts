// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parseAnswer, type Answer } from "../src/q02-12-parse-answer";
test("問12 parseAnswer", () => {
  expectTypeOf<Answer>().toEqualTypeOf<"yes" | "no" | "maybe">();
  expect(parseAnswer("YES")).toBe("yes");
  expect(parseAnswer("maybe")).toBe("maybe");
  expect(parseAnswer("ok")).toBeUndefined();
  expectTypeOf(parseAnswer).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parseAnswer).returns.toEqualTypeOf<Answer | undefined>();
});
