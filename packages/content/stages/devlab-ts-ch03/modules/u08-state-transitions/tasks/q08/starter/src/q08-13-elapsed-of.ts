// 問13 経過時間を返す。idle は 0、running は now - startedAt、paused は elapsed
//     例: elapsedOf({ state: "running", startedAt: 1000 }, 1800) → 800
// 引数と戻り値に型注釈を付ける。
// 定義済みの Timer 型を使い、state で状態を見分ける。

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

export function elapsedOf() {}
