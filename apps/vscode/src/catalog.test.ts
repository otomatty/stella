import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get: () => "http://127.0.0.1:8787" }) },
}));

import type { StageWithChildren } from "@stella/shared/cms/types";
import { requireLoadedStageDetails, toCatalogStage } from "./catalog.js";

describe("requireLoadedStageDetails", () => {
  it("throws when enrolled stage ids exist but every detail is null", () => {
    expect(() => requireLoadedStageDetails(["c1", "c2"], [null, null])).toThrow(
      "ステージの読み込みに失敗しました",
    );
  });

  it("does not throw when there are no stage ids", () => {
    expect(() => requireLoadedStageDetails([], [])).not.toThrow();
  });

  it("does not throw when at least one detail loaded", () => {
    expect(() => requireLoadedStageDetails(["c1", "c2"], [null, { id: "c2" }])).not.toThrow();
  });
});

describe("toCatalogStage", () => {
  const lesson = (id: string, order: number) => ({
    id,
    section_id: "s1",
    title: id,
    type: "text" as const,
    order,
    duration_label: null,
    video_path: null,
    pdf_path: null,
    markdown: `# ${id}`,
    assignment_id: null,
    total_pages: null,
    total_sec: null,
    created_at: "",
    updated_at: "",
  });
  const detail = {
    stage: { id: "st", title: "開発環境とWebの入口", status: "published", format: 2 },
    sections: [
      {
        section: { id: "s1", stage_id: "st", title: "最初のページ", order: 0, created_at: "" },
        lessons: [lesson("task-lesson", 1), lesson("doc", 0)],
      },
    ],
  } as unknown as StageWithChildren;

  it("課題文レッスンに課題を結び、ほかのレッスンはそのまま", () => {
    const stage = toCatalogStage(
      detail,
      new Set(["doc"]),
      new Map([["task-lesson", { id: "dev-env-basics/m0/q01", status: "not-started" as const }]]),
    );
    expect(stage?.sections[0]?.lessons).toEqual([
      expect.objectContaining({ id: "doc", completed: true }),
      expect.objectContaining({
        id: "task-lesson",
        task: { id: "dev-env-basics/m0/q01", status: "not-started" },
      }),
    ]);
    expect(stage?.sections[0]?.lessons[0]).not.toHaveProperty("task");
  });
});
