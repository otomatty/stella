// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { commandArgs } from "../src/q08-18-command-args";
test("問18 commandArgs", () => {
  expect(commandArgs("add  1   2")).toEqual(["1", "2"]);
  expect(commandArgs("help")).toEqual([]);
  expect(commandArgs("")).toEqual([]);
  expectTypeOf(commandArgs).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(commandArgs).returns.toEqualTypeOf<string[]>();
});
