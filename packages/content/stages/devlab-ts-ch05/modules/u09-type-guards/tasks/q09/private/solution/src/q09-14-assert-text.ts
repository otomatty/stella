// 問14 【アサーション】文字列でなければ "文字列ではありません" の Error を投げる。戻り値の型は asserts value is string
//     例: assertText(1) → Error

export function assertText(value: unknown): asserts value is string {
  if (typeof value !== "string") {
    throw new Error("文字列ではありません");
  }
}
