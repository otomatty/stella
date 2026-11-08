// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

// 問12
export function resetTimer(timer: Timer): Timer {
  return timer.state === "idle" ? timer : { state: "idle" };
}
