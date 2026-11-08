// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

// 問4
export function unlockDoor(door: Door, key: string): Door {
  if (door.state === "locked" && door.key === key) {
    return { state: "closed" };
  }
  return door;
}
