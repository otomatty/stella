// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { greet } from "../src/q02-09-greet";
test("問9 greet", () => {
  expect(greet("山田", 9)).toBe("おはよう、山田さん");
  expect(greet("佐藤", 12)).toBe("こんにちは、佐藤さん");
  expectTypeOf(greet).parameters.toEqualTypeOf<[string, number]>();
  expectTypeOf(greet).returns.toEqualTypeOf<string>();
});
