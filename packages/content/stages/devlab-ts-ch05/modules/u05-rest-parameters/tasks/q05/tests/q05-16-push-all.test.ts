// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { pushAll } from "../src/q05-16-push-all";
test("問16 pushAll", () => {
  const target = [0];
  expect(pushAll(target, 1, 2)).toBe(3);
  expect(target).toEqual([0, 1, 2]);
  expectTypeOf(pushAll).parameters.toEqualTypeOf<[number[], ...number[]]>();
  expectTypeOf(pushAll).returns.toEqualTypeOf<number>();
});
