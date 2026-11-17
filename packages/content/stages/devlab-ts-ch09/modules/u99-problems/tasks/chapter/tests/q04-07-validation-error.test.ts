// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { ValidationError } from "../src/q04-07-validation-error";
test("問7 ValidationError", () => {
  const error = new ValidationError("email", "形が違います");
  expect(error).toBeInstanceOf(Error);
  expect(error.field).toBe("email");
  expect(error.message).toBe("形が違います");
  expect(error.name).toBe("ValidationError");
  expect(() => {
    throw error;
  }).toThrow(ValidationError);
  expectTypeOf(ValidationError).constructorParameters.toEqualTypeOf<[string, string]>();
  expectTypeOf(error).toHaveProperty("field").toEqualTypeOf<string>();
});
