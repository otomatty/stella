// 07-q02 keyof 型演算子 ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/keyof-type-operator
//       https://typescriptbook.jp/reference/type-reuse/indexed-access-types
//
// 次の20問を解いてください。型 User、Product と定数 SETTINGS、COLOR_CODES は定義済みです。
// keyof 型 で、その型のプロパティ名のユニオン型になる。keyof typeof 定数 で、定数のキーのユニオン型になる。
// 型を書く問題は、プロパティ名を手で書き並べず、keyof を使って作ること。関数は引数と戻り値に型注釈を付けること。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type User = { id: number; name: string; email: string; age: number };
export type Product = { code: string; price: number; stock: number };
export const SETTINGS = { theme: "light", fontSize: 14, beta: false };
export const COLOR_CODES = { red: "#ff0000", green: "#00ff00", blue: "#0000ff" } as const;

// 問1 型 UserKey を keyof User で作る
// ここに型 UserKey を書く

// 問2 型 ProductKey を keyof Product で作る
// ここに型 ProductKey を書く

// 問3 型 SettingKey を、定数 SETTINGS のキーとして作る（keyof typeof SETTINGS）
// ここに型 SettingKey を書く

// 問4 型 ColorName を、定数 COLOR_CODES のキーとして作る
// ここに型 ColorName を書く

// 問5 型 UserOrProductKey を、User と Product のどちらかのプロパティ名として作る（keyof User | keyof Product）
// ここに型 UserOrProductKey を書く

// 問6 型 UserValue を、User のすべてのプロパティの値の型のユニオン型として作る（User[keyof User]）
// ここに型 UserValue を書く

// 問7 user の key のプロパティを返す。key の型は keyof User、戻り値は string | number
//     例: userField(user, "name") → "山田"
export function userField() {}

// 問8 product の key のプロパティを返す。key の型は keyof Product、戻り値は string | number
//     例: productField(product, "price") → 150
export function productField() {}

// 問9 SETTINGS の key の値を返す。key の型は keyof typeof SETTINGS、戻り値は string | number | boolean
//     例: settingValue("fontSize") → 14
export function settingValue() {}

// 問10 COLOR_CODES から色の番号を返す。引数の型は keyof typeof COLOR_CODES
//     例: colorCode("green") → "#00ff00"
export function colorCode() {}

// 問11 User のプロパティ名を日本語にする。id は "ID"、name は "名前"、email は "メール"、age は "年齢"（switch ですべての場合を書く）
//     例: fieldLabel("email") → "メール"
export function fieldLabel() {}

// 問12 文字列が User のプロパティ名なら true。戻り値の型は text is keyof User
//     例: isUserKey("email") → true
export function isUserKey() {}

// 問13 user の、keys に並べたプロパティの値を、その順に並べた配列を返す。keys は readonly (keyof User)[]
//     例: valuesOf(user, ["name", "age"]) → ["山田", 30]
export function valuesOf() {}

// 問14 2人の User で値が違うプロパティ名を、id、name、email、age の順で返す
//     例: differentKeys(a, b) → ["age"]
export function differentKeys() {}

// 問15 User の配列を、key（"id" か "age"）の小さい順に並べた新しい配列を返す。同じなら元の順
//     例: sortByNumberKey(users, "age") → 若い順
export function sortByNumberKey() {}

// 問16 オブジェクトのキーの数を返す。引数の型は object
//     例: keyCount({ a: 1, b: 2 }) → 2
export function keyCount() {}

// 問17 obj に key のプロパティがあれば true（key in obj）
//     例: hasOwnKey({ a: 1 }, "a") → true
export function hasOwnKey() {}

// 問18 product の keys に並べたプロパティを "code=A1, price=150" の形にする
//     例: productText(product, ["code", "price"]) → "code=A1, price=150"
export function productText() {}

// 問19 型 UserLabels を、User のすべてのプロパティ名をキー、文字列を値にした型として作る（Record<keyof User, string>）。あわせて、その型の定数 USER_LABELS を export する（id は "ID"、name は "名前"、email は "メール"、age は "年齢"）
// ここに型 UserLabels と定数 USER_LABELS を書く

// 問20 Product の配列の、key（"price" か "stock"）のプロパティの合計を返す
//     例: totalStock(products, "stock") → 8
export function totalStock() {}
