// 問2 型 Schedule を、キーが Weekday、値が文字列の配列の Record として作る

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

export type Schedule = Record<Weekday, string[]>;
