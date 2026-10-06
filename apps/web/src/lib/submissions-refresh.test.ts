import type { Submission } from "@stella/shared/review/types";
import { describe, expect, it } from "vitest";
import {
  isFetchFresh,
  mergeFetchedRows,
  SUBMISSIONS_POLL_MS,
  shouldPollSubmissions,
} from "./submissions-refresh";

const row = (id: string, over: Partial<Submission> = {}) =>
  ({
    id,
    status: "pending",
    verdict: null,
    aiReviewStatus: "escalated",
    reviewNotes: "",
    ...over,
  }) as Submission;

describe("提出一覧の取り直し", () => {
  it("AI が確認中の提出があり、タブが見えているあいだだけ控えめな間隔で取り直す", () => {
    const checking = [row("a", { aiReviewStatus: "queued" }), row("b")];
    expect(shouldPollSubmissions(checking, true)).toBe(true);
    expect(shouldPollSubmissions(checking, false)).toBe(false);
    expect(shouldPollSubmissions([row("b")], true)).toBe(false);
    expect(SUBMISSIONS_POLL_MS).toBeGreaterThanOrEqual(30_000);
    expect(SUBMISSIONS_POLL_MS).toBeLessThanOrEqual(60_000);
  });

  it("取り直した直後は、画面を開き直しても続けて取りに行かない", () => {
    expect(isFetchFresh(undefined, 10_000)).toBe(false);
    expect(isFetchFresh(9_000, 10_000)).toBe(true);
    expect(isFetchFresh(1_000, 10_000)).toBe(false);
  });

  it("取り直した一覧で置き換え、取り直しの間に講師が保存した行は手元の行を残す", () => {
    const current = [
      row("saved", { verdict: "pass", status: "passed", reviewNotes: "手元で確定" }),
      row("other"),
      row("local-only"),
    ];
    const fetched = [row("saved"), row("other", { aiReviewStatus: "confirmed" }), row("new")];
    const merged = mergeFetchedRows(
      current,
      fetched,
      (id) => id === "saved" || id === "local-only",
    );
    expect(merged.map((s) => s.id)).toEqual(["saved", "other", "new", "local-only"]);
    expect(merged[0]).toMatchObject({ verdict: "pass", reviewNotes: "手元で確定" });
    expect(merged[1]).toMatchObject({ aiReviewStatus: "confirmed" });
  });
});
