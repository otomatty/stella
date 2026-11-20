// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { doorText, type Door } from "../src/q08-05-door-text";
test("問5 doorText", () => {
  expect(doorText({ state: "open" })).toBe("開いている");
  expect(doorText({ state: "closed" })).toBe("閉まっている");
  expect(doorText({ state: "locked", key: "A" })).toBe("鍵がかかっている");
  expectTypeOf(doorText).parameters.toEqualTypeOf<[Door]>();
  expectTypeOf(doorText).returns.toEqualTypeOf<string>();
});
