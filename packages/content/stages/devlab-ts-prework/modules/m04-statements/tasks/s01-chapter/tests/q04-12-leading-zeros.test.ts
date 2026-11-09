// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { leadingZeros } from "../src/q04-12-leading-zeros";
test("問12 leadingZeros", () => {
  expect(leadingZeros("000120")).toBe(3);
  expect(leadingZeros("120")).toBe(0);
  expect(leadingZeros("000")).toBe(3);
  expectTypeOf(leadingZeros).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(leadingZeros).returns.toEqualTypeOf<number>();
});
