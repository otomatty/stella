// 問2 型 ProductKey を keyof Product で作る

export type Product = { code: string; price: number; stock: number };

export type ProductKey = keyof Product;
