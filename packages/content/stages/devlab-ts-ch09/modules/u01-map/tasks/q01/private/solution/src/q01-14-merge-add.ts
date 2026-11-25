// 問14 2つの Map をまとめた新しい Map を返す。同じキーは値を足す（a のキーを a の順に、その後に b にだけあるキー）
//     例: mergeAdd(Map { "x" => 1 }, Map { "x" => 2, "y" => 3 }) → Map { "x" => 3, "y" => 3 }
// 引数と戻り値に型注釈を付けます。
// 引数 a、b のどちらの Map も変更しません。

export function mergeAdd(a: Map<string, number>, b: Map<string, number>): Map<string, number> {
  const result = new Map(a);
  for (const [key, value] of b) {
    result.set(key, (result.get(key) ?? 0) + value);
  }
  return result;
}
