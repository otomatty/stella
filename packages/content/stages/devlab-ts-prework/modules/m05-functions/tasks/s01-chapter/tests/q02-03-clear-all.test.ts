// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { clearAll } from "../src/q02-03-clear-all";
test("問3 clearAll", () => {
  const items = ["a", "b"];
  clearAll(items);
  expect(items).toEqual([]);
  expectTypeOf(clearAll).parameters.toEqualTypeOf<[string[]]>();
  expectTypeOf(clearAll).returns.toBeVoid();
});
