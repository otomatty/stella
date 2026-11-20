// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { publish, type Published, type Draft } from "../src/q06-17-publish";
test("問17 publish", () => {
  expectTypeOf<Published>().toEqualTypeOf<Draft & { publishedAt: Date }>();
  const at = new Date("2026-12-01T09:00:00Z");
  expect(publish({ title: "お知らせ" }, at)).toEqual({ title: "お知らせ", publishedAt: at });
  expectTypeOf(publish).parameters.toEqualTypeOf<[Draft, Date]>();
  expectTypeOf(publish).returns.toEqualTypeOf<Published>();
});
