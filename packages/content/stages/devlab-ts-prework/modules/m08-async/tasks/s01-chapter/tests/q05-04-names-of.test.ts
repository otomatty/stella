// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { namesOf } from "../src/q05-04-names-of";
test("問4 namesOf", async () => {
  await expect(namesOf([3, 1])).resolves.toEqual(["鈴木", "山田"]);
  await expect(namesOf([1, 9])).rejects.toThrow("ユーザー 9 はいません");
  expectTypeOf(namesOf).returns.toEqualTypeOf<Promise<string[]>>();
});
