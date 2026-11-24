import { describe, expect, it } from "vitest";
import { stageProgressPercent } from "./stage-progress.js";

describe("stageProgressPercent", () => {
  it.each([
    { completed: false, lessonsTotal: 0, lessonsDone: 0, tasksTotal: 0, tasksPassed: 0, want: 0 },
    { completed: false, lessonsTotal: 0, lessonsDone: 0, tasksTotal: 2, tasksPassed: 2, want: 0 },
    { completed: true, lessonsTotal: 0, lessonsDone: 0, tasksTotal: 0, tasksPassed: 0, want: 100 },
    { completed: false, lessonsTotal: 2, lessonsDone: 2, tasksTotal: 1, tasksPassed: 1, want: 100 },
    {
      completed: false,
      lessonsTotal: 999,
      lessonsDone: 999,
      tasksTotal: 1,
      tasksPassed: 0,
      want: 99,
    },
    { completed: false, lessonsTotal: 2, lessonsDone: 1, tasksTotal: 1, tasksPassed: 9, want: 66 },
    { completed: false, lessonsTotal: 2, lessonsDone: 1, tasksTotal: 1, tasksPassed: -1, want: 33 },
  ])(
    "returns $want for $lessonsDone/$lessonsTotal lessons and $tasksPassed/$tasksTotal tasks (completed=$completed)",
    ({ want, ...input }) => {
      expect(stageProgressPercent(input)).toBe(want);
    },
  );
});
