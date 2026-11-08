import { describe, expect, it } from "vitest";
import { slidesHash } from "../../src/narration.js";
import { narrationFromNotes } from "./narration-from-notes.js";

const source = (note: string) =>
  `---\nid: test\ntitle: テスト\ntakeaway: 文を読みます\n---\n# タイトル\n${note}`;
const withNote = (note: string) => source(`<!-- ノート: ${note} -->`);
const texts = (note: string) =>
  narrationFromNotes(withNote(note))?.slides[0].cues.map((cue) => cue.text);

describe("narrationFromNotes", () => {
  it("句点を残して文を分け、末尾の句点が無い文も保持する", () => {
    expect(texts("最初です。 次です。末尾です")).toEqual(["最初です。", "次です。", "末尾です"]);
  });

  it("スライド順と現在の指紋を保つ", () => {
    const slides = `${withNote("最初です。")}\n---\n# 次\n<!-- ノート: 次です。 -->`;
    expect(narrationFromNotes(slides)).toEqual({
      schema: 1,
      slidesHash: slidesHash(slides),
      slides: [{ cues: [{ text: "最初です。" }] }, { cues: [{ text: "次です。" }] }],
    });
  });

  it("60 字ちょうどは分割しない", () => {
    expect(texts(`${"あ".repeat(59)}。`)).toEqual([`${"あ".repeat(59)}。`]);
  });

  it("60 字以内の最後の読点で、必要なだけ分割する", () => {
    const parts = [
      `${"あ".repeat(20)}、`,
      `${"い".repeat(38)}、`,
      `${"う".repeat(40)}、`,
      `${"え".repeat(30)}。`,
    ];
    const result = texts(parts.join(""));
    expect(result).toEqual([parts[0] + parts[1], parts[2], parts[3]]);
    expect(result?.join("")).toBe(parts.join(""));
  });

  it("Unicode の文字を数え、60 字目の読点でも分割できる", () => {
    expect(texts(`${"😀".repeat(59)}、続きです。`)).toEqual([`${"😀".repeat(59)}、`, "続きです。"]);
  });

  it("分割できない位置をスライド・文・文字位置で示す", () => {
    expect(() => texts(`短い文です。区切り、${"あ".repeat(61)}。`)).toThrow(
      /スライド 1、文 2、5 字目/,
    );
    expect(() => texts(`${"あ".repeat(60)}、`)).toThrow(/読点がありません/);
  });

  it.each(["", "<!-- ノート:   -->"])("ノートが無いか空なら失敗する", (note) => {
    expect(() => narrationFromNotes(source(note))).toThrow(/スライド 1: ノートがありません/);
  });

  it("既存なら指紋や内容にかかわらず変換せず、force のときだけ作る", () => {
    expect(narrationFromNotes(source(""), true)).toBeUndefined();
    expect(narrationFromNotes(withNote("作り直します。"), true, true)?.slides[0].cues).toEqual([
      { text: "作り直します。" },
    ]);
  });
});
