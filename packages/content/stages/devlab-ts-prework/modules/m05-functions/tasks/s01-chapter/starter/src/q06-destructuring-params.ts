// 05-q06 分割代入引数
//
// 教材: https://typescriptbook.jp/reference/functions/destructuring-assignment-parameters
//       https://typescriptbook.jp/reference/functions/keyword-arguments-and-options-object-pattern
//
// 問題
// 引数を1つのオブジェクトで受け取り、引数の位置で分割代入する関数を書いてください。
// 例: function createUser({ name, age = 20 }: { name: string; age?: number }) { … }
// 省略できるプロパティは ? を付け、分割代入のところでデフォルト値を書く。戻り値には型注釈を付けること。
//
// 1. createUser({ name, age, role })
//    User を返す。age を省略したら 20、role を省略したら "member"
//
// 2. formatAddress({ zip, pref, city, line })
//    "〒100-0001 東京都千代田区千代田1-1" の形にする。zip は「100-0001」の形。line は省略できる（省略したら付けない）
//
// 3. searchQuery({ keyword, limit, sort })
//    "q=<keyword>&limit=<limit>&sort=<sort>" の形にする。limit を省略したら 10、sort を省略したら "new"。
//    sort は "new" か "popular"。keyword は encodeURIComponent で変換する

export type User = { name: string; age: number; role: "admin" | "member" };

export function createUser() {}

export function formatAddress() {}

export function searchQuery() {}
