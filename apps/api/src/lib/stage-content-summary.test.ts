import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type Db, getDb } from "../db/client.js";
import {
  lessons,
  quizQuestions,
  quizzes,
  sections,
  stages,
  taskProblemSteps,
  tasks,
  tenants,
} from "../db/schema.js";
import type { Env } from "../env.js";
import { sqliteD1 } from "../testing/sqlite-d1.js";
import { loadStageContentSummaries } from "./stage-content-summary.js";

describe("loadStageContentSummaries", () => {
  let database: ReturnType<typeof sqliteD1>;
  let db: Db;

  beforeEach(async () => {
    database = sqliteD1();
    db = getDb({ DB: database.binding } as Env);
    await db.insert(tenants).values({ id: "ses", name: "SES" });
  });

  afterEach(() => database.sqlite.close());

  it("教材の種類と課題の定義をステージごとに集計する", async () => {
    await db.insert(stages).values([
      { id: "stage", slug: "stage", title: "教材あり", durationHours: 2.5 },
      { id: "empty", slug: "empty", title: "教材なし", durationHours: 1 },
    ]);
    await db.insert(sections).values([
      { id: "unit", stageId: "stage", title: "教材のある単元" },
      { id: "unit-empty", stageId: "stage", title: "教材のない単元" },
    ]);

    const lesson = { sectionId: "unit" };
    await db.insert(lessons).values([
      { ...lesson, id: "video", title: "動画", type: "video" },
      {
        ...lesson,
        id: "slides-video",
        title: "動画付きスライド",
        type: "slides",
        videoPath: "lesson.mp4",
      },
      { ...lesson, id: "slides", title: "スライド", type: "slides" },
      { ...lesson, id: "doc", title: "まとめ", type: "text" },
      { ...lesson, id: "task-doc", title: "課題文", type: "text" },
      { ...lesson, id: "inactive-doc", title: "休止中の課題文", type: "text" },
      { ...lesson, id: "step", title: "課題の問題ページ", type: "text" },
      { ...lesson, id: "knowledge", title: "知識問題", type: "quiz" },
      { ...lesson, id: "practice", title: "旧形式のクイズ", type: "quiz" },
    ]);
    await db.insert(quizzes).values([
      { id: "knowledge-quiz", lessonId: "knowledge", source: "knowledge" },
      { id: "practice-quiz", lessonId: "practice", source: "practice" },
    ]);
    await db.insert(quizQuestions).values([
      { quizId: "knowledge-quiz", kind: "single" },
      { quizId: "knowledge-quiz", kind: "multiple" },
      { quizId: "practice-quiz", kind: "single" },
    ]);

    const task = {
      sectionId: "unit",
      title: "課題",
      kind: "practice",
      pattern: "sample",
      estimatedMinutes: 10,
      order: 0,
      contentHash: "hash",
      bundle: "",
    };
    await db.insert(tasks).values([
      {
        ...task,
        id: "one",
        lessonId: "task-doc",
        definition: '{"runner":"ts-test","problems":[{},{}]}',
      },
      { ...task, id: "two", definition: '{"runner":"ts-test","problems":[{}]}' },
      { ...task, id: "three", definition: '{"runner":"dom-test"}' },
      { ...task, id: "broken", definition: '{"runner":' },
      { ...task, id: "wrong-type", definition: '{"runner":false,"problems":{}}' },
      {
        ...task,
        id: "variant",
        variantOf: "one",
        definition: '{"runner":"next-build","problems":[{}]}',
      },
      {
        ...task,
        id: "inactive",
        lessonId: "inactive-doc",
        active: false,
        definition: '{"runner":"dotnet-test","problems":[{}]}',
      },
    ]);
    await db.insert(taskProblemSteps).values({
      taskId: "one",
      problemId: "p01",
      stepLessonId: "step",
      afterLessonId: "slides-video",
      position: 0,
    });

    const summaries = await loadStageContentSummaries(db);

    expect(summaries.get("stage")).toEqual({
      units: 2,
      videos: 2,
      texts: 1,
      knowledgeQuestions: 2,
      tasks: 5,
      problems: 3,
      runners: ["dom-test", "ts-test"],
      plannedHours: 2.5,
    });
    expect(summaries.get("empty")).toEqual({
      units: 0,
      videos: 0,
      texts: 0,
      knowledgeQuestions: 0,
      tasks: 0,
      problems: 0,
      runners: [],
      plannedHours: 1,
    });
  });

  it("空の id 配列では DB を読まない", async () => {
    const prepare = vi.spyOn(database.binding, "prepare");

    expect(await loadStageContentSummaries(db, [])).toEqual(new Map());
    expect(prepare).not.toHaveBeenCalled();
  });

  it("指定されたステージだけを 90 件ずつに分けて読む", async () => {
    const ids = Array.from({ length: 105 }, (_, index) => `stage-${index}`);
    for (const id of [...ids, "other"]) {
      await db.insert(stages).values({ id, slug: id, title: id });
    }
    const prepare = vi.spyOn(database.binding, "prepare");

    const summaries = await loadStageContentSummaries(db, ids);

    expect(new Set(summaries.keys())).toEqual(new Set(ids));
    expect(summaries.get("stage-104")?.plannedHours).toBeNull();
    const bindCounts = prepare.mock.calls.map(([query]) => query.match(/\?/g)?.length ?? 0);
    expect(bindCounts.sort((a, b) => a - b)).toEqual([15, 15, 16, 16, 90, 90, 91, 91]);
  });
});
