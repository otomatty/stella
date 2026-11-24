// 問19 単語ごとに、最初に出てきた位置（0 から数える）の Map を返す
//     例: firstIndex(["a", "b", "a", "c"]) → Map { "a" => 0, "b" => 1, "c" => 3 }
// 引数と戻り値に型注釈を付けます。

export function firstIndex(words: readonly string[]): Map<string, number> {
  const result = new Map<string, number>();
  words.forEach((word, i) => {
    if (!result.has(word)) {
      result.set(word, i);
    }
  });
  return result;
}
