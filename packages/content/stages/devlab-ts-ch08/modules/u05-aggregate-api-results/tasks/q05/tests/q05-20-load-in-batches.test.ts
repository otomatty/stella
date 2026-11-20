// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { loadInBatches } from "../src/q05-20-load-in-batches";
test("問20 loadInBatches", async () => {
  await expect(loadInBatches([1, 2, 3, 4], 3)).resolves.toEqual(["山田", "佐藤", "鈴木", "田中"]);
  await expect(loadInBatches([4, 1], 1)).resolves.toEqual(["田中", "山田"]);
  await expect(loadInBatches([1], 0)).rejects.toThrow(Error);
  expectTypeOf(loadInBatches).returns.toEqualTypeOf<Promise<string[]>>();
});
