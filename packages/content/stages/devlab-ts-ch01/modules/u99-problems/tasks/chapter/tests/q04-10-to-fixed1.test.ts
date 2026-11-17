// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { toFixed1 } from "../src/q04-10-to-fixed1";
test("問10 toFixed1", () => {
  expect(toFixed1(3.14159)).toBe("3.1");
  expect(toFixed1(2)).toBe("2.0");
  expectTypeOf(toFixed1).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(toFixed1).returns.toEqualTypeOf<string>();
});
