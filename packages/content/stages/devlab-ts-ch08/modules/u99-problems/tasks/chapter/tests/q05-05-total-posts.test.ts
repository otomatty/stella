// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { totalPosts } from "../src/q05-05-total-posts";
test("問5 totalPosts", async () => {
  await expect(totalPosts([1, 2])).resolves.toBe(4);
  await expect(totalPosts([])).resolves.toBe(0);
  expectTypeOf(totalPosts).returns.toEqualTypeOf<Promise<number>>();
});
