// 問8 value があれば取り除き、なければ足した新しい Set を返す（元の Set は変えない）
//     例: toggle(Set { "a" }, "a") → Set {}
// 引数と戻り値に型注釈を付けます。

export function toggle(set: Set<string>, value: string): Set<string> {
  const result = new Set(set);
  if (result.has(value)) {
    result.delete(value);
  } else {
    result.add(value);
  }
  return result;
}
