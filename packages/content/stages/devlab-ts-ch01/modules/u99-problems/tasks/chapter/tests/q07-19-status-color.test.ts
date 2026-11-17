// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { statusColor } from "../src/q07-19-status-color";
test("問19 statusColor", () => {
  expect(statusColor("online")).toBe("green");
  expect(statusColor("busy")).toBe("red");
  expect(statusColor("offline")).toBe("gray");
  expectTypeOf(statusColor).parameters.toEqualTypeOf<["online" | "busy" | "offline"]>();
  expectTypeOf(statusColor).returns.toEqualTypeOf<"green" | "red" | "gray">();
});
