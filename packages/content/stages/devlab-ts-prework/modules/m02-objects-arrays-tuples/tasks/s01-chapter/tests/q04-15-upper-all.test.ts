// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { upperAll } from "../src/q04-15-upper-all";
test("問15 upperAll", () => {
  expect(upperAll(["a", "Bc"])).toEqual(["A", "BC"]);
  expectTypeOf(upperAll).parameters.toEqualTypeOf<[readonly string[]]>();
  expectTypeOf(upperAll).returns.toEqualTypeOf<string[]>();
});
