// 問4 鍵のかかったドアを、同じ鍵 key なら開錠して closed にする。鍵が違う、または鍵がかかっていなければそのまま
//     例: unlockDoor({ state: "locked", key: "A" }, "A") → { state: "closed" }
// 引数と戻り値に型注釈を付ける。
// 定義済みの Door 型を使い、state で状態を見分ける。
// 状態を変えるときは、元のオブジェクトを変更せず、新しいオブジェクトを返す。

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

export function unlockDoor() {}
