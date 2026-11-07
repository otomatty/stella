import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Stage } from "@/data/types";
import { FIRST_STEP_KEYS, type FirstSteps } from "@stella/shared/study/first-steps";
import { useFirstSteps } from "@/hooks/useFirstSteps";
import { StageDetail } from "./StageDetail";

vi.mock("@/hooks/useFirstSteps", () => ({ useFirstSteps: vi.fn() }));
const stage: Stage = {
  id: "root",
  title: "開発環境",
  category: "基礎",
  color: "indigo",
  lessonsCount: 0,
  progress: 0,
  sections: [],
};
const data: FirstSteps = {
  stage_id: "root",
  stage_started: true,
  items: FIRST_STEP_KEYS.map((key) => ({ key, done: false, at: null })),
};
const render = (id = "root") =>
  renderToStaticMarkup(
    createElement(StageDetail, {
      stage: { ...stage, id },
      setPage: vi.fn(),
      onOpenLesson: vi.fn(),
    }),
  );
beforeEach(() => vi.mocked(useFirstSteps).mockReturnValue(data));
describe("ステージ詳細の到達リスト", () => {
  it("最初のステージの上部に表示する", () => {
    const html = render();
    expect(html).toContain("STELLA の使い方");
    expect(html.indexOf("STELLA の使い方")).toBeLessThan(html.indexOf("シラバス"));
  });
  it("別のステージには表示しない", () => expect(render("other")).not.toContain("STELLA の使い方"));
  it("取得失敗でもステージ詳細を表示する", () => {
    vi.mocked(useFirstSteps).mockReturnValue(null);
    const html = render();
    expect(html).not.toContain("STELLA の使い方");
    expect(html).toContain("シラバス");
  });
});
