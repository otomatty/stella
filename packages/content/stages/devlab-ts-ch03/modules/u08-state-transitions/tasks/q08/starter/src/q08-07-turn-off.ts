// 問7 照明を消す（off にする）
//     例: turnOff({ state: "on", brightness: 40 }) → { state: "off" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Light 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。
// すでにその状態なら、受け取ったオブジェクトをそのまま返す。

export type Light = { state: "off" } | { state: "on"; brightness: number };

export function turnOff() {}
