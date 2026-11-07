// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

// 問13
export function elapsedOf(timer: Timer, now: number): number {
  switch (timer.state) {
    case "idle":
      return 0;
    case "running":
      return now - timer.startedAt;
    case "paused":
      return timer.elapsed;
  }
}
