// 問18 すべての値に fn を当てた新しい Map を返す
//     例: mapValues(Map { "a" => 1 }, (n) => n * 10) → Map { "a" => 10 }
// 引数と戻り値に型注釈を付けます。
// 引数の Map は変更しません。

export function mapValues(
  scores: Map<string, number>,
  fn: (n: number) => number,
): Map<string, number> {
  return new Map([...scores].map(([key, value]): [string, number] => [key, fn(value)]));
}
