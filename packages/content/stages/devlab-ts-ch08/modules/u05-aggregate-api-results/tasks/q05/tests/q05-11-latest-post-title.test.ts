// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { latestPostTitle } from "../src/q05-11-latest-post-title";
test("問11 latestPostTitle", async () => {
  await expect(latestPostTitle(1)).resolves.toBe("ジェネリクスに挑戦");
  await expect(latestPostTitle(4)).resolves.toBeUndefined();
  expectTypeOf(latestPostTitle).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(latestPostTitle).returns.toEqualTypeOf<Promise<string | undefined>>();
});
