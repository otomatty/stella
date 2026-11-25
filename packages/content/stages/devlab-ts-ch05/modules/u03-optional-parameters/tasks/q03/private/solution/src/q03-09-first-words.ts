// 問9 text と、省略できる count。最初の count 単語（半角スペース区切り）を返す。省略したら 1
//     例: firstWords("a b c d", 2) → "a b"
// 引数と戻り値には型注釈を付けてください。
// 省略できる引数は ? で宣言し、関数の中で ?? や === undefined で省略を扱ってください。

export function firstWords(text: string, count?: number): string {
  return text
    .split(" ")
    .slice(0, count ?? 1)
    .join(" ");
}
