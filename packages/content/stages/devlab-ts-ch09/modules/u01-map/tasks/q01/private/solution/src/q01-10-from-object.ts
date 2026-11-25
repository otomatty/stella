// 問10 オブジェクトを Map にする（Object.entries）
//     例: fromObject({ 山田: 80 }) → Map { "山田" => 80 }
// 引数と戻り値に型注釈を付けます。

export function fromObject(obj: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(obj));
}
