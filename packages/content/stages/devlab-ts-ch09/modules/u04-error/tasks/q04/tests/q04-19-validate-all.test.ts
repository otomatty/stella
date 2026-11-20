// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { validateAll } from "../src/q04-19-validate-all";
test("問19 validateAll", () => {
  expect(() => {
    validateAll([1, 2, 0]);
  }).not.toThrow();
  let caught: unknown;
  try {
    validateAll([1, -2, 3, -4]);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  if (caught instanceof AggregateError) {
    expect(caught.message).toBe("負の数があります");
    const errors: readonly unknown[] = caught.errors;
    expect(errors.map((e) => (e instanceof RangeError ? e.message : ""))).toEqual([
      "-2 は負の数です",
      "-4 は負の数です",
    ]);
  }
  expectTypeOf(validateAll).parameters.toEqualTypeOf<[number[]]>();
  expectTypeOf(validateAll).returns.toBeVoid();
});
