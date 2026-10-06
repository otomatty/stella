import { describe, expect, it } from "vitest";

import { hasAiDraft } from "@/lib/ai-draft";

describe("AI の下書きがそろっているか", () => {
  it("旧形式の下書きと、新形式の AI 一次レビューの結果のどちらでも数える", () => {
    expect(hasAiDraft({ aiReady: true })).toBe(true);
    expect(hasAiDraft({ aiReady: false, aiReviewReady: true })).toBe(true);
  });
  it("どちらも無ければ数えない (AI が確認中の提出など)", () => {
    expect(hasAiDraft({ aiReady: false })).toBe(false);
    expect(hasAiDraft({ aiReady: false, aiReviewReady: false })).toBe(false);
  });
});
