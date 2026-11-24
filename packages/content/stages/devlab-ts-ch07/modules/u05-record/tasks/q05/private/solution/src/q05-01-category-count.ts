// 問1 型 CategoryCount を、キーが Category、値が数値の Record として作る

export type Category = "food" | "drink" | "other";

export type CategoryCount = Record<Category, number>;
