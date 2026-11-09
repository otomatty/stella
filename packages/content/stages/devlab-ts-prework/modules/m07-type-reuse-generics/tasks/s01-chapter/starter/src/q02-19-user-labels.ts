// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 型 User、Product と定数 SETTINGS、COLOR_CODES は定義済みです。
// keyof 型 で、その型のプロパティ名のユニオン型になる。keyof typeof 定数 で、定数のキーのユニオン型になる。
// 型を書く問題は、プロパティ名を手で書き並べず、keyof を使って作ること。関数は引数と戻り値に型注釈を付けること。

export type User = { id: number; name: string; email: string; age: number };

// 問19 型 UserLabels を、User のすべてのプロパティ名をキー、文字列を値にした型として作る（Record<keyof User, string>）。あわせて、その型の定数 USER_LABELS を export する（id は "ID"、name は "名前"、email は "メール"、age は "年齢"）
// ここに型 UserLabels と定数 USER_LABELS を書く
