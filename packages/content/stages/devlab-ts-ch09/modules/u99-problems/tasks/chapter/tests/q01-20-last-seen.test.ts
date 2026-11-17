// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { lastSeen } from "../src/q01-20-last-seen";
test("問20 lastSeen", () => {
  const events = [
    { user: "a", time: 5 },
    { user: "b", time: 1 },
    { user: "a", time: 3 },
    { user: "b", time: 9 },
  ];
  expect([...lastSeen(events).entries()]).toEqual([
    ["a", 5],
    ["b", 9],
  ]);
  expectTypeOf(lastSeen).returns.toEqualTypeOf<Map<string, number>>();
});
