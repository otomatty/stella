// 03-q02 リテラル型のユニオン ドリル
//
// 教材: https://typescriptbook.jp/reference/values-types-variables/literal-types
//       https://typescriptbook.jp/reference/values-types-variables/union
//
// 引数と戻り値には型注釈を付けること。
// 定義済みの型 Direction、Weekday、Plan を使う。
// 文字列から型の値に変える関数（parse…）は、どれにも当てはまらなければ undefined を返す。

export type Weekday = "月" | "火" | "水" | "木" | "金";

// 問5 次の平日を返す。金の次は月
//     例: nextWeekday("金") → "月"
export function nextWeekday() {}
