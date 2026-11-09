// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { parsePlan, type Plan } from "../src/q02-10-parse-plan";
test("問10 parsePlan", () => {
  expect(parsePlan("Pro")).toBe("pro");
  expect(parsePlan("FREE")).toBe("free");
  expect(parsePlan("premium")).toBeUndefined();
  expectTypeOf(parsePlan).parameters.toEqualTypeOf<[string]>();
  expectTypeOf(parsePlan).returns.toEqualTypeOf<Plan | undefined>();
});
