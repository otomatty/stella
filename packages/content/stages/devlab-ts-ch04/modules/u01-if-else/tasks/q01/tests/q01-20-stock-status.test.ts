// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { stockStatus } from "../src/q01-20-stock-status";
test("問20 stockStatus", () => {
  expect(stockStatus(0)).toBe("在庫なし");
  expect(stockStatus(5)).toBe("残りわずか");
  expect(stockStatus(6)).toBe("在庫あり");
  expectTypeOf(stockStatus).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(stockStatus).returns.toEqualTypeOf<"在庫あり" | "残りわずか" | "在庫なし">();
});
