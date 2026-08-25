import { describe, expect, it } from "vitest";

import { buildReviewDraftUserMessage } from "./prompt.js";
import {
  MAX_REVIEW_SUMMARY_LENGTH,
  validateReviewDraftRequest,
} from "./validate-review-draft-request.js";

function ok(raw: unknown) {
  const result = validateReviewDraftRequest(raw);
  if (!result.ok) throw new Error(result.message);
  return result.body;
}

const base = { assignmentTitle: "配列の合計", code: "const a = 1;" };

describe("validateReviewDraftRequest", () => {
  it("課題言語は js / ts / sql / fe-pseudo を通す", () => {
    for (const language of ["js", "ts", "sql", "fe-pseudo"] as const) {
      expect(ok({ ...base, language }).language).toBe(language);
    }
  });

  it("知らない言語は未指定として扱う", () => {
    expect(ok({ ...base, language: "python" }).language).toBeUndefined();
    expect(ok(base).language).toBeUndefined();
  });

  it("採点サマリは文字列のときだけ載る", () => {
    expect(ok({ ...base, gradingSummary: "自動採点: 未クリア" }).gradingSummary).toBe(
      "自動採点: 未クリア",
    );
    expect(ok({ ...base, gradingSummary: "   " }).gradingSummary).toBeUndefined();
    expect(ok({ ...base, gradingSummary: { cleared: false } }).gradingSummary).toBeUndefined();
  });

  it("長すぎる採点サマリは 400", () => {
    const result = validateReviewDraftRequest({
      ...base,
      gradingSummary: "x".repeat(MAX_REVIEW_SUMMARY_LENGTH + 1),
    });
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});

describe("buildReviewDraftUserMessage", () => {
  it("言語ごとにコードフェンスを切り替える", () => {
    expect(buildReviewDraftUserMessage({ ...base, language: "ts" })).toContain("```typescript");
    expect(buildReviewDraftUserMessage({ ...base, language: "sql" })).toContain("```sql");
    expect(buildReviewDraftUserMessage({ ...base, language: "fe-pseudo" })).toContain("```text");
    expect(buildReviewDraftUserMessage(base)).toContain("```javascript");
  });

  it("採点サマリがあれば提出コードの前に載せる", () => {
    const message = buildReviewDraftUserMessage({ ...base, gradingSummary: "自動採点: 未クリア" });
    expect(message).toContain("自動採点: 未クリア");
    expect(message.indexOf("自動採点: 未クリア")).toBeLessThan(message.indexOf("提出コード:"));
  });

  it("採点サマリが無ければ何も足さない", () => {
    expect(buildReviewDraftUserMessage(base)).not.toContain("自動採点");
  });
});
