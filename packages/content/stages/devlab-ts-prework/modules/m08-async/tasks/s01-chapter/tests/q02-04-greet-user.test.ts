// このファイルは書き換えないでください
import { afterEach, expect, expectTypeOf, test, vi } from "vitest";
import { greetUser } from "../src/q02-04-greet-user";
afterEach(() => {
  vi.useRealTimers();
});

test("問4 greetUser", async () => {
  await expect(greetUser(3)).resolves.toBe("こんにちは、鈴木さん");
  expectTypeOf(greetUser).parameters.toEqualTypeOf<[number]>();
  expectTypeOf(greetUser).returns.toEqualTypeOf<Promise<string>>();
});
