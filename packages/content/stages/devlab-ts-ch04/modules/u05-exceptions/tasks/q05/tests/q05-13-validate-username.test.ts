// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { validateUsername } from "../src/q05-13-validate-username";
test("問13 validateUsername", () => {
  expect(() => {
    validateUsername("");
  }).toThrow("名前を入力してください");
  expect(() => {
    validateUsername("a".repeat(21));
  }).toThrow("20文字以内にしてください");
  expect(() => {
    validateUsername("yamada taro");
  }).toThrow("空白は使えません");
  expect(() => {
    validateUsername("yamada");
  }).not.toThrow();
  expectTypeOf(validateUsername).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(validateUsername).returns.toBeVoid();
});
