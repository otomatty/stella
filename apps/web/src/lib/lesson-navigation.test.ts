/**
 * レッスンの前後移動の解決。
 *
 * ここが壊れると、 レッスン画面の前後ナビと完了直後の「次のレッスンへ」が
 * 誤った移動先を出す (locked を開こうとする / セクションの区切りを見落とす)。
 */

import { describe, expect, it } from "vitest";
import type { Course, Lesson, LessonStatus } from "@/data/types";
import type { LessonProgressMap } from "@/lib/lesson-progress";
import { flattenLessonNodes, resolveLessonNeighbors } from "@/lib/lesson-navigation";

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

const empty: LessonProgressMap = {};

describe("flattenLessonNodes", () => {
  it("セクションを跨いで通し番号を振る", () => {
    const nodes = flattenLessonNodes(course);
    expect(nodes.map((n) => n.lesson.id)).toEqual(["a", "b", "c", "d"]);
    expect(nodes.map((n) => n.position)).toEqual([1, 2, 3, 4]);
    expect(nodes[2]?.section.id).toBe("m1");
  });

  it("コース未指定 / セクション無しでは空", () => {
    expect(flattenLessonNodes(undefined)).toEqual([]);
    expect(flattenLessonNodes({ ...course, sections: [] })).toEqual([]);
  });
});

describe("resolveLessonNeighbors", () => {
  it("同じセクション内の隣を返す", () => {
    const n = resolveLessonNeighbors(course, "a", empty);
    expect(n.prev).toBeNull();
    expect(n.next?.lesson.id).toBe("b");
    expect(n.nextStartsNewSection).toBe(false);
    expect(n.current?.position).toBe(1);
    expect(n.total).toBe(4);
  });

  it("セクションを跨ぐ移動には区切りの印を付ける", () => {
    const n = resolveLessonNeighbors(course, "b", empty);
    expect(n.next?.lesson.id).toBe("c");
    expect(n.nextStartsNewSection).toBe(true);
    expect(n.prev?.lesson.id).toBe("a");
  });

  it("最後のレッスンでは next が null", () => {
    const n = resolveLessonNeighbors(course, "d", empty);
    expect(n.next).toBeNull();
    expect(n.nextStartsNewSection).toBe(false);
    expect(n.prev?.lesson.id).toBe("c");
  });

  it("locked は飛ばして解禁済みの隣へ寄せる", () => {
    const locked: Course = {
      ...course,
      sections: [
        { id: "m0", title: "M0", lessons: [lesson("a"), lesson("b", "locked")] },
        { id: "m1", title: "M1", lessons: [lesson("c", "locked"), lesson("d")] },
      ],
    };
    const n = resolveLessonNeighbors(locked, "a", empty);
    expect(n.next?.lesson.id).toBe("d");
    // 飛んだ先が別セクションなら区切り扱いになる。
    expect(n.nextStartsNewSection).toBe(true);
    expect(resolveLessonNeighbors(locked, "d", empty).prev?.lesson.id).toBe("a");
  });

  it("先が locked しか無ければ next は null", () => {
    const locked: Course = {
      ...course,
      sections: [{ id: "m0", title: "M0", lessons: [lesson("a"), lesson("b", "locked")] }],
    };
    expect(resolveLessonNeighbors(locked, "a", empty).next).toBeNull();
  });

  it("進捗で解禁された locked ではないレッスンは status を進捗ストアで解決する", () => {
    // fixture が todo でも進捗が付いていれば active。 どちらも locked ではないので移動先になる。
    const map: LessonProgressMap = {
      b: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
    };
    expect(resolveLessonNeighbors(course, "a", map).next?.lesson.id).toBe("b");
  });

  it("コースに無いレッスン ID では前後とも null", () => {
    const n = resolveLessonNeighbors(course, "zzz", empty);
    expect(n.current).toBeNull();
    expect(n.prev).toBeNull();
    expect(n.next).toBeNull();
    expect(n.total).toBe(4);
  });

  it("完了フラグは 「先が無い」 ではなく実際の done 件数で立つ", () => {
    // 途中 (a) を残したままコース末尾 (d) だけ終えた状態。 next は無いが全完了ではない。
    const skipped: LessonProgressMap = {
      b: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
      c: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
      d: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
    };
    const n = resolveLessonNeighbors(course, "d", skipped);
    expect(n.next).toBeNull();
    expect(n.courseComplete).toBe(false);
    // 同じ理由で、 セクションに未完了が残っていればセクション完了にもしない。
    expect(resolveLessonNeighbors(course, "b", skipped).nextStartsNewSection).toBe(true);
    expect(resolveLessonNeighbors(course, "b", skipped).currentSectionComplete).toBe(false);
  });

  it("全件 done ならコース完了・セクション完了が立つ", () => {
    const all: LessonProgressMap = Object.fromEntries(
      ["a", "b", "c", "d"].map((id) => [
        id,
        { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
      ]),
    );
    const n = resolveLessonNeighbors(course, "d", all);
    expect(n.courseComplete).toBe(true);
    expect(n.currentSectionComplete).toBe(true);
    // セクション区切りでも、 そのセクションが埋まっていればセクション完了。
    expect(resolveLessonNeighbors(course, "b", all).currentSectionComplete).toBe(true);
  });

  it("locked が残るセクション / コースは完了にしない", () => {
    const locked: Course = {
      ...course,
      sections: [
        { id: "m0", title: "M0", lessons: [lesson("a"), lesson("b", "locked")] },
        { id: "m1", title: "M1", lessons: [lesson("c"), lesson("d")] },
      ],
    };
    const map: LessonProgressMap = Object.fromEntries(
      ["a", "c", "d"].map((id) => [id, { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" }]),
    );
    const n = resolveLessonNeighbors(locked, "a", map);
    expect(n.currentSectionComplete).toBe(false);
    expect(n.courseComplete).toBe(false);
  });

  it("レッスンが無いコースでは総数 0", () => {
    expect(resolveLessonNeighbors({ ...course, sections: [] }, "a", empty).total).toBe(0);
    expect(resolveLessonNeighbors(undefined, "a", empty).total).toBe(0);
  });
});
