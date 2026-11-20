// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { retry } from "../src/q07-19-retry";
test("問19 retry", () => {
  const attempts: number[] = [];
  expect(
    retry(3, (attempt) => {
      attempts.push(attempt);
      return attempt === 2;
    }),
  ).toBe(true);
  expect(attempts).toEqual([1, 2]);
  expect(retry(3, () => false)).toBe(false);
  expectTypeOf(retry).parameters.toEqualTypeOf<[number, (attempt: number) => boolean]>();
  expectTypeOf(retry).returns.toEqualTypeOf<boolean>();
});
