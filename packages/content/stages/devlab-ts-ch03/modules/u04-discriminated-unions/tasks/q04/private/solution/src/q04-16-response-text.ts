// 問16 型 ApiResponse（{ ok: true; data: string } か { ok: false; status: number }）を定義して export し、responseText(response: ApiResponse) を書く。成功なら data、失敗なら「エラー 404」
//     例: responseText({ ok: false, status: 404 }) → "エラー 404"
// 引数と戻り値に型注釈を付ける。
// type と | を使い、判別可能なユニオン型を定義する。

export type ApiResponse = { ok: true; data: string } | { ok: false; status: number };

export function responseText(response: ApiResponse): string {
  return response.ok ? response.data : `エラー ${response.status}`;
}
