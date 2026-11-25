import { describe, expect, it, vi } from "vitest";

vi.mock("vscode", () => ({
  workspace: { getConfiguration: () => ({ get: () => "http://127.0.0.1:8787" }) },
}));
vi.mock("./api.js", () => ({ apiRequest: vi.fn() }));

import type { StageWithChildren } from "@stella/shared/cms/types";
import type { TaskProblemStepSummary } from "@stella/shared/tasks/problem-steps";
import { apiRequest } from "./api.js";
import { loadCatalog, requireLoadedStageDetails, toCatalogStage } from "./catalog.js";

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
    pdf_path: `slides/${id}.pdf`,
    markdown: `# ${id}`,
    assignment_id: null,
    total_pages: null,
    total_sec: null,
    created_at: "",
    updated_at: "",
  });
  const detail = {
    stage: { id: "st", title: "STELLAの使い方", status: "published", format: 2 },
    sections: [
      {
        section: { id: "s1", stage_id: "st", title: "最初のページ", order: 0, created_at: "" },
        lessons: [lesson("task-lesson", 1), lesson("doc", 0)],
      },
    ],
  } as unknown as StageWithChildren;

  it("課題文レッスンに課題を結び、教材の本文と PDF パスは保持しない", () => {
    const stage = toCatalogStage(
      detail,
      new Set(["doc"]),
      new Map([["task-lesson", { id: "dev-env-basics/m0/q01", status: "not-started" as const }]]),
    );
    expect(stage?.sections[0]?.lessons).toEqual([
      { id: "doc", stageId: "st", title: "doc", type: "text", completed: true },
      expect.objectContaining({
        id: "task-lesson",
        task: { id: "dev-env-basics/m0/q01", status: "not-started" },
      }),
    ]);
    expect(stage?.sections[0]?.lessons[0]).not.toHaveProperty("task");
  });

  it("課題文のない課題でも問題を結び、完了はレッスン進捗から読む", async () => {
    const taskId = "devlab-ts-ch01/u01-let-const/q01";
    const problems: TaskProblemStepSummary[] = (["open", "submitted"] as const).map(
      (state, index) => ({
        id: `q0${index + 1}`,
        title: `問題 ${index + 1}`,
        label: `問${index + 1}`,
        stepLessonId: `problem-u01-let-const-q01-q0${index + 1}`,
        afterLessonId: "video",
        afterTitle: "計算の順番",
        state,
        refs: [],
      }),
    );
    const section = {
      ...detail.sections[0],
      lessons: [lesson("video", 0), ...problems.map((step, i) => lesson(step.stepLessonId, i + 1))],
    };
    vi.mocked(apiRequest).mockImplementation(async (url) => {
      switch (url) {
        case "/api/enrollments/mine":
          return { rows: [{ stage_id: "st", status: "active" }] };
        case "/api/lesson-progress":
          return { rows: [{ lesson_id: problems[0].stepLessonId, completed: 1 }] };
        case "/api/cms/stages/st":
          return { stage: { ...detail, sections: [section] } };
        case "/api/tasks/for-stage/st":
          return { tasks: [{ id: taskId, lessonId: null, status: "not-started", problems }] };
        default:
          throw new Error(url);
      }
    });
    const [stage] = await loadCatalog();
    expect(stage?.sections[0]?.lessons).toEqual([
      { id: "video", stageId: "st", title: "video", type: "text", completed: false },
      ...problems.map(({ id, stepLessonId }, i) => ({
        id: stepLessonId,
        stageId: "st",
        title: stepLessonId,
        type: "text",
        completed: i === 0,
        problem: { taskId, id },
      })),
    ]);
  });
});
