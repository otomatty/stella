// 問20 改行で分け、前後の空白を取り除き、空の行を除いた配列を返す
//     例: nonEmptyLines("a\n\n b \n") → ["a", "b"]
// 引数と戻り値に型注釈を付けます。
// 文字列を split で区切ります。
export function nonEmptyLines(text: string): string[] {
  const result: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed !== "") {
      result.push(trimmed);
    }
  }
  return result;
}
