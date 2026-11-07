import { describe, expect, it } from "vitest";
import {
  collectNarrationTexts,
  scriptWeight,
  splitScript,
  titleNarration,
  toSpeech,
} from "./narration";

describe("字幕の読み替え", () => {
  it.each([
    [
      "STELLA Stella VS Code XP Ctrl+K",
      "ステラ ステラ ブイエスコード エックスピー コントロール プラス K",
    ],
    ["→", "右矢印キー"],
    ["Sen Sentry STELLAR", "Sen Sentry STELLAR"],
    ["⌘K（Ctrl+K）のパレットから", "コマンド K、または コントロール プラス Kのパレットから"],
    ["⇧ ⌥ G → I J / K / キー", "シフト オプション G のあとに I J と K スラッシュキー"],
    [
      "↓ ↑ ← ★ × @ ? を押す Esc",
      "下矢印キー 上矢印キー 左矢印キー 星のマーク バツ アットマーク はてなキー を押す エスケープ",
    ],
    [
      "## で見出し、- で箇条書き（1 = 緊急）",
      "シャープ 2 つ で見出し、ハイフンで箇条書き（1 は緊急）",
    ],
    ["- で始める  A + B  ", "ハイフンで始める A プラス B"],
  ])("%s", (text, expected) => expect(toSpeech(text)).toBe(expected));
  it("say とタイトルを先読みする", () => {
    expect(
      collectNarrationTexts(
        'await t.caption("画面"); await t.caption("表示", { say: "読み上げ" });',
      ),
    ).toEqual(["画面", "読み上げ"]);
    expect(titleNarration("確認。", "説明")).toBe("確認。説明");
  });
});

function pcm(parts: { seconds: number; sound: boolean }[]): Buffer {
  return Buffer.concat(
    parts.map(({ seconds, sound }) => {
      const bytes = Buffer.alloc(Math.round(seconds * 24000) * 2);
      if (sound) for (let i = 0; i < bytes.length; i += 2) bytes.writeInt16LE(8000, i);
      return bytes;
    }),
  );
}

describe("まとめ読みの切り分け", () => {
  it("長い無音で文を分け、先頭と末尾の無音を除く", () => {
    const data = pcm([
      { seconds: 0.2, sound: false },
      { seconds: 2, sound: true },
      { seconds: 2, sound: false },
      { seconds: 2, sound: true },
      { seconds: 0.2, sound: false },
    ]);
    expect(splitScript(data, [1, 1])).toEqual([
      { start: 9600, end: 153600 },
      { start: 153600, end: 297600 },
    ]);
  });
  it("同じ長さの無音を区切りとして選ばない", () => {
    const sound = { seconds: 1, sound: true };
    const silence = { seconds: 0.5, sound: false };
    expect(splitScript(pcm([sound, silence, sound, silence, sound]), [1, 1])).toBeNull();
  });
  it("無音だけ・区切り不足・不正な重みでは失敗する", () => {
    expect(splitScript(Buffer.alloc(48000), [1])).toBeNull();
    const data = pcm([{ seconds: 2, sound: true }]);
    expect(splitScript(data, [1, 1])).toBeNull();
    for (const weights of [[], [0], [-1], [Number.NaN]])
      expect(splitScript(data, weights)).toBeNull();
  });
  it("文の長さの見込みは日本語と英数字・句読点から決まる", () => {
    expect(scriptWeight("あア漢A AB、。 ")).toBeCloseTo(14.1);
  });
});
