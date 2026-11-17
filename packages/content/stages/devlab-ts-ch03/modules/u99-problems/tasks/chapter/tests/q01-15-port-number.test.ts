// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { portNumber, type Port } from "../src/q01-15-port-number";
test("問15 portNumber", () => {
  expectTypeOf<Port>().toEqualTypeOf<number | string>();
  expect(portNumber("8080")).toBe(8080);
  expect(portNumber(3000)).toBe(3000);
  expectTypeOf(portNumber).parameters.toEqualTypeOf<[Port]>();
  expectTypeOf(portNumber).returns.toEqualTypeOf<number>();
});
