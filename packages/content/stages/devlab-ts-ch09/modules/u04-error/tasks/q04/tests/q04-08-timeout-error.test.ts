// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { TimeoutError } from "../src/q04-08-timeout-error";
test("問8 TimeoutError", () => {
  const error = new TimeoutError(500);
  expect(error).toBeInstanceOf(Error);
  expect(error.ms).toBe(500);
  expect(error.message).toBe("500ミリ秒でタイムアウトしました");
  expect(error.name).toBe("TimeoutError");
  expectTypeOf(TimeoutError).constructorParameters.toEqualTypeOf<[number]>();
});
