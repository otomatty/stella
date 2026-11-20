import { describe, expect, it } from "vitest";
import {
  applyMention,
  defaultCommentPosition,
  isCurrentThread,
  mentionedIds,
  parseMentionQuery,
  shouldOpenOrphanedComments,
  splitMentions,
  trackMentionRanges,
} from "./lesson-comments";

describe("通知から更新前のコメントを開く判定", () => {
  it("通常の一覧を取得し、対象がなく更新前のコメントがあるときに開く", () => {
    expect(shouldOpenOrphanedComments(undefined, "target")).toBe(false);
    expect(shouldOpenOrphanedComments({ threads: [], orphaned_count: 0 }, "target")).toBe(false);
    expect(
      shouldOpenOrphanedComments({ threads: [{ id: "target" }], orphaned_count: 1 }, "target"),
    ).toBe(false);
    expect(
      shouldOpenOrphanedComments({ threads: [{ id: "other" }], orphaned_count: 1 }, "target"),
    ).toBe(true);
  });
});

describe("メンションの入力", () => {
  it("行頭・空白の直後の検索語をカーソルまで読む", () => {
    expect(parseMentionQuery("@", 1)).toEqual({ start: 0, query: "" });
    expect(parseMentionQuery("質問\n@田中さん", 6)).toEqual({ start: 3, query: "田中" });
    expect(parseMentionQuery("質問 @佐藤", 6)).toEqual({ start: 3, query: "佐藤" });
  });

  it.each(["あ@", "@田 中", "@田\n", "mail@example.test", "質問"])(
    "%j の末尾はメンション入力中としない",
    (text) => expect(parseMentionQuery(text, text.length)).toBeNull(),
  );

  it("指定した範囲だけを置き換え、空白の直後にカーソルを置く", () => {
    expect(applyMention("質問 @田\n次の行", { start: 3, end: 5 }, "田中 花子")).toEqual({
      text: "質問 @田中 花子 \n次の行",
      caret: 10,
    });
  });
});

describe("本文のメンション", () => {
  const short = { id: "short", name: "田中" };
  const long = { id: "long", name: "田中 花子" };
  const special = { id: "special", name: "A.*" };

  it("長い名前を優先し、名前と通常の文字列を分ける", () => {
    expect(splitMentions("@田中 花子、確認を\n@田中 @A.*。", [short, long, special])).toEqual([
      { text: "@田中 花子", mention: long },
      { text: "、確認を\n" },
      { text: "@田中", mention: short },
      { text: " " },
      { text: "@A.*", mention: special },
      { text: "。" },
    ]);
    expect(splitMentions("@田中山 user@田中", [short])).toEqual([{ text: "@田中山 user@田中" }]);
  });

  it("本文に残っている候補の ID だけを重複なしで返す", () => {
    expect(
      mentionedIds([
        { id: long.id, start: 0, length: 6 },
        { id: long.id, start: 7, length: 6 },
      ]),
    ).toEqual(["long"]);
    expect(mentionedIds([])).toEqual([]);
  });

  it("メンションの前に文字を入力すると範囲をずらす", () => {
    const mention = { id: short.id, start: 0, length: 3 };
    expect(trackMentionRanges("@田中", "確認 @田中", [mention], 3)).toEqual([
      { ...mention, start: 3 },
    ]);
  });

  it("メンションの中を削除すると範囲を捨てる", () => {
    const mention = { id: short.id, start: 0, length: 3 };
    expect(trackMentionRanges("@田中", "@中", [mention], 1)).toEqual([]);
  });

  it.each([
    [0, "second"],
    [3, "first"],
  ])("同じ名前の片方を削除するとカーソル位置 %s に応じて %s が残る", (caret, id) => {
    const mentions = [
      { id: "first", start: 0, length: 3 },
      { id: "second", start: 4, length: 3 },
    ];
    const remaining = trackMentionRanges("@田中 @田中", "@田中", mentions, caret);
    expect(remaining).toEqual([{ id, start: 0, length: 3 }]);
    expect(mentionedIds(remaining)).toEqual([id]);
  });
});

describe("コメントの位置と現在の場面", () => {
  it.each([
    [0, 60, false, null],
    [0, 60, true, 0],
    [59, 60, true, null],
    [60, 60, true, null],
    [58.95, 60, true, 58.95],
    [9.98, 60, true, 9.98],
    [0, 0, true, null],
  ])(
    "位置 %s、長さ %s、再生済み %s の初期位置は %s",
    (currentTime, duration, hasPlayed, expected) => {
      expect(defaultCommentPosition({ currentTime, duration, hasPlayed })).toBe(expected);
    },
  );

  it("場面の境界では次の場面を選び、位置の無いスレッドは含めない", () => {
    const scenes = [
      { id: "intro", startSec: 0, durationSec: 10, hash: "a" },
      { id: "main", startSec: 10, durationSec: 15, hash: "b" },
    ];
    expect(isCurrentThread({ position_sec: 9, scene_id: "intro" }, scenes, 10)).toBe(false);
    expect(isCurrentThread({ position_sec: 20, scene_id: "main" }, scenes, 10)).toBe(true);
    expect(isCurrentThread({ position_sec: null, scene_id: "main" }, scenes, 10)).toBe(false);
    expect(isCurrentThread({ position_sec: 23, scene_id: null }, scenes, 26)).toBe(true);
  });

  it("一覧 API の場面をそのまま使える", () => {
    expect(
      isCurrentThread(
        { position_sec: 0, scene_id: "intro" },
        [{ id: "intro", start_sec: 0, duration_sec: 10 }],
        9,
      ),
    ).toBe(true);
  });

  it("場面の無い動画では前後 5 秒を含める", () => {
    const thread = { position_sec: 10, scene_id: null };
    expect(isCurrentThread(thread, [], 5)).toBe(true);
    expect(isCurrentThread(thread, null, 15)).toBe(true);
    expect(isCurrentThread(thread, [], 15.1)).toBe(false);
    expect(isCurrentThread({ ...thread, position_sec: null }, [], 0)).toBe(false);
  });
});
