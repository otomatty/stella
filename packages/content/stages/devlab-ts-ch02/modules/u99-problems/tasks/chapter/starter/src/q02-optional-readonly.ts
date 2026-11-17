// 02-q02 オプションプロパティと readonly
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/object/optional-property
//       https://typescriptbook.jp/reference/values-types-variables/object/readonly-property
//
// 問題
// 1. 利用者を表す型 User を定義して export してください
//    - id: 数値。後から書き換えられないように readonly にする
//    - name: 文字列
//    - nickname: 文字列。なくてもよい（オプションプロパティにする）
//
// 2. displayName(user) を書いてください
//    nickname があれば nickname を、なければ name を返す
//    例: displayName({ id: 1, name: "山田太郎", nickname: "たろう" }) → "たろう"
//        displayName({ id: 2, name: "佐藤花子" })                     → "佐藤花子"
//    ヒント: ?? 演算子を使うと短く書ける
//
// 3. hasNickname(user) を書いてください。nickname があれば true を返す

export type User = unknown;

export function displayName() {}

export function hasNickname() {}
