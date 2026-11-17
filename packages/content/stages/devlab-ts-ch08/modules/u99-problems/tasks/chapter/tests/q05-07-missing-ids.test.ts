// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { missingIds } from "../src/q05-07-missing-ids";
test("問7 missingIds", async () => {
  await expect(missingIds([1, 9, 2, 8])).resolves.toEqual([9, 8]);
  await expect(missingIds([1])).resolves.toEqual([]);
  expectTypeOf(missingIds).returns.toEqualTypeOf<Promise<number[]>>();
});
