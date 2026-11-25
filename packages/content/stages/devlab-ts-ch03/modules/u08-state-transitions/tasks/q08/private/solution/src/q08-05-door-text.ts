// 問5 ドアの状態を「開いている」「閉まっている」「鍵がかかっている」で返す
//     例: doorText({ state: "locked", key: "A" }) → "鍵がかかっている"
// 引数と戻り値に型注釈を付ける。
// 定義済みの Door 型を使い、state で状態を見分ける。

export type Door = { state: "open" } | { state: "closed" } | { state: "locked"; key: string };

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
