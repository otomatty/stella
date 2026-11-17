// 03-q01 型エイリアスとユニオン型 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/type-alias
//       https://typescriptbook.jp/reference/values-types-variables/union

// 問12
export type Reply = boolean | "未回答";

export function answerText(reply: Reply): string {
  if (reply === "未回答") {
    return reply;
  }
  return reply ? "はい" : "いいえ";
}
