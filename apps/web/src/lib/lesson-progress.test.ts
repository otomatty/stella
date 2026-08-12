/**
 * 「続きから」 の再開位置の判定。 ここが壊れると受講者は毎回コース先頭に戻される
 * (TypeScript 入門研修は 246 レッスンあるので、 実質やり直しになる)。
 */

import { describe, expect, it } from "vitest";
import type { Course, Lesson, LessonStatus } from "@/data/types";
import {
  findNextLesson,
  resumeLessonId,
  type LessonProgressMap,
} from "@/lib/lesson-progress";

function lesson(id: string, status: LessonStatus = "todo"): Lesson {
  return { id, title: id, type: "slides", duration: "3分", status };
}

const course: Course = {
  id: "typescript-basics",
  title: "TypeScript 入門研修",
  category: "プログラミング",
  color: "indigo",
  lessonsCount: 4,
  progress: 0,
  sections: [
    { id: "m0", title: "M0", lessons: [lesson("a"), lesson("b")] },
    { id: "m1", title: "M1", lessons: [lesson("c"), lesson("d")] },
  ],
};

const done = (updatedAt = "2026-08-12T00:00:00.000Z") => ({
  completed: true,
  updatedAt,
});

describe("findNextLesson", () => {
  it("何も完了していなければ先頭レッスン", () => {
    expect(findNextLesson(course, {})?.lesson.id).toBe("a");
  });

  it("完了済みを飛ばして最初の未完了を返す", () => {
    const map: LessonProgressMap = { a: done(), b: done() };
    const next = findNextLesson(course, map);
    expect(next?.lesson.id).toBe("c");
    // 表示用の番号もセクションをまたいで通しで数える
    expect(next?.sectionNumber).toBe(2);
    expect(next?.lessonNumber).toBe(3);
  });

  it("途中まで閲覧しただけ (未完了) のレッスンはそこを再開位置にする", () => {
    const map: LessonProgressMap = {
      a: done(),
      b: { completed: false, lastPage: 3, viewedPages: [1, 2, 3], updatedAt: "2026-08-12T00:00:00.000Z" },
    };
    expect(findNextLesson(course, map)?.lesson.id).toBe("b");
  });

  it("locked は再開位置にしない", () => {
    const locked: Course = {
      ...course,
      sections: [{ id: "m0", title: "M0", lessons: [lesson("a", "locked"), lesson("b")] }],
    };
    expect(findNextLesson(locked, {})?.lesson.id).toBe("b");
  });

  it("全完了なら null", () => {
    const map: LessonProgressMap = { a: done(), b: done(), c: done(), d: done() };
    expect(findNextLesson(course, map)).toBeNull();
  });

  it("レッスンが無いコース / undefined は null", () => {
    expect(findNextLesson(undefined, {})).toBeNull();
    expect(findNextLesson({ ...course, sections: [] }, {})).toBeNull();
  });
});

describe("resumeLessonId", () => {
  it("未完了があればそこ", () => {
    expect(resumeLessonId(course, { a: done() })).toBe("b");
  });

  it("全完了なら先頭へ戻す (ボタンを死なせない)", () => {
    const map: LessonProgressMap = { a: done(), b: done(), c: done(), d: done() };
    expect(resumeLessonId(course, map)).toBe("a");
  });

  it("先頭が locked でも完了済みの非 locked があればそこへ戻す", () => {
    const mixed: Course = {
      ...course,
      sections: [
        {
          id: "m0",
          title: "M0",
          lessons: [lesson("a", "locked"), lesson("b"), lesson("c")],
        },
      ],
    };
    const map: LessonProgressMap = { b: done(), c: done() };
    expect(resumeLessonId(mixed, map)).toBe("b");
  });

  it("すべて locked なら null (ロック行ガードを迂回しない)", () => {
    const locked: Course = {
      ...course,
      sections: [
        {
          id: "m0",
          title: "M0",
          lessons: [lesson("a", "locked"), lesson("b", "locked")],
        },
      ],
    };
    expect(resumeLessonId(locked, {})).toBeNull();
  });

  it("レッスンが無ければ null", () => {
    expect(resumeLessonId({ ...course, sections: [] }, {})).toBeNull();
  });
});
