// 03-q08 状態の切り替え ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

// 問5
export function doorText(door: Door): string {
  switch (door.state) {
    case "open":
      return "開いている";
    case "closed":
      return "閉まっている";
    case "locked":
      return "鍵がかかっている";
  }
}
