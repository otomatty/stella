// 問1 開いているドアを閉める（closed にする）。それ以外はそのまま
//     例: closeDoor({ state: "open" }) → { state: "closed" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Door 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

export function closeDoor(door: Door): Door {
  return door.state === "open" ? { state: "closed" } : door;
}
