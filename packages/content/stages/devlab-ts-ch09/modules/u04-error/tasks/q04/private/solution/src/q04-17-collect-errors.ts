// 問17 fns を順番にすべて呼び、投げられたエラーの message を集めた配列を返す（Error でなければ "不明なエラー"）
//     例: collectErrors([成功する関数, Error("a") を投げる関数]) → ["a"]
// 引数と戻り値に型注釈を付けます。
// エラーの種類は instanceof で見分けます。

export function collectErrors(fns: (() => void)[]): string[] {
  const messages: string[] = [];
  for (const fn of fns) {
    try {
      fn();
    } catch (error) {
      messages.push(error instanceof Error ? error.message : "不明なエラー");
    }
  }
  return messages;
}
