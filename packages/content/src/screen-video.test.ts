import { describe, expect, it } from "vitest";
import { SCREEN_VIDEO_FILES, selectVideoSource } from "./material-video.js";

const files = {
  "screen.mp4": Buffer.from("video"),
  "screen.vtt": Buffer.from("captions"),
  "screen.jpg": Buffer.from("poster"),
};

describe("収録済み教材動画の選択", () => {
  it("3ファイルがそろえば収録版を選び、32桁のハッシュを付ける", () => {
    expect(selectVideoSource(files, true)).toEqual({
      kind: "recorded",
      sourceHash: expect.stringMatching(/^[a-f0-9]{32}$/),
    });
  });

  it("1ファイルも無ければ生成版を選ぶ", () => {
    expect(selectVideoSource({}, true)).toEqual({ kind: "generated" });
  });

  it("一部だけある全組み合わせを、不足ファイル名付きで拒否する", () => {
    for (let mask = 1; mask < 7; mask++) {
      const partial: Partial<typeof files> = {};
      const missing: string[] = [];
      SCREEN_VIDEO_FILES.forEach((name, index) => {
        if (mask & (1 << index)) partial[name] = files[name];
        else missing.push(name);
      });
      expect(() => selectVideoSource(partial, true)).toThrow(`不足: ${missing.join(", ")}`);
    }
  });

  it("3ファイルがそろっていても台本が無ければ拒否する", () => {
    expect(() => selectVideoSource(files, false)).toThrow(
      "収録済みの動画には narration.json が必要です",
    );
  });

  it("台本が無く一部だけある場合は、台本と不足ファイルの両方を示す", () => {
    expect(() => selectVideoSource({ "screen.mp4": files["screen.mp4"] }, false)).toThrow(
      "収録済みの動画には narration.json が必要です\n収録済み動画の3ファイルをそろえてください。不足: screen.vtt, screen.jpg",
    );
  });

  it("収録ファイルが無ければ台本の有無にかかわらず生成版を選ぶ", () => {
    expect(selectVideoSource({}, false)).toEqual({ kind: "generated" });
  });

  it.each(SCREEN_VIDEO_FILES)("%s の中身が変わればハッシュが変わる", (name) => {
    expect(selectVideoSource({ ...files, [name]: Buffer.from("changed") }, true)).not.toEqual(
      selectVideoSource(files, true),
    );
  });

  it("オブジェクトのキーの順序に依存しない", () => {
    expect(selectVideoSource(Object.fromEntries(Object.entries(files).reverse()), true)).toEqual(
      selectVideoSource(files, true),
    );
  });

  it("ファイル間で同じバイト列を移しても別のハッシュになる", () => {
    expect(
      selectVideoSource(
        {
          ...files,
          "screen.mp4": Buffer.from("a"),
          "screen.vtt": Buffer.from("bc"),
        },
        true,
      ),
    ).not.toEqual(
      selectVideoSource(
        {
          ...files,
          "screen.mp4": Buffer.from("ab"),
          "screen.vtt": Buffer.from("c"),
        },
        true,
      ),
    );
  });
});
