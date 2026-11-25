// 問6 value を足した新しい Set を返す（元の Set は変えない）
//     例: withAdded(Set { "a" }, "b") → Set { "a", "b" }
// 引数と戻り値に型注釈を付けます。

export function withAdded(set: Set<string>, value: string): Set<string> {
  const result = new Set(set);
  result.add(value);
  return result;
}
