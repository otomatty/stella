// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { postCountsById } from "../src/q05-12-post-counts-by-id";
test("問12 postCountsById", async () => {
  await expect(postCountsById([1, 2, 3])).resolves.toEqual({ 1: 3, 2: 1 });
  expectTypeOf(postCountsById).returns.toEqualTypeOf<Promise<Record<number, number>>>();
});
