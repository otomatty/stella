/**
 * 「ここから始める」の遷移先。
 *
 * ここが壊れると、星を始めた直後の遷移がレッスンを取り違える (レッスンの無い星で
 * 空の画面へ飛ぶ / 進めてある星を先頭へ引き戻す / locked のレッスンを開く)。
 */

import { describe, expect, it } from "vitest";
import type { Lesson, LessonStatus, Stage } from "@/data/types";
import type { LessonProgressMap } from "@/lib/lesson-progress";

import { startDestination } from "./start-destination";

function lesson(id: string, status: LessonStatus = "todo"): Lesson {
  return { id, title: id, type: "slides", duration: "3分", status };
}

function stageOf(id: string, sections: Stage["sections"]): Stage {
  return {
    id,
    title: id,
    category: "プログラミング",
    color: "indigo",
    lessonsCount: (sections ?? []).reduce((n, s) => n + s.lessons.length, 0),
    progress: 0,
    sections,
  };
}

const sqlBasics = stageOf("sql-basics", [
  { id: "m0", title: "M0", lessons: [lesson("a"), lesson("b")] },
  { id: "m1", title: "M1", lessons: [lesson("c")] },
]);
/** レッスンをまだ持たない「準備中」の講座。 */
const placeholder = stageOf("docker-basics", []);
const stages = [sqlBasics, placeholder];
const empty: LessonProgressMap = {};

describe("startDestination", () => {
  it("始めたばかりの星は最初のレッスンを開く", () => {
    expect(startDestination(stages, "sql-basics", empty)).toEqual({
      stage: sqlBasics,
      lessonId: "a",
    });
  });

  it("既に進めてある星は「続きから」と同じ位置を開く", () => {
    const progress: LessonProgressMap = {
      a: { completed: true, updatedAt: "2026-08-31T00:00:00.000Z" },
    };
    expect(startDestination(stages, "sql-basics", progress)?.lessonId).toBe("b");
  });

  it("レッスンを持たない星では遷移しない", () => {
    expect(startDestination(stages, "docker-basics", empty)).toBeNull();
  });

  it("全レッスンが locked の星では遷移しない (ロック行のガードを迂回しない)", () => {
    const locked = stageOf("locked-stage", [
      { id: "m0", title: "M0", lessons: [lesson("x", "locked"), lesson("y", "locked")] },
    ]);
    expect(startDestination([locked], "locked-stage", empty)).toBeNull();
  });

  it("一覧に載っていない星では遷移しない (取り直しの失敗・draft)", () => {
    expect(startDestination(stages, "unknown-stage", empty)).toBeNull();
  });
});
