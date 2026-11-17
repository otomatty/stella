// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { digitalRoot } from "../src/q04-14-digital-root";
test("問14 digitalRoot", () => {
  expect(digitalRoot(9875)).toBe(2);
  expect(digitalRoot(7)).toBe(7);
  expect(digitalRoot(10)).toBe(1);
  expectTypeOf(digitalRoot).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(digitalRoot).returns.toEqualTypeOf<number>();
});
