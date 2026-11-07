// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { opName, type Op } from "../src/q07-18-op-name";
test("問18 opName", () => {
  expect(opName("add")).toBe("足し算");
  expect(opName("sub")).toBe("引き算");
  expect(opName("mul")).toBe("掛け算");
  expectTypeOf(opName).parameters.toEqualTypeOf<[Op]>();
  expectTypeOf(opName).returns.toEqualTypeOf<"足し算" | "引き算" | "掛け算">();
});
