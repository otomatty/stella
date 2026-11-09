// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeToggle } from "../src/q08-06-make-toggle";
test("問6 makeToggle", () => {
  const toggle = makeToggle(false);
  expect(toggle()).toBe(true);
  expect(toggle()).toBe(false);
  expectTypeOf(makeToggle).parameters.toEqualTypeOf<[boolean]>();
  expectTypeOf(makeToggle).returns.toEqualTypeOf<() => boolean>();
});
