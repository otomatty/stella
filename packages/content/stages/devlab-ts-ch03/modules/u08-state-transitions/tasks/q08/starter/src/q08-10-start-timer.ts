// 問10 タイマーを動かす。idle なら startedAt を now にして running に。paused なら止まっていた分を引いて（startedAt = now - elapsed）running に。running ならそのまま
//     例: startTimer({ state: "idle" }, 1000) → { state: "running", startedAt: 1000 }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Timer 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Timer =
  | { state: "idle" }
  | { state: "running"; startedAt: number }
  | { state: "paused"; elapsed: number };

export function startTimer() {}
