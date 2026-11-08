// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { flipCoin, type Coin } from "../src/q02-11-flip-coin";
test("問11 flipCoin", () => {
  expectTypeOf<Coin>().toEqualTypeOf<"表" | "裏">();
  expect(flipCoin("表")).toBe("裏");
  expect(flipCoin("裏")).toBe("表");
  expectTypeOf(flipCoin).parameters.toEqualTypeOf<[Coin]>();
  expectTypeOf(flipCoin).returns.toEqualTypeOf<Coin>();
});
