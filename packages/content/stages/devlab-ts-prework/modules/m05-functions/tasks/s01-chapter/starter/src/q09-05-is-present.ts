// 05-q09 型ガード関数とアサーション関数 ドリル
//
// 教材: https://typescriptbook.jp/reference/functions/type-guard-functions
//       https://typescriptbook.jp/reference/functions/assertion-functions
//
// 型 User、Admin、Pet は定義済みです。
// 「型ガード関数」は戻り値の型を value is string のように書く。true を返したとき、呼び出し側で value がその型に絞り込まれる。
// 「アサーション関数」は戻り値の型を asserts value is string のように書き、条件に合わなければ例外を投げる。
// テストは、戻り値の型が型ガードやアサーションになっているかも確かめる。

// 問5 【型ガード】string | null を受け取り、null でないか。戻り値の型は value is string
//     例: isPresent(null) → false
export function isPresent() {}
