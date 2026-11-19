import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { fetchSubmissions } from "@/lib/submissions-api";
import { usePendingReviewCount, useSubmissionsAutoRefresh } from "./useSubmissions";

vi.mock("@/lib/submissions-api", () => ({ fetchSubmissions: vi.fn() }));
vi.mock("@/lib/backend", () => ({ isBackendConfigured: () => true }));

function LearnerReviewCount() {
  const count = usePendingReviewCount(false);
  useSubmissionsAutoRefresh(false);
  return count;
}

it("受講者の表示ではレビュー件数と自動更新のフックが提出一覧を取得しない", () => {
  expect(renderToStaticMarkup(createElement(LearnerReviewCount))).toBe("0");
  expect(fetchSubmissions).not.toHaveBeenCalled();
});
