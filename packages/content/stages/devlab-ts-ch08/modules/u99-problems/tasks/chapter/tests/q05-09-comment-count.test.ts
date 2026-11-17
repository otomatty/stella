// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { commentCount } from "../src/q05-09-comment-count";
test("問9 commentCount", async () => {
  await expect(commentCount(10)).resolves.toBe(2);
  await expect(commentCount(11)).resolves.toBe(0);
  expectTypeOf(commentCount).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(commentCount).returns.toEqualTypeOf<Promise<number>>();
});
