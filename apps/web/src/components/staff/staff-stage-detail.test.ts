import { describe, expect, it } from "vitest";
import type { LessonRow, StageWithChildren, StageMaterialRow } from "@stella/shared/cms/types";
import type { StaffStageTask } from "@stella/shared/tasks/staff-stage";
import { SOLUTION_UNLOCK_ATTEMPTS } from "@stella/shared/tasks/help";
import {
  adjacentStageLessons,
  lessonVideoStatus,
  summarizeStageVideos,
  filterStaffStageTasks,
  groupStageSections,
  groupStageMaterials,
  prerequisitesLabel,
  parseStaffStageTab,
  taskSupportLabel,
} from "./staff-stage-detail";

const task: StaffStageTask = {
  id: "stage/module/task",
  sectionId: "s1",
  title: "API を作る",
  kind: "basic",
  estimatedMinutes: 30,
  lessonId: "task-lesson",
  support: null,
  variantCount: 2,
  counts: {
    started: 4,
    localPassed: 3,
    reviewing: 1,
    waiting: 2,
    resubmit: 0,
    passed: 1,
    submitted: 3,
  },
};

describe("stage detail", () => {
  it("検索パラメーターの不正値は課題に戻す", () => {
    for (const value of [undefined, null, "invalid", ["outline"], 1, "tasks"])
      expect(parseStaffStageTab(value)).toBe("tasks");
    for (const value of ["outline", "learners", "materials"] as const)
      expect(parseStaffStageTab(value)).toBe(value);
  });
  it("ヒントとすべての解答例の条件を表示する", () => {
    expect(taskSupportLabel(null)).toBe("—");
    expect(taskSupportLabel({ hintLevels: 0, solutionUnlock: "never" })).toBe(
      "ヒント: なし / 解答例: 出さない",
    );
    expect(taskSupportLabel({ hintLevels: 3, solutionUnlock: "after-hints" })).toBe(
      "ヒント: 3 段 / 解答例: ヒントのあと",
    );
    expect(taskSupportLabel({ hintLevels: 1, solutionUnlock: "attempts-or-passed" })).toBe(
      `ヒント: 1 段 / 解答例: ${SOLUTION_UNLOCK_ATTEMPTS} 回か合格後`,
    );
    expect(taskSupportLabel({ hintLevels: 0, solutionUnlock: "passed" })).toBe(
      "ヒント: なし / 解答例: 合格後",
    );
  });
  it("種別・確認待ち・題か ID の条件を組み合わせて絞る", () => {
    const other: StaffStageTask = {
      ...task,
      id: "other",
      kind: "assessment-a",
      counts: { ...task.counts, waiting: 0 },
    };
    const tasks = [task, other];
    expect(
      filterStaffStageTasks(tasks, { kind: "all", waitingOnly: false, query: "  api " }),
    ).toEqual(tasks);
    expect(
      filterStaffStageTasks(tasks, { kind: "basic", waitingOnly: true, query: "MODULE" }),
    ).toEqual([task]);
    expect(
      filterStaffStageTasks(tasks, { kind: "assessment-a", waitingOnly: true, query: "" }),
    ).toEqual([]);
    expect(
      filterStaffStageTasks(tasks, { kind: "all", waitingOnly: false, query: "見つからない" }),
    ).toEqual([]);
    expect(filterStaffStageTasks(tasks, { kind: "all", waitingOnly: false, query: "  " })).toEqual(
      tasks,
    );
  });
  it("単元・レッスンを順に並べ、課題文を除外し、課題のない単元を残す", () => {
    const lesson = (id: string, order: number) => ({
      id,
      order,
      section_id: "s1",
      title: id,
      type: "text" as const,
      duration_label: null,
      video_path: null,
      pdf_path: null,
      markdown: null,
      assignment_id: null,
      total_pages: null,
      total_sec: null,
      created_at: "",
      updated_at: "",
    });
    const stage: StageWithChildren = {
      stage: {
        id: "stage",
        slug: "stage",
        title: "Stage",
        category: null,
        color: null,
        duration_hours: null,
        description: null,
        status: "published",
        created_by: null,
        created_at: "",
        updated_at: "",
      },
      sections: [
        {
          section: { id: "s2", stage_id: "stage", title: "Empty", order: 2, created_at: "" },
          lessons: [],
        },
        {
          section: { id: "s1", stage_id: "stage", title: "First", order: 1, created_at: "" },
          lessons: [lesson("later", 3), lesson("task-lesson", 2), lesson("first", 1)],
        },
      ],
    };
    const result = groupStageSections(stage, [task, { ...task, id: "another", lessonId: null }]);
    expect(result.map((s) => s.section.id)).toEqual(["s1", "s2"]);
    expect(result[0]?.lessons.map((l) => l.id)).toEqual(["first", "later"]);
    expect(result[0]?.lessonCount).toBe(3);
    expect(result[0]?.waiting).toBe(4);
    expect(result[0]?.tasks).toHaveLength(2);
    expect(result[1]?.tasks).toEqual([]);
    expect(stage.sections[0]?.section.id).toBe("s2");
    expect(stage.sections[1]?.lessons[0]?.id).toBe("later");
  });
});

describe("ステージの前提と配布資料", () => {
  it("前提の題を定義順に読点でつなぎ、空なら「なし」を出す", () => {
    expect(prerequisitesLabel([])).toBe("なし");
    expect(prerequisitesLabel([{ title: "HTML" }, { title: "CSS" }])).toBe("HTML、CSS");
  });
  it("資料を単元・レッスンごとにまとめ、API の順番と同名の別レッスンを保つ", () => {
    const material = (id: string, section: string, lesson: string): StageMaterialRow => ({
      id,
      section_title: section,
      lesson_id: lesson,
      lesson_title: "同じ題",
      file_name: id,
      size_bytes: 1024,
      mime_type: "application/pdf",
      source: "auto",
      created_by: null,
      created_at: "",
    });
    const rows = [
      material("a", "M0. 全体像", "l1"),
      material("b", "M0. 全体像", "l1"),
      material("c", "M0. 全体像", "l2"),
      material("d", "M1. 次", "l3"),
    ];
    expect(groupStageMaterials([])).toEqual([]);
    const groups = groupStageMaterials(rows);
    expect(groups.map((section) => section.title)).toEqual(["M0. 全体像", "M1. 次"]);
    expect(
      groups[0]?.lessons.map((lesson) => [lesson.id, lesson.materials.map((m) => m.id)]),
    ).toEqual([
      ["l1", ["a", "b"]],
      ["l2", ["c"]],
    ]);
    expect(groups[1]?.lessons[0]?.materials).toEqual([rows[3]]);
    expect(rows.map((m) => m.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("教材動画とレッスンの並び", () => {
  it.each([
    ["text", "video.mp4", "失敗", "none"],
    ["slides", "video.mp4", null, "published"],
    ["slides", "video.mp4", "失敗", "stale"],
    ["slides", null, "失敗", "missing"],
    ["slides", null, null, "none"],
  ] as const)("%s / %s / %s は %s", (type, video_path, video_issue, expected) => {
    expect(lessonVideoStatus({ type, video_path, video_issue })).toBe(expected);
  });
  it("理由の省略も問題なしとして扱う", () => {
    expect(lessonVideoStatus({ type: "slides", video_path: "video.mp4" })).toBe("published");
    expect(lessonVideoStatus({ type: "slides", video_path: null })).toBe("none");
  });
  const lesson = (
    id: string,
    order: number,
    video_path: string | null,
    video_issue: string | null,
  ): LessonRow => ({
    id,
    order,
    video_path,
    video_issue,
    section_id: "s1",
    title: id,
    type: "slides",
    duration_label: null,
    pdf_path: null,
    markdown: null,
    assignment_id: null,
    total_pages: null,
    total_sec: null,
    created_at: "",
    updated_at: "",
  });
  const first = lesson("first", 1, "video.mp4", null);
  const stale = lesson("stale", 2, "old.mp4", "失敗");
  const missing = lesson("missing", 3, null, "失敗");
  const last = lesson("last", 1, null, "失敗");
  const stage: StageWithChildren = {
    stage: {
      id: "stage",
      slug: "stage",
      title: "Stage",
      category: null,
      color: null,
      duration_hours: null,
      description: null,
      status: "published",
      created_by: null,
      created_at: "",
      updated_at: "",
    },
    sections: [
      {
        section: { id: "s2", stage_id: "stage", title: "Second", order: 2, created_at: "" },
        lessons: [last],
      },
      {
        section: { id: "s1", stage_id: "stage", title: "First", order: 1, created_at: "" },
        lessons: [
          missing,
          stale,
          first,
          lesson("no-script", 4, null, null),
          { ...lesson("text", 5, "video.mp4", "失敗"), type: "text" },
        ],
      },
    ],
  };
  it("単元・レッスンの順で最初の要確認を選び、対象だけを集計する", () => {
    const before = structuredClone(stage);
    expect(summarizeStageVideos(stage)).toEqual({
      total: 4,
      published: 1,
      attention: 3,
      firstAttentionLessonId: "stale",
    });
    expect(stage).toEqual(before);
    expect(summarizeStageVideos({ ...stage, sections: [] })).toEqual({
      total: 0,
      published: 0,
      attention: 0,
      firstAttentionLessonId: null,
    });
    const section = stage.sections[0];
    if (!section) throw new Error("単元がありません");
    expect(
      summarizeStageVideos({ ...stage, sections: [{ ...section, lessons: [first] }] }),
    ).toEqual({ total: 1, published: 1, attention: 0, firstAttentionLessonId: null });
  });
  it("単元をまたいで前後を求め、先頭・末尾・不在は null にする", () => {
    const before = structuredClone(stage);
    expect(adjacentStageLessons(stage, "first")).toEqual({ previous: null, next: stale });
    expect(adjacentStageLessons(stage, "stale")).toEqual({ previous: first, next: missing });
    expect(adjacentStageLessons(stage, "text").next).toEqual(last);
    expect(adjacentStageLessons(stage, "last").next).toBeNull();
    expect(adjacentStageLessons(stage, "absent")).toEqual({ previous: null, next: null });
    expect(adjacentStageLessons({ ...stage, sections: [] }, "first")).toEqual({
      previous: null,
      next: null,
    });
    expect(stage).toEqual(before);
  });
});
