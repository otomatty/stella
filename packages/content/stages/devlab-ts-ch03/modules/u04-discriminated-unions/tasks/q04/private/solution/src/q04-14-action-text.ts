// 問14 型 UserAction（{ kind: "click"; x; y } か { kind: "key"; key }）を定義して export し、actionText(event: UserAction) を書く。「click(10, 20)」「key(Enter)」
//     例: actionText({ kind: "key", key: "Enter" }) → "key(Enter)"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

export type UserAction = { kind: "click"; x: number; y: number } | { kind: "key"; key: string };

export function actionText(event: UserAction): string {
  return event.kind === "click" ? `click(${event.x}, ${event.y})` : `key(${event.key})`;
}
