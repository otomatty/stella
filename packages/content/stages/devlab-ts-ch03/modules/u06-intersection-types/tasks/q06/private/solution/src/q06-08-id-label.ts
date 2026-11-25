// 問8 「#3 山田」を返す
//     例: idLabel({ id: 3, name: "山田" }) → "#3 山田"
// 引数と戻り値に型注釈を付ける。
// 引数の型には Named & Identified と書く。

export type Named = { name: string };

export type Identified = { id: number };

export function idLabel(x: Named & Identified): string {
  return `#${x.id} ${x.name}`;
}
