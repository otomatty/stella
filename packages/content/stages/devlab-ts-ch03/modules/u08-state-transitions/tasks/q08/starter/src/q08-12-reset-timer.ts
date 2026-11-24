// 問12 どの状態からでも idle に戻す
//     例: resetTimer({ state: "paused", elapsed: 300 }) → { state: "idle" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Timer 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。
// すでにその状態なら、受け取ったオブジェクトをそのまま返す。

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

export function resetTimer() {}
