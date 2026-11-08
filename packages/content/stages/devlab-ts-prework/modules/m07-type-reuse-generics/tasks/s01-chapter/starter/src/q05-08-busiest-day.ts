// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問8 予定がいちばん多い曜日を返す。同じなら mon、tue… の順で先の方
//     例: busiestDay(schedule) → "wed"
export function busiestDay() {}
