// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeIdMaker } from "../src/q08-08-make-id-maker";
test("問8 makeIdMaker", () => {
  const nextId = makeIdMaker("u");
  expect(nextId()).toBe("u1");
  expect(nextId()).toBe("u2");
  expectTypeOf(makeIdMaker).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(makeIdMaker).returns.toEqualTypeOf<() => string>();
});
