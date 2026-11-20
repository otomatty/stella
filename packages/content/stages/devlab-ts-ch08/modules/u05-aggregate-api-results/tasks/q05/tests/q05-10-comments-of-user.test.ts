// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { commentsOfUser } from "../src/q05-10-comments-of-user";
test("問10 commentsOfUser", async () => {
  await expect(commentsOfUser(1)).resolves.toEqual(["いいですね", "参考になりました", "難しそう"]);
  await expect(commentsOfUser(4)).resolves.toEqual([]);
  expectTypeOf(commentsOfUser).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(commentsOfUser).returns.toEqualTypeOf<Promise<string[]>>();
});
