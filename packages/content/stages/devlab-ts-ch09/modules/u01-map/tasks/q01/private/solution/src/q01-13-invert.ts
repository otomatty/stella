// 問13 キーと値を入れ替えた新しい Map を返す
//     例: invert(Map { "red" => "赤" }) → Map { "赤" => "red" }
// 引数と戻り値に型注釈を付けます。
// 引数の Map は変更しません。

export function invert(map: Map<string, string>): Map<string, string> {
  const result = new Map<string, string>();
  for (const [key, value] of map) {
    result.set(value, key);
  }
  return result;
}
