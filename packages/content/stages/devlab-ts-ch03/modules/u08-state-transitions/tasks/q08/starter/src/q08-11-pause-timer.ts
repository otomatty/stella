// 問11 動いているタイマーを止める。elapsed は now - startedAt。running でなければそのまま
//     例: pauseTimer({ state: "running", startedAt: 1000 }, 1500) → { state: "paused", elapsed: 500 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Timer 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

export function pauseTimer() {}
