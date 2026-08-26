import { describe, expect, it } from "vitest";

import { formatAudioGenerateErrors } from "./interview-prep-api";

describe("formatAudioGenerateErrors", () => {
  it("失敗セグメントの番号・part・本文を列挙する", () => {
    const text = formatAudioGenerateErrors([
      { no: 12, part: "question", ok: true },
      { no: 12, part: "deep1", ok: false, error: "Workers AI の呼び出しに失敗しました (401)" },
      { no: 13, part: "question", ok: false },
    ]);
    expect(text).toContain("No.12 (deep1): Workers AI の呼び出しに失敗しました (401)");
    expect(text).toContain("No.13 (question): 不明なエラー");
    expect(text).not.toContain("No.12 (question)");
  });
});
