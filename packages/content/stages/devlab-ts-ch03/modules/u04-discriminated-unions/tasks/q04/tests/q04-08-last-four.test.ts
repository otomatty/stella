// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastFour, type Payment } from "../src/q04-08-last-four";
test("問8 lastFour", () => {
  expect(lastFour({ method: "card", cardNumber: "4111111111111234" })).toBe("1234");
  expect(lastFour({ method: "cash" })).toBeUndefined();
  expectTypeOf(lastFour).parameters.toEqualTypeOf<[Payment]>();
  expectTypeOf(lastFour).returns.toEqualTypeOf<string | undefined>();
});
