// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { portOf } from "../src/q06-18-port-of";
test("問18 portOf", () => {
  expect(portOf({ port: 8080 })).toBe(8080);
  expect(portOf({ port: "8080" })).toBe(3000);
  expect(portOf(null)).toBe(3000);
  expectTypeOf(portOf).parameters.toEqualTypeOf<[unknown]>();
  expectTypeOf(portOf).returns.toEqualTypeOf<number>();
});
