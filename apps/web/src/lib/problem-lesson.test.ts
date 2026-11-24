import type { TaskSummary } from "@stella/shared/tasks/catalog";
import type { ProblemStepState, TaskProblemStepSummary } from "@stella/shared/tasks/problem-steps";
import { describe, expect, it } from "vitest";
import type { Lesson, LessonStatus, Stage } from "@/data/types";
import { presentStageProblems, problemLockReason } from "./problem-lesson";

function lesson(
  id: string,
  type: Lesson["type"],
  title: string,
  status: LessonStatus = "todo",
): Lesson {
  return { id, title, type, duration: "3分", status };
}

function problem(
  id: string,
  stepLessonId: string,
  state: ProblemStepState,
): TaskProblemStepSummary {
  return {
    id,
    title: id,
    label: id,
    stepLessonId,
    afterLessonId: "server-after",
    afterTitle: "サーバーの題",
    state,
  };
}

function task(problems: TaskProblemStepSummary[]): TaskSummary {
  return {
    id: "task",
    sectionId: "s",
    title: "課題",
    kind: "basic",
    pattern: "p",
    skills: { uses: [], assesses: [] },
    estimatedMinutes: 10,
    status: "not-started",
    lessonId: null,
    problems,
  };
}

const stage: Stage = {
  id: "stage",
  title: "ステージ",
  category: "プログラミング",
  color: "indigo",
  lessonsCount: 4,
  progress: 0,
  sections: [
    {
      id: "m",
      title: "M",
      lessons: [
        lesson("note", "text", "はじめに"),
        lesson("video", "video", "関数の返り値"),
        lesson("q1", "text", "問1"),
        lesson("q2", "text", "問2"),
      ],
    },
  ],
};

describe("presentStageProblems", () => {
  it("サーバーが locked-video でも、手元で前の動画が完了していれば問題は開いている", () => {
    const presented = presentStageProblems(
      [task([problem("p1", "q1", "locked-video"), problem("p2", "q2", "locked-video")])],
      stage,
      { video: { completed: true } },
    );
    const first = presented?.[0]?.problems?.[0];
    expect(first?.state).toBe("open");
    expect(first?.blocking).toBeNull();
    expect(problemLockReason(first)).toBeUndefined();
  });

  it("前の問題が未提出なら、次の問題はロック中で理由に前の問題の題名が出る", () => {
    const presented = presentStageProblems(
      [task([problem("p1", "q1", "locked-video"), problem("p2", "q2", "open")])],
      stage,
      { video: { completed: true } },
    );
    const second = presented?.[0]?.problems?.[1];
    expect(second?.state).toBe("locked-previous");
    expect(second?.blocking).toMatchObject({ id: "q1", kind: "problem", title: "問1" });
    expect(problemLockReason(second)).toBe("「問1」を提出すると解けます");
  });

  it("進捗マップが空でも、レッスン status が done なら動画は終わっている", () => {
    const doneStage: Stage = {
      ...stage,
      sections: [
        {
          id: "m",
          title: "M",
          lessons: [lesson("video", "video", "関数の返り値", "done"), lesson("q1", "text", "問1")],
        },
      ],
    };
    const presented = presentStageProblems(
      [task([problem("p1", "q1", "locked-video")])],
      doneStage,
      {},
    );
    expect(presented?.[0]?.problems?.[0]?.state).toBe("open");
  });

  it("提出済みの問題は、前の教材が未完了でも提出済み", () => {
    const presented = presentStageProblems([task([problem("p1", "q1", "submitted")])], stage, {});
    expect(presented?.[0]?.problems?.[0]?.state).toBe("submitted");
    expect(problemLockReason(presented?.[0]?.problems?.[0])).toBeUndefined();
  });

  it("ステージが無いときはサーバーの state と afterTitle で理由を作る", () => {
    const tasks = [
      task([problem("p1", "q1", "locked-video"), problem("p2", "q2", "locked-previous")]),
    ];
    expect(presentStageProblems(tasks, undefined, {})).toBe(tasks);
    expect(problemLockReason(tasks[0]?.problems?.[0])).toBe("「サーバーの題」を終えると解けます");
    expect(problemLockReason(tasks[0]?.problems?.[1])).toBe("「サーバーの題」を提出すると解けます");
  });
});
