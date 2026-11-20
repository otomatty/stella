// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { withId, type Named, type Identified } from "../src/q06-03-with-id";
test("問3 withId", () => {
  expect(withId({ name: "山田" }, 3)).toEqual({ name: "山田", id: 3 });
  expectTypeOf(withId).parameters.toEqualTypeOf<[Named, number]>();
  expectTypeOf(withId).returns.toEqualTypeOf<Named & Identified>();
});
