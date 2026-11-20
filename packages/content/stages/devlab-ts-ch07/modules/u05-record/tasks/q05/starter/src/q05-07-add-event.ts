// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record
//
// 型 Category と Weekday は定義済みです。
// Record<Keys, Type> は、キーが Keys、値が Type のオブジェクトの型。Keys にユニオン型を渡すと、そのすべてのキーを持つ。
// 関数は引数と戻り値に型注釈を付けること。

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問7 schedule の day に event を足した、新しい Record<Weekday, string[]> を返す（元は変えない）
//     例: addEvent(schedule, "mon", "会議").mon → ["会議"]
export function addEvent() {}
