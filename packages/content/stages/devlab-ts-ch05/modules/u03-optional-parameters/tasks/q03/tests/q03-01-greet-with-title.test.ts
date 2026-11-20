// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { greetWithTitle } from "../src/q03-01-greet-with-title";
test("問1 greetWithTitle", () => {
  expect(greetWithTitle("山田", "部長")).toBe("山田部長");
  expect(greetWithTitle("山田")).toBe("山田さん");
  expectTypeOf(greetWithTitle).parameters.toEqualTypeOf<[string, string?]>();
  expectTypeOf(greetWithTitle).returns.toEqualTypeOf<string>();
});
