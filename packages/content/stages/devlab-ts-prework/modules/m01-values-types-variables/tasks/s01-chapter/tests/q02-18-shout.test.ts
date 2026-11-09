// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { shout } from "../src/q02-18-shout";
test("問18 shout", () => {
  expect(shout("hello")).toBe("HELLO!");
  expect(shout("Agora")).toBe("AGORA!");
  expectTypeOf(shout).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(shout).returns.toEqualTypeOf<string>();
});
