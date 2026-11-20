// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

// 問2
export function openDoor(door: Door): Door {
  return door.state === "closed" ? { state: "open" } : door;
}
