// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 型 User、Product と定数 SETTINGS、COLOR_CODES は定義済みです。
// keyof 型 で、その型のプロパティ名のユニオン型になる。keyof typeof 定数 で、定数のキーのユニオン型になる。
// 型を書く問題は、プロパティ名を手で書き並べず、keyof を使って作ること。関数は引数と戻り値に型注釈を付けること。

export type Product = { code: string; price: number; stock: number };

// 問2 型 ProductKey を keyof Product で作る
// ここに型 ProductKey を書く
