// 問3 閉まっているドアに鍵 key をかける（locked にする）。開いていればかけられない（そのまま）
//     例: lockDoor({ state: "closed" }, "A") → { state: "locked", key: "A" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Door 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

export function lockDoor(door: Door, key: string): Door {
  return door.state === "closed" ? { state: "locked", key } : door;
}
