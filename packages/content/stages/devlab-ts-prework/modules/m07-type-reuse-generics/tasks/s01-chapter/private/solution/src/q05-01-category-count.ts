// 07-q05 Record ドリル
//
// 教材: https://typescriptbook.jp/reference/type-reuse/utility-types/record

export type Category = "food" | "drink" | "other";

// 問1
export type CategoryCount = Record<Category, number>;
