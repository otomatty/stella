// 06-e02 発展問題 static、getter・setter、メソッドチェーン
//
// 教材: https://typescriptbook.jp/reference/object-oriented/class/static-fields
//       https://typescriptbook.jp/reference/object-oriented/class/static-methods
//       https://typescriptbook.jp/reference/object-oriented/class/return-this-type
//
// 問題
// 1. 温度を表すクラス Temperature を書いてください
//    - constructor(celsius): 摂氏を private に持つ
//    - get fahrenheit(): 華氏を返す（temperature.fahrenheit のように、() なしで読める）
//    - set fahrenheit(value): 華氏で受け取り、摂氏に直して持つ
//    - get celsius(): 摂氏を返す
//    - static fromFahrenheit(value): 華氏から Temperature を作って返す（new しなくても Temperature.fromFahrenheit(…) で呼べる）
//    - static created: これまでに作られた Temperature の数（static フィールド。constructor で1増やす）
//
// 2. 文字列を組み立てるクラス QueryBuilder を書いてください
//    - where(condition): 条件を足して this を返す（戻り値の型は this）
//    - limit(n): 件数を決めて this を返す
//    - build(): "WHERE a AND b LIMIT 10" の形の文字列を返す。条件がなければ WHERE を、件数がなければ LIMIT を付けない
//    例: new QueryBuilder().where("age > 20").where("active").limit(10).build()
//        → "WHERE age > 20 AND active LIMIT 10"

export class Temperature {}

export class QueryBuilder {}
