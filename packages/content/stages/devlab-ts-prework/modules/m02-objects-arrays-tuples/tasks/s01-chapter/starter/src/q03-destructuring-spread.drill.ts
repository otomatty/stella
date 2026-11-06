// 02-q03 分割代入とスプレッド構文 ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/destructuring-assignment-from-objects
//       https://typescriptbook.jp/reference/values-types-variables/object/spread-syntax-for-object
//
// 商品 Item と利用者 User の型は定義済みです。次の20個の関数を書いてください。引数と戻り値には型注釈を付けること。
// プロパティを取り出すときは const { name, price } = item; のような分割代入を使う。
// オブジェクトを変えるときは、元のオブジェクトを書き換えずに、{ ...item, price } のようにスプレッド構文で新しいオブジェクトを作る。
//
// 答え合わせ: VS Code のコマンド「STELLA: 課題を確認する」を実行する
// 通らなかったテストは、問の番号 (「問3 …」) と一緒に結果に出ます

export type Item = { id: number; name: string; price: number; stock: number };
export type User = { id: number; name: string; age: number; email: string };

// 問1 分割代入で name と price を取り出し、「りんご 150円」の形にする
//     例: itemLabel(りんご) → "りんご 150円"
export function itemLabel() {}

// 問2 price だけを変えた新しい Item を返す
//     例: setPrice(りんご, 120) → price が 120 の新しい Item
export function setPrice() {}

// 問3 stock だけを変えた新しい Item を返す
//     例: setStock(りんご, 0) → stock が 0 の新しい Item
export function setStock() {}

// 問4 stock を amount だけ増やした新しい Item を返す
//     例: addStock(在庫12のりんご, 8) → stock が 20 の新しい Item
export function addStock() {}

// 問5 name だけを変えた新しい Item を返す
//     例: rename(りんご, "青りんご") → name が "青りんご" の新しい Item
export function rename() {}

// 問6 分割代入で name と age を取り出し、「山田（30）」の形にする
//     例: userSummary(山田) → "山田（30）"
export function userSummary() {}

// 問7 age を1増やした新しい User を返す
//     例: birthday(30歳の山田) → age が 31 の新しい User
export function birthday() {}

// 問8 email だけを変えた新しい User を返す
//     例: changeEmail(山田, "new@example.com") → email が変わった新しい User
export function changeEmail() {}

// 問9 分割代入で id と name を取り出し、{ id, name } だけのオブジェクトを返す
//     例: pickIdName(山田) → { id: 1, name: "山田" }
export function pickIdName() {}

// 問10 patch { name, email } の値で上書きした新しい User を返す
//     例: mergeUser(山田, { name: "山田太郎", email: "t@example.com" }) → name と email が変わった User
export function mergeUser() {}

// 問11 中身が同じで、別のオブジェクトになった Item を返す
//     例: copyItem(りんご) → りんごと同じ中身の、新しい Item
export function copyItem() {}

// 問12 price を percentOff パーセント引き（1円未満は切り捨て）にした新しい Item を返す
//     例: discountItem(150円のりんご, 10) → price が 135 の新しい Item
export function discountItem() {}

// 問13 引数の位置で分割代入して（function greetByName({ name }: User)）、「こんにちは、山田さん」を返す
//     例: greetByName(山田) → "こんにちは、山田さん"
export function greetByName() {}

// 問14 引数の位置で price を分割代入し、1000円以上なら true を返す
//     例: isExpensive(りんご) → false
export function isExpensive() {}

// 問15 引数の位置で price と stock を分割代入し、在庫金額（価格 × 在庫）を返す
//     例: stockValue(りんご) → 1800
export function stockValue() {}

// 問16 stock を 0 にした新しい Item を返す
//     例: resetStock(りんご) → stock が 0 の新しい Item
export function resetStock() {}

// 問17 分割代入で名前を付け替えて（const { id: value, name: label } = item）、{ value, label } を返す
//     例: toOption(りんご) → { value: 1, label: "りんご" }
export function toOption() {}

// 問18 { size?, color? } に、足りない値を size 10、color "black" で補ったオブジェクトを返す（既定値のオブジェクトの後ろに、スプレッドで重ねる）
//     例: withDefaults({ color: "red" }) → { size: 10, color: "red" }
export function withDefaults() {}

// 問19 { x } と { y } を合わせて { x, y } にする
//     例: combine({ x: 1 }, { y: 2 }) → { x: 1, y: 2 }
export function combine() {}

// 問20 price を税込（10%。1円未満は切り捨て）にした新しい Item を返す
//     例: withTax(150円のりんご) → price が 165 の新しい Item
export function withTax() {}
