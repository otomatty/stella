export type LockStepKind = "content" | "problem" | "other";

export interface LockStep {
  id: string;
  kind: LockStepKind;
  title: string;
}

/** 動画とスライドは、後続の問題を解く前に完了する。 */
export function lockKindOfLessonType(type: string): Exclude<LockStepKind, "problem"> {
  return type === "video" || type === "slides" ? "content" : "other";
}

/** 問題より前にある、完了していない最初の動画・スライド・問題を返す。 */
export function blockingStep(
  steps: readonly LockStep[],
  index: number,
  done: ReadonlySet<string>,
): LockStep | null {
  const target = steps[index];
  if (target?.kind !== "problem" || done.has(target.id)) return null;

  for (let i = 0; i < index; i++) {
    const step = steps[i];
    if (step.kind !== "other" && !done.has(step.id)) return step;
  }
  return null;
}

export function isLockedStep(
  steps: readonly LockStep[],
  index: number,
  done: ReadonlySet<string>,
): boolean {
  return blockingStep(steps, index, done) !== null;
}
