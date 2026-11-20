// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { labeled } from "../src/q05-13-labeled";
test("問13 labeled", () => {
  expect(labeled("todo", "買い物", "掃除")).toBe("[todo] 買い物, 掃除");
  expect(labeled("todo")).toBe("[todo]");
  expectTypeOf(labeled).parameters.toEqualTypeOf<[string, ...string[]]>();
  expectTypeOf(labeled).returns.toEqualTypeOf<string>();
});
