// このファイルは書き換えないでください
import { expect, expectTypeOf, test } from "vitest";
import { mediaInfo, type Media } from "../src/q04-15-media-info";
test("問15 mediaInfo", () => {
  expectTypeOf<Media>().toEqualTypeOf<
    { type: "image"; width: number; height: number } | { type: "video"; seconds: number }
  >();
  expect(mediaInfo({ type: "image", width: 100, height: 200 })).toBe("画像 100×200");
  expect(mediaInfo({ type: "video", seconds: 90 })).toBe("動画 90秒");
  expectTypeOf(mediaInfo).parameters.toEqualTypeOf<[Media]>();
  expectTypeOf(mediaInfo).returns.toEqualTypeOf<string>();
});
