// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { isAdultAdmin, type Member, type Named, type Aged } from "../src/q06-15-is-adult-admin";
test("問15 isAdultAdmin", () => {
  expectTypeOf<Member>().toEqualTypeOf<Named & Aged & { role: "admin" | "member" }>();
  expect(isAdultAdmin({ name: "山田", age: 30, role: "admin" })).toBe(true);
  expect(isAdultAdmin({ name: "佐藤", age: 30, role: "member" })).toBe(false);
  expect(isAdultAdmin({ name: "鈴木", age: 16, role: "admin" })).toBe(false);
  expectTypeOf(isAdultAdmin).parameters.toEqualTypeOf<[Member]>();
  expectTypeOf(isAdultAdmin).returns.toEqualTypeOf<boolean>();
});
