// 問17 分割代入で名前を付け替えて（const { id: value, name: label } = item）、{ value, label } を返す
//     例: toOption(りんご) → { value: 1, label: "りんご" }
// 引数と戻り値には型注釈を付けます。
// 定義済みの Item 型を使います。

export type Item = { id: number; name: string; price: number; stock: number };

export function toOption() {}
