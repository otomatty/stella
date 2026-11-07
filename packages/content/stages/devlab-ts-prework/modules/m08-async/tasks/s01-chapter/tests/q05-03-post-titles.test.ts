// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { postTitles } from "../src/q05-03-post-titles";
test("問3 postTitles", async () => {
  await expect(postTitles(2)).resolves.toEqual(["非同期処理のまとめ"]);
  expectTypeOf(postTitles).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(postTitles).returns.toEqualTypeOf<Promise<string[]>>();
});
