// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeCycler } from "../src/q08-14-make-cycler";
test("問14 makeCycler", () => {
  const next = makeCycler(["a", "b"]);
  expect(next()).toBe("a");
  expect(next()).toBe("b");
  expect(next()).toBe("a");
  expect(() => makeCycler([])).toThrow(Error);
  expectTypeOf(makeCycler).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(makeCycler).returns.toEqualTypeOf<() => string>();
});
