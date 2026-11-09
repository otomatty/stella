// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

// 問11
export function pauseTimer(timer: Timer, now: number): Timer {
  if (timer.state === "running") {
    return { state: "paused", elapsed: now - timer.startedAt };
  }
  return timer;
}
