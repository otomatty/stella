// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mostActive } from "../src/q05-15-most-active";
test("問15 mostActive", async () => {
  await expect(mostActive([2, 1, 4])).resolves.toBe("山田");
  await expect(mostActive([3, 2])).resolves.toBe("佐藤");
  await expect(mostActive([3])).resolves.toBeUndefined();
  expectTypeOf(mostActive).returns.toEqualTypeOf<Promise<string | undefined>>();
});
