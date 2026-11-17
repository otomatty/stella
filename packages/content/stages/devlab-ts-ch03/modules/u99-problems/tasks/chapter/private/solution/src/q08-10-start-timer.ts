// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

// 問10
export function startTimer(timer: Timer, now: number): Timer {
  switch (timer.state) {
    case "idle":
      return { state: "running", startedAt: now };
    case "paused":
      return { state: "running", startedAt: now - timer.elapsed };
    case "running":
      return timer;
  }
}
