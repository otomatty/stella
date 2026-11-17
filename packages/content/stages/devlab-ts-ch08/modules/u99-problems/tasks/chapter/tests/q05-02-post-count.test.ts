// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { postCount } from "../src/q05-02-post-count";
test("問2 postCount", async () => {
  await expect(postCount(1)).resolves.toBe(3);
  await expect(postCount(4)).resolves.toBe(0);
  expectTypeOf(postCount).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(postCount).returns.toEqualTypeOf<Promise<number>>();
});
