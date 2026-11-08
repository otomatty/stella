// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { composeTwo } from "../src/q07-20-compose-two";
test("問20 composeTwo", () => {
  expect(
    composeTwo(
      (n) => n + 1,
      (n) => n * 10,
      2,
    ),
  ).toBe(30);
  expectTypeOf(composeTwo).parameters.toEqualTypeOf<
    [(n: number) => number, (n: number) => number, number]
  >();
  expectTypeOf(composeTwo).returns.toEqualTypeOf<number>();
});
