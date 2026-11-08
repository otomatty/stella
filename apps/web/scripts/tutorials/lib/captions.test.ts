import { expect, it } from "vitest";
import { chaptersToVtt } from "./captions";

it("字幕の開始から次の字幕か動画の末尾までを WebVTT にする", () => {
  expect(
    chaptersToVtt(
      [
        { t: 3.25, title: "こんにちは" },
        { t: 65.123, title: "次の画面" },
      ],
      70,
    ),
  ).toBe(
    "WEBVTT\n\n1\n00:00:03.250 --> 00:01:05.123\nこんにちは\n\n2\n00:01:05.123 --> 00:01:10.000\n次の画面\n",
  );
});
it("空の字幕、時刻の繰り上がり、特殊文字と改行を扱う", () => {
  expect(chaptersToVtt([], 0)).toBe("WEBVTT\n\n");
  expect(chaptersToVtt([{ t: 3599.9996, title: "<A> & B\nC" }], 3601)).toContain(
    "01:00:00.000 --> 01:00:01.000\n&lt;A&gt; &amp; B C",
  );
});
it("動画を超える字幕や表示時間のない字幕を出さない", () => {
  expect(
    chaptersToVtt(
      [
        { t: 0, title: "最初" },
        { t: 5, title: "範囲外" },
      ],
      3,
    ),
  ).toBe("WEBVTT\n\n1\n00:00:00.000 --> 00:00:03.000\n最初\n");
});
