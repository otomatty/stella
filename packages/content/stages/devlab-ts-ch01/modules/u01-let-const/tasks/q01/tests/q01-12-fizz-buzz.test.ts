// このファイルは書き換えないでください
import { expect, test } from "vitest";
import { fizzBuzz } from "../src/q01-12-fizz-buzz";
test("問12 fizzBuzz", () => {
  expect(fizzBuzz(15)).toBe("FizzBuzz");
  expect(fizzBuzz(9)).toBe("Fizz");
  expect(fizzBuzz(10)).toBe("Buzz");
  expect(fizzBuzz(7)).toBe("7");
});
