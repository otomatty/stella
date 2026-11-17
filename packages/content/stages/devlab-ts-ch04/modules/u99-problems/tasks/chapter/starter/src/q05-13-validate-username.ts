// 04-q05 例外処理 ドリル
//
// 教材: https://typescriptbook.jp/reference/statements/exception
//
// 引数と戻り値には型注釈を付けること。
// 例外を投げるときは throw new Error("メッセージ")。メッセージは問題文のとおりにする。
// JSON.parse、new URL、decodeURIComponent、BigInt、String の repeat などは、おかしな値を渡すと例外を投げる。それを try-catch で受け止める問題もある。
// catch で受け取る値の型は unknown。使う前に instanceof Error などで絞り込む。

// 問13 ユーザー名を確かめ、問題があれば Error を投げる。空なら "名前を入力してください"、20文字より長ければ "20文字以内にしてください"、空白を含めば "空白は使えません"。問題なければ何も返さない（戻り値は void）
//     例: validateUsername("") → Error "名前を入力してください"
export function validateUsername() {}
