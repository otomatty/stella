/**
 * 「続きから」 の再開位置の判定と、 進捗マージの単調性。
 *
 * 前者が壊れると受講者は毎回コース先頭に戻され (TypeScript 入門研修は 246 レッスン
 * あるので実質やり直し)、 後者が壊れると完了済みの進捗が黙って消える。
 */

import { describe, expect, it } from "vitest";
import type { Course, Lesson, LessonStatus } from "@/data/types";
import {
  deriveCourseProgress,
  findNextLesson,
  mergeEntries,
  resolveLessonStatus,
  resumeLessonId,
  type LessonProgressEntry,
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

describe("mergeEntries", () => {
  it("完了は取り消されない (新しい未完了で古い完了を潰さない)", () => {
    // ログイン直後、 サーバ進捗の取り込み前にレッスンを開いた瞬間の記録は
    // サーバより新しい updatedAt を持つ。 丸ごと置き換えると完了が消える。
    const server = { completed: true, lastPage: 5, updatedAt: "2026-08-01T00:00:00.000Z" };
    const local = { completed: false, lastPage: 1, updatedAt: "2026-08-02T00:00:00.000Z" };
    expect(mergeEntries(server, local)?.completed).toBe(true);
  });

  it("閲覧ページは和集合になる", () => {
    const a = { completed: false, viewedPages: [1, 2], updatedAt: "2026-08-01T00:00:00.000Z" };
    const b = { completed: false, viewedPages: [3, 1], updatedAt: "2026-08-02T00:00:00.000Z" };
    expect(mergeEntries(a, b)?.viewedPages).toEqual([1, 2, 3]);
  });

  it("視聴秒数は最大値を採る (古い側が大きくても縮まない)", () => {
    const a = { completed: false, watchedSec: 120, updatedAt: "2026-08-02T00:00:00.000Z" };
    const b = { completed: false, watchedSec: 30, updatedAt: "2026-08-03T00:00:00.000Z" };
    expect(mergeEntries(a, b)?.watchedSec).toBe(120);
  });

  it("最終ページは updatedAt が新しい側を採る (単調ではないため)", () => {
    const older = { completed: false, lastPage: 2, updatedAt: "2026-08-01T00:00:00.000Z" };
    const newer = { completed: false, lastPage: 7, updatedAt: "2026-08-05T00:00:00.000Z" };
    expect(mergeEntries(older, newer)?.lastPage).toBe(7);
    expect(mergeEntries(newer, older)?.lastPage).toBe(7);
  });

  it("片側だけならそのまま返す", () => {
    const only: LessonProgressEntry = done();
    expect(mergeEntries(undefined, only)).toBe(only);
    expect(mergeEntries(only, undefined)).toBe(only);
    expect(mergeEntries(undefined, undefined)).toBeUndefined();
  });
});

describe("resolveLessonStatus / deriveCourseProgress", () => {
  it("エントリだけあるレッスンは active (読みかけが残る)", () => {
    const entry: LessonProgressEntry = {
      completed: false,
      updatedAt: "2026-08-01T00:00:00.000Z",
    };
    expect(resolveLessonStatus(lesson("a"), { a: entry })).toBe("active");
  });

  it("完了数から進捗率を出す", () => {
    expect(deriveCourseProgress(course, { a: done() }).progress).toBe(25);
  });
});
