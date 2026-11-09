// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { coinSide } from "../src/q07-03-coin-side";
test("問3 coinSide", () => {
  expect(coinSide(4)).toBe("表");
  expect(coinSide(3)).toBe("裏");
  expectTypeOf(coinSide).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(coinSide).returns.toEqualTypeOf<"表" | "裏">();
});
