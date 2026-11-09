// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { userSummary } from "../src/q05-08-user-summary";
test("問8 userSummary", async () => {
  await expect(userSummary(1)).resolves.toBe("山田（投稿 3件）");
  await expect(userSummary(4)).resolves.toBe("田中（投稿 0件）");
  expectTypeOf(userSummary).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(userSummary).returns.toEqualTypeOf<Promise<string>>();
});
