import type { RunStepResult } from "@stella/shared/tasks/run-result";
import { describe, expect, it } from "vitest";
import {
  applyRunProgress,
  checkProgressLabel,
  checkProgressShortLabel,
  currentCheckStep,
  emptyCheckProgress,
  finishedCheckSteps,
} from "./task-check-progress.js";

const testStep = { id: "test", label: "テスト (Vitest)" } as const;
const filesStep = { id: "files", label: "提出するファイルの確認" } as const;

describe("課題の確認の進捗", () => {
  it("計画の前と開始待ちには表示する手順がない", () => {
    const empty = emptyCheckProgress();
    const planned = applyRunProgress(empty, { type: "plan", steps: [testStep] });
    for (const progress of [empty, planned]) {
      expect(currentCheckStep(progress)).toBeUndefined();
      expect(checkProgressLabel(progress)).toBeUndefined();
      expect(checkProgressShortLabel(progress)).toBeUndefined();
      expect(finishedCheckSteps(progress)).toBe(0);
    }
    expect(empty.steps).toEqual([]);
    expect(planned.steps).toEqual([{ label: testStep.label, status: "pending" }]);
  });

  it("実行中の手順を優先し、終了後は最後に終わった手順を表示する", () => {
    const planned = applyRunProgress(emptyCheckProgress(), {
      type: "plan",
      steps: [testStep, filesStep],
    });
    const first = applyRunProgress(planned, { type: "step-start", index: 0 });
    expect(currentCheckStep(first)).toEqual({ index: 0, total: 2, label: testStep.label });
    expect(checkProgressLabel(first)).toBe("1/2 テスト (Vitest)");
    expect(checkProgressShortLabel(first)).toBe("1/2 テスト");
    expect(finishedCheckSteps(first)).toBe(0);

    const step: RunStepResult = { ...testStep, status: "passed", durationMs: 12, summary: "合格" };
    const finished = applyRunProgress(first, { type: "step-finish", index: 0, step });
    expect(finished.steps[0]).toEqual({ label: testStep.label, status: "passed", durationMs: 12 });
    expect(checkProgressLabel(finished)).toBe("1/2 テスト (Vitest)");
    expect(finishedCheckSteps(finished)).toBe(1);

    const second = applyRunProgress(finished, { type: "step-start", index: 1 });
    expect(checkProgressLabel(second)).toBe("2/2 提出するファイルの確認");
    expect(planned.steps.map(({ status }) => status)).toEqual(["pending", "pending"]);
    expect(first.steps.map(({ status }) => status)).toEqual(["running", "pending"]);
    expect(finished.steps.map(({ status }) => status)).toEqual(["passed", "pending"]);
  });

  it.each(["passed", "failed", "error", "skipped"] as const)("%s を終了として数える", (status) => {
    const planned = applyRunProgress(emptyCheckProgress(), { type: "plan", steps: [testStep] });
    const step: RunStepResult = { ...testStep, status, durationMs: 0, summary: "" };
    const finished = applyRunProgress(planned, { type: "step-finish", index: 0, step });
    expect(finishedCheckSteps(finished)).toBe(1);
    expect(checkProgressLabel(finished)).toBe("1/1 テスト (Vitest)");
  });

  it("範囲外の手順を無視する", () => {
    const progress = applyRunProgress(emptyCheckProgress(), { type: "plan", steps: [testStep] });
    const step: RunStepResult = { ...testStep, status: "skipped", durationMs: 0, summary: "" };
    expect(applyRunProgress(progress, { type: "step-start", index: -1 })).toBe(progress);
    expect(applyRunProgress(progress, { type: "step-finish", index: 1, step })).toBe(progress);
  });
});
