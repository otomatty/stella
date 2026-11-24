// 問12 型 Reply（真偽値か "未回答"）を定義して export し、answerText(reply: Reply) を書く。true は "はい"、false は "いいえ"、"未回答" はそのまま
//     例: answerText(false) → "いいえ"
// 引数と戻り値に型注釈を付ける。
// 文字列のリテラル値と === で比較し、場合を分ける。

export type Reply = boolean | "未回答";

export function answerText(reply: Reply): string {
  if (reply === "未回答") {
    return reply;
  }
  return reply ? "はい" : "いいえ";
}
