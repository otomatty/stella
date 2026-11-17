// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { rootCause } from "../src/q04-14-root-cause";
test("問14 rootCause", () => {
  const a = new Error("a");
  const b = new Error("b", { cause: a });
  const c = new Error("c", { cause: b });
  expect(rootCause(c)).toBe(a);
  expect(rootCause(a)).toBe(a);
  expect(rootCause(new Error("x", { cause: "文字列" }))).toBe("文字列");
  expect(rootCause(1)).toBe(1);
  expectTypeOf(rootCause).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(rootCause).returns.toEqualTypeOf<unknown>();
});
