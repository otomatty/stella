// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { countLabel } from "../src/q08-17-count-label";
test("問17 countLabel", () => {
  expect(countLabel(3)).toBe("3件");
  expectTypeOf(countLabel).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(countLabel).returns.toEqualTypeOf<string>();
});
