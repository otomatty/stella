// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { commentTotal } from "../src/q05-18-comment-total";
test("問18 commentTotal", async () => {
  await expect(commentTotal(1)).resolves.toBe(3);
  await expect(commentTotal(2)).resolves.toBe(1);
  expectTypeOf(commentTotal).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(commentTotal).returns.toEqualTypeOf<Promise<number>>();
});
