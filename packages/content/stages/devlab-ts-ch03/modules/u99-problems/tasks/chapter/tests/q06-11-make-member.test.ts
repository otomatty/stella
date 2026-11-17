// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { makeMember, type Named, type Aged, type Identified } from "../src/q06-11-make-member";
test("問11 makeMember", () => {
  expect(makeMember("山田", 30, 1)).toEqual({ name: "山田", age: 30, id: 1 });
  expectTypeOf(makeMember).parameters.toEqualTypeOf<[string, number, number]>();
  expectTypeOf(makeMember).returns.toEqualTypeOf<Named & Aged & Identified>();
});
