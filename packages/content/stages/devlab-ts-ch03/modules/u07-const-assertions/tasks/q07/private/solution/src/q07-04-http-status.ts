// 問4 定数 HTTP_STATUS を { ok: 200, notFound: 404 } として宣言する
// 定数の宣言に as const を付ける。

export const HTTP_STATUS = { ok: 200, notFound: 404 } as const;
