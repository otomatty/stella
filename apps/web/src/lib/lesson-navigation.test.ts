/**
 * レッスンの前後移動の解決。
 *
 * ここが壊れると、 レッスン画面の前後ナビと完了直後の「次のレッスンへ」が
 * 誤った移動先を出す (locked を飛ばす / セクションの区切りを見落とす)。
 */

import type { TaskSummary } from "@stella/shared/tasks/catalog";
import type { TaskProblemStepSummary } from "@stella/shared/tasks/problem-steps";
import { describe, expect, it } from "vitest";
import type { Stage, Lesson, LessonStatus } from "@/data/types";
import type { LessonProgressMap } from "@/lib/lesson-progress";
import { flattenLessonNodes, resolveLessonNeighbors } from "@/lib/lesson-navigation";
import { presentStageProblems, problemLessonsById } from "@/lib/problem-lesson";

function lesson(id: string, status: LessonStatus = "todo"): Lesson {
  return { id, title: id, type: "slides", duration: "3分", status };
}

const stage: Stage = {
  id: "typescript-basics",
  title: "TypeScript 入門",
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
    const nodes = flattenLessonNodes(stage);
    expect(nodes.map((n) => n.lesson.id)).toEqual(["a", "b", "c", "d"]);
    expect(nodes.map((n) => n.position)).toEqual([1, 2, 3, 4]);
    expect(nodes[2]?.section.id).toBe("m1");
  });

  it("ステージ未指定 / セクション無しでは空", () => {
    expect(flattenLessonNodes(undefined)).toEqual([]);
    expect(flattenLessonNodes({ ...stage, sections: [] })).toEqual([]);
  });
});

describe("resolveLessonNeighbors", () => {
  it("同じセクション内の隣を返す", () => {
    const n = resolveLessonNeighbors(stage, "a", empty);
    expect(n.prev).toBeNull();
    expect(n.next?.lesson.id).toBe("b");
    expect(n.nextStartsNewSection).toBe(false);
    expect(n.current?.position).toBe(1);
    expect(n.total).toBe(4);
  });

  it("セクションを跨ぐ移動には区切りの印を付ける", () => {
    const n = resolveLessonNeighbors(stage, "b", empty);
    expect(n.next?.lesson.id).toBe("c");
    expect(n.nextStartsNewSection).toBe(true);
    expect(n.prev?.lesson.id).toBe("a");
  });

  it("最後のレッスンでは next が null", () => {
    const n = resolveLessonNeighbors(stage, "d", empty);
    expect(n.next).toBeNull();
    expect(n.nextStartsNewSection).toBe(false);
    expect(n.prev?.lesson.id).toBe("c");
  });

  it("locked でも隣のレッスンを返す", () => {
    const locked: Stage = {
      ...stage,
      sections: [
        { id: "m0", title: "M0", lessons: [lesson("a"), lesson("b", "locked")] },
        { id: "m1", title: "M1", lessons: [lesson("c", "locked"), lesson("d")] },
      ],
    };
    const n = resolveLessonNeighbors(locked, "a", empty);
    expect(n.next?.lesson.id).toBe("b");
    expect(n.nextLocked).toBe(true);
    expect(n.nextBlockedBy).toBeNull();
    expect(n.nextStartsNewSection).toBe(false);
    const back = resolveLessonNeighbors(locked, "d", empty);
    expect(back.prev?.lesson.id).toBe("c");
    expect(back.prevLocked).toBe(true);
  });

  it("先が locked でも next はそのレッスン", () => {
    const locked: Stage = {
      ...stage,
      sections: [{ id: "m0", title: "M0", lessons: [lesson("a"), lesson("b", "locked")] }],
    };
    const n = resolveLessonNeighbors(locked, "a", empty);
    expect(n.next?.lesson.id).toBe("b");
    expect(n.nextLocked).toBe(true);
  });

  it("ロック中の次を飛ばさず、nextBlockedBy が止めているレッスンを指す", () => {
    const video = { ...lesson("video"), type: "video" as const, title: "関数の返り値" };
    const q1 = { ...lesson("q1"), title: "問1" };
    const q2 = { ...lesson("q2"), title: "問2" };
    const later = { ...lesson("later"), title: "その先" };
    const problemStage: Stage = {
      ...stage,
      sections: [{ id: "m0", title: "M0", lessons: [video, q1, q2, later] }],
    };
    const step = (id: string, stepLessonId: string): TaskProblemStepSummary => ({
      id,
      title: id,
      label: id,
      stepLessonId,
      afterLessonId: "server-after",
      afterTitle: "サーバーの題",
      state: "locked-video",
    });
    const tasks: TaskSummary[] = [
      {
        id: "task",
        sectionId: "s",
        title: "課題",
        kind: "basic",
        pattern: "p",
        skills: { uses: [], assesses: [] },
        estimatedMinutes: 10,
        status: "not-started",
        lessonId: null,
        problems: [step("p1", "q1"), step("p2", "q2")],
      },
    ];
    const doneVideo: LessonProgressMap = {
      video: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
    };
    const lockedProblems = problemLessonsById(presentStageProblems(tasks, problemStage, {}));
    const fromVideo = resolveLessonNeighbors(problemStage, "video", {}, lockedProblems);
    expect(fromVideo.next?.lesson.id).toBe("q1");
    expect(fromVideo.nextLocked).toBe(true);
    expect(fromVideo.nextBlockedBy?.lesson.id).toBe("video");
    expect(fromVideo.nextLockReason).toBe("「関数の返り値」を終えると解けます");

    const opened = problemLessonsById(presentStageProblems(tasks, problemStage, doneVideo));
    const fromDoneVideo = resolveLessonNeighbors(problemStage, "video", doneVideo, opened);
    expect(fromDoneVideo.next?.lesson.id).toBe("q1");
    expect(fromDoneVideo.nextLocked).toBe(false);
    expect(fromDoneVideo.nextBlockedBy).toBeNull();

    const fromQ1 = resolveLessonNeighbors(problemStage, "q1", doneVideo, opened);
    expect(fromQ1.next?.lesson.id).toBe("q2");
    expect(fromQ1.nextLocked).toBe(true);
    expect(fromQ1.nextBlockedBy?.lesson.id).toBe("q1");
    expect(fromQ1.nextLockReason).toBe("「問1」を提出すると解けます");
  });

  it("進捗で解禁された locked ではないレッスンは status を進捗ストアで解決する", () => {
    // fixture が todo でも進捗が付いていれば active。 どちらも locked ではないので移動先になる。
    const map: LessonProgressMap = {
      b: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
    };
    expect(resolveLessonNeighbors(stage, "a", map).next?.lesson.id).toBe("b");
  });

  it("ステージに無いレッスン ID では前後とも null", () => {
    const n = resolveLessonNeighbors(stage, "zzz", empty);
    expect(n.current).toBeNull();
    expect(n.prev).toBeNull();
    expect(n.next).toBeNull();
    expect(n.total).toBe(4);
  });

  it("完了フラグは 「先が無い」 ではなく実際の done 件数で立つ", () => {
    // 途中 (a) を残したままステージ末尾 (d) だけ終えた状態。 next は無いが全完了ではない。
    const skipped: LessonProgressMap = {
      b: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
      c: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
      d: { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
    };
    const n = resolveLessonNeighbors(stage, "d", skipped);
    expect(n.next).toBeNull();
    expect(n.stageComplete).toBe(false);
    // 同じ理由で、 セクションに未完了が残っていればセクション完了にもしない。
    expect(resolveLessonNeighbors(stage, "b", skipped).nextStartsNewSection).toBe(true);
    expect(resolveLessonNeighbors(stage, "b", skipped).currentSectionComplete).toBe(false);
  });

  it("全件 done ならステージ完了・セクション完了が立つ", () => {
    const all: LessonProgressMap = Object.fromEntries(
      ["a", "b", "c", "d"].map((id) => [
        id,
        { completed: true, updatedAt: "2026-08-12T00:00:00.000Z" },
      ]),
    );
    const n = resolveLessonNeighbors(stage, "d", all);
    expect(n.stageComplete).toBe(true);
    expect(n.currentSectionComplete).toBe(true);
    // セクション区切りでも、 そのセクションが埋まっていればセクション完了。
    expect(resolveLessonNeighbors(stage, "b", all).currentSectionComplete).toBe(true);
  });

  it("locked が残るセクション / ステージは完了にしない", () => {
    const locked: Stage = {
      ...stage,
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
    expect(n.stageComplete).toBe(false);
  });

  it("レッスンが無いステージでは総数 0", () => {
    expect(resolveLessonNeighbors({ ...stage, sections: [] }, "a", empty).total).toBe(0);
    expect(resolveLessonNeighbors(undefined, "a", empty).total).toBe(0);
  });
});
