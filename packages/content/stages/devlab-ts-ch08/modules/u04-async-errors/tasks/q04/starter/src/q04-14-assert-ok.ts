// 問14 task（ApiResult で解決する）を待ち、ok なら status を返す。ok でなければ `HTTP 500` の形の Error を投げる
//     例: assertOk(() => Promise.resolve({ ok: false, status: 500 })) → Error("HTTP 500") で失敗する
// async と await を使ってください。

export type ApiResult = { ok: boolean; status: number };

export function assertOk() {}
