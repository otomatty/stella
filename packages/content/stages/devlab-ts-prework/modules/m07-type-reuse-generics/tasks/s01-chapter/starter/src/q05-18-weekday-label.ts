// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問18 定数 WEEKDAY_LABELS を Record<Weekday, string> として宣言して export し（mon は "月"、tue は "火"、wed は "水"、thu は "木"、fri は "金"）、weekdayLabel(day) でその名前を返す
//     例: weekdayLabel("wed") → "水"
// ここに WEEKDAY_LABELS と関数 weekdayLabel を書く
