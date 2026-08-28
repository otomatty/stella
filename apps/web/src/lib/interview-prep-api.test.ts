import { describe, expect, it } from "vitest";

import { formatAudioGenerateErrors } from "./interview-prep-api";

describe("formatAudioGenerateErrors", () => {
  it("失敗した質問の番号と本文だけを列挙する", () => {
    const text = formatAudioGenerateErrors([
      { no: 11, ok: true },
      { no: 12, ok: false, error: "Workers AI の呼び出しに失敗しました (401)" },
      { no: 13, ok: false },
    ]);
    expect(text).toContain("No.12: Workers AI の呼び出しに失敗しました (401)");
    expect(text).toContain("No.13: 不明なエラー");
    expect(text).not.toContain("No.11");
  });
});
