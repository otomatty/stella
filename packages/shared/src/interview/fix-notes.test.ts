import { describe, expect, it } from "vitest";

import {
  FIX_NOTE_MAX_LENGTH,
  fixNotesByQuestion,
  normalizeFixNoteText,
  sortFixNotesForHistory,
  summarizeFixNotes,
  unresolvedFixNotes,
} from "./fix-notes";

const note = (
  id: string,
  overrides: Partial<{ question_no: number; created_at: string; resolved_at: string | null }> = {},
) => ({
  id,
  question_no: overrides.question_no ?? 101,
  text: id,
  created_at: overrides.created_at ?? "2026-08-01T00:00:00.000Z",
  resolved_at: overrides.resolved_at ?? null,
});

describe("normalizeFixNoteText", () => {
  it("前後の空白と連続空白を潰す", () => {
    expect(normalizeFixNoteText("  結論から  先に \n言う ")).toBe("結論から 先に 言う");
  });

  it("上限で切り詰め、 文字列以外は空", () => {
    expect(normalizeFixNoteText("あ".repeat(FIX_NOTE_MAX_LENGTH + 50))).toHaveLength(
      FIX_NOTE_MAX_LENGTH,
    );
    expect(normalizeFixNoteText(42)).toBe("");
    expect(normalizeFixNoteText(null)).toBe("");
    expect(normalizeFixNoteText("   ")).toBe("");
  });
});

describe("unresolvedFixNotes", () => {
  it("未解決だけを古い順に返す", () => {
    const notes = [
      note("b", { created_at: "2026-08-02T00:00:00.000Z" }),
      note("done", { resolved_at: "2026-08-03T00:00:00.000Z" }),
      note("a", { created_at: "2026-08-01T00:00:00.000Z" }),
    ];
    expect(unresolvedFixNotes(notes).map((n) => n.id)).toEqual(["a", "b"]);
  });
});

describe("sortFixNotesForHistory", () => {
  it("未解決が先、 それぞれ新しい順", () => {
    const notes = [
      note("old", { created_at: "2026-08-01T00:00:00.000Z" }),
      note("resolved-new", {
        created_at: "2026-08-05T00:00:00.000Z",
        resolved_at: "2026-08-06T00:00:00.000Z",
      }),
      note("new", { created_at: "2026-08-04T00:00:00.000Z" }),
    ];
    expect(sortFixNotesForHistory(notes).map((n) => n.id)).toEqual(["new", "old", "resolved-new"]);
  });
});

describe("fixNotesByQuestion / summarizeFixNotes", () => {
  it("質問番号ごとに束ね、 件数を数える", () => {
    const notes = [
      note("a", { question_no: 101 }),
      note("b", { question_no: 102, resolved_at: "2026-08-03T00:00:00.000Z" }),
      note("c", { question_no: 101 }),
    ];
    const map = fixNotesByQuestion(notes);
    expect(map.get(101)?.map((n) => n.id)).toEqual(["a", "c"]);
    expect(map.get(102)?.map((n) => n.id)).toEqual(["b"]);
    expect(summarizeFixNotes(notes)).toEqual({ total: 3, unresolved: 2, resolved: 1 });
  });
});
