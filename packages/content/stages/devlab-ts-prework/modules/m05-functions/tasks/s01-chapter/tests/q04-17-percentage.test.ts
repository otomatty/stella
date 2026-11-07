// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { percentage } from "../src/q04-17-percentage";
test("問17 percentage", () => {
  expect(percentage(25)).toBe(25);
  expect(percentage(25, 200)).toBe(13);
  expectTypeOf(percentage).parameters.toEqualTypeOf<[number, number?]>();
  expectTypeOf(percentage).returns.toEqualTypeOf<number>();
});
