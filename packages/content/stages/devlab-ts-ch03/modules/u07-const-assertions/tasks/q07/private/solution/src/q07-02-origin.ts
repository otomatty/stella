// 問2 定数 ORIGIN を { x: 0, y: 0 } として宣言する。型は { readonly x: 0; readonly y: 0 }
// 定数の宣言に as const を付ける。

export const ORIGIN = { x: 0, y: 0 } as const;
