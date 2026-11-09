// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { firstAvailableName } from "../src/q05-19-first-available-name";
test("問19 firstAvailableName", async () => {
  await expect(firstAvailableName([9, 8, 2, 1])).resolves.toBe("佐藤");
  await expect(firstAvailableName([9])).resolves.toBeUndefined();
  expectTypeOf(firstAvailableName).returns.toEqualTypeOf<Promise<string | undefined>>();
});
