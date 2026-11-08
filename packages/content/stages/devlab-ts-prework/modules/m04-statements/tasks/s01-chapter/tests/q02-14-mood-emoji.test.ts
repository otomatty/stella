// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { moodEmoji } from "../src/q02-14-mood-emoji";
test("問14 moodEmoji", () => {
  expect(moodEmoji("happy")).toBe("😊");
  expect(moodEmoji("sad")).toBe("😢");
  expect(moodEmoji("angry")).toBe("😠");
  expectTypeOf(moodEmoji).parameters.toEqualTypeOf<["happy" | "sad" | "angry"]>();
  expectTypeOf(moodEmoji).returns.toEqualTypeOf<"😊" | "😢" | "😠">();
});
