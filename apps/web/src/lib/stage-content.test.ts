import { describe, expect, it } from "vitest";
import type { StageContentPayload } from "./skill-map-api";
import { hasTasksOnly, runnerLabelOf, sumStageContent } from "./stage-content";

const empty: StageContentPayload = {
  units: 0,
  videos: 0,
  texts: 0,
  knowledge_questions: 0,
  tasks: 0,
  problems: 0,
  runners: [],
  planned_hours: null,
};

describe("sumStageContent", () => {
  it("教材数と予定時間を合計し、runner を登場順に重複なく並べる", () => {
    const stage = {
      units: 1,
      videos: 2,
      texts: 3,
      knowledge_questions: 4,
      tasks: 5,
      problems: 6,
      runners: ["ts-test", "node-test"],
      planned_hours: 1.5,
    };
    expect(
      sumStageContent([
        stage,
        undefined,
        { ...stage, runners: ["node-test", "e2e"], planned_hours: 2 },
        empty,
      ]),
    ).toEqual({
      units: 2,
      videos: 4,
      texts: 6,
      knowledge_questions: 8,
      tasks: 10,
      problems: 12,
      runners: ["ts-test", "node-test", "e2e"],
      planned_hours: 3.5,
    });
  });

  it("教材数の情報が無い場合は空の合計を返す", () => {
    expect(sumStageContent([undefined])).toEqual(empty);
  });

  it("予定時間がすべて null なら null を返し、0 時間は合計する", () => {
    expect(sumStageContent([empty, { ...empty, tasks: 1 }]).planned_hours).toBeNull();
    expect(sumStageContent([empty, { ...empty, planned_hours: 0 }]).planned_hours).toBe(0);
  });
});

describe("hasTasksOnly", () => {
  it("動画とまとめが無く、課題があるステージを判定する", () => {
    const taskStage = { ...empty, tasks: 1, knowledge_questions: 2 };
    expect(hasTasksOnly(taskStage)).toBe(true);
    expect(hasTasksOnly({ ...taskStage, videos: 1 })).toBe(false);
    expect(hasTasksOnly({ ...taskStage, texts: 1 })).toBe(false);
    expect(hasTasksOnly(empty)).toBe(false);
  });
});

describe("runnerLabelOf", () => {
  it("登録済みの runner は表示名を返し、未知の runner は ID を返す", () => {
    expect(runnerLabelOf("ts-test")).toBe("TypeScript のテスト");
    expect(runnerLabelOf("future-runner")).toBe("future-runner");
  });
});
