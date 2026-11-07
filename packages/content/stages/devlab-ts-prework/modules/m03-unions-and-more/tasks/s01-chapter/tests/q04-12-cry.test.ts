// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { cry, type Animal } from "../src/q04-12-cry";
test("問12 cry", () => {
  expectTypeOf<Animal>().toEqualTypeOf<
    { kind: "dog"; name: string } | { kind: "cat"; name: string }
  >();
  expect(cry({ kind: "dog", name: "ポチ" })).toBe("ポチ: ワン");
  expect(cry({ kind: "cat", name: "ミケ" })).toBe("ミケ: ニャー");
  expectTypeOf(cry).parameters.toEqualTypeOf<[Animal]>();
  expectTypeOf(cry).returns.toEqualTypeOf<string>();
});
