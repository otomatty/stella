// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { signalAction } from "../src/q02-17-signal-action";
test("問17 signalAction", () => {
  expect(signalAction("red")).toBe("止まれ");
  expect(signalAction("yellow")).toBe("注意");
  expect(signalAction("green")).toBe("進め");
  expectTypeOf(signalAction).parameters.toEqualTypeOf<["red" | "yellow" | "green"]>();
  expectTypeOf(signalAction).returns.toEqualTypeOf<"止まれ" | "注意" | "進め">();
});
