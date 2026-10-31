import { describe, expect, it } from "vitest";

import type { Stage } from "@/data/types";

import { applyTaskCounts } from "./stages-source";

const stage = (id: string, over: Partial<Stage> = {}): Stage => ({
  id,
  title: id,
  category: "基礎",
  color: "slate",
  lessonsCount: 4,
  progress: 0,
  tasksCount: 1,
  tasksPassed: 0,
  ...over,
});

describe("applyTaskCounts", () => {
  it("課題の一部に合格したら、その星の合格数だけを差し替える", () => {
    const before = [stage("a", { tasksCount: 2 }), stage("b")];
    const after = applyTaskCounts(before, [
      { stage_id: "a", tasks_total: 2, tasks_passed: 1 },
      { stage_id: "b", tasks_total: 1, tasks_passed: 0 },
    ]);
    expect(after[0]).toMatchObject({ id: "a", tasksCount: 2, tasksPassed: 1 });
    // 変わらなかった星は同じオブジェクト (再描画を起こさない)。
    expect(after[1]).toBe(before[1]);
  });

  it("何も変わらなければ同じ配列を返す", () => {
    const before = [stage("a")];
    expect(applyTaskCounts(before, [{ stage_id: "a", tasks_total: 1, tasks_passed: 0 }])).toBe(
      before,
    );
  });

  it("受講登録の無い星・数を返さない古い API の行は触らない", () => {
    const before = [stage("a", { tasksPassed: 1 })];
    expect(applyTaskCounts(before, [])).toBe(before);
    expect(applyTaskCounts(before, [{ stage_id: "a" }])).toBe(before);
  });
});
