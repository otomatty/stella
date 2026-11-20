// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { upgrade, type Plan } from "../src/q02-09-upgrade";
test("問9 upgrade", () => {
  expect(upgrade("free")).toBe("pro");
  expect(upgrade("pro")).toBe("enterprise");
  expect(upgrade("enterprise")).toBe("enterprise");
  expectTypeOf(upgrade).parameters.toEqualTypeOf<[Plan]>();
  expectTypeOf(upgrade).returns.toEqualTypeOf<Plan>();
});
