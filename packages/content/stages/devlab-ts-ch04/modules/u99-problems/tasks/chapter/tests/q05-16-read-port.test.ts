// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { readPort } from "../src/q05-16-read-port";
test("問16 readPort", () => {
  expect(readPort('{"port":8080}')).toBe(8080);
  expect(() => readPort('{"port":"8080"}')).toThrow("port がありません");
  expect(() => readPort("{")).toThrow("port がありません");
  expectTypeOf(readPort).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(readPort).returns.toEqualTypeOf<number>();
});
