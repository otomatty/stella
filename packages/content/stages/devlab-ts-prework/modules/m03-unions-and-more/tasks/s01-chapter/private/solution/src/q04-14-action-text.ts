// 03-q04 判別可能なユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/discriminated-union

// 問14
export type UserAction = { kind: "click"; x: number; y: number } | { kind: "key"; key: string };

export function actionText(event: UserAction): string {
  return event.kind === "click" ? `click(${event.x}, ${event.y})` : `key(${event.key})`;
}
