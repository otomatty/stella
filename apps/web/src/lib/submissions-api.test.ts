import type { SubmissionReference } from "@stella/shared/review/types";
import { describe, expect, it } from "vitest";
import { referenceForSubmission } from "./submissions-api";

describe("referenceForSubmission", () => {
  const reference: SubmissionReference = {
    available: true,
    submittedAt: 1795338000123,
    version: "submitted",
    files: [{ path: "src/main.ts", text: "// 解答例" }],
    reviewGuide: "# レビューの観点",
  };

  it("表示中の提出と日時が一致するときだけ参考を使う", () => {
    expect(referenceForSubmission(reference, reference.submittedAt)).toBe(reference);
  });

  it.each([-1, 1])("提出日時が %i ms 異なるときは開き直しを案内する", (offset) => {
    expect(referenceForSubmission(reference, reference.submittedAt + offset)).toEqual({
      available: false,
      reason: "提出が更新されました。開き直してください",
    });
  });

  it("提出詳細の読み込み中は参考を表示しない", () => {
    expect(referenceForSubmission(reference, undefined)).toBeUndefined();
  });

  it("参考が利用できない理由はそのまま表示する", () => {
    const unavailable = { available: false, reason: "解答例が見つかりません" } as const;
    expect(referenceForSubmission(unavailable, reference.submittedAt)).toBe(unavailable);
  });
});
