// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

// 問2
export type Schedule = Record<Weekday, string[]>;
