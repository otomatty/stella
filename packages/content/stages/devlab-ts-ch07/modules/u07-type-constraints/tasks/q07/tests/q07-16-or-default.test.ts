// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { orDefault } from "../src/q07-16-or-default";
test("問16 orDefault", () => {
  const nums: number[] = [5];
  expect(orDefault(undefined, 5)).toBe(5);
  expect(orDefault("a", "b")).toBe("a");
  expectTypeOf(orDefault(undefined, nums.length)).toEqualTypeOf<number>();
  const call = () => {
    // @ts-expect-error orDefault に真偽値は渡せない
    orDefault(undefined, true);
  };
  expect(typeof call).toBe("function");
});
