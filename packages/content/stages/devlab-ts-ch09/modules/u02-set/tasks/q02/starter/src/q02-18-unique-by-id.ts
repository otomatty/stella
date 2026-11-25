// 問18 同じ id のユーザーは最初の1人だけを残した配列を返す
//     例: uniqueById([{ id: 1, name: "山田" }, { id: 1, name: "山田2" }]) → [{ id: 1, name: "山田" }]
// 引数と戻り値に型注釈を付けます。
// 重複や要素の有無を調べるために Set を使います。
// 引数の配列は変更しません。
// 定義済みの User 型を使います。

export type User = { id: number; name: string };

export function uniqueById() {}
