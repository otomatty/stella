// 問5 getJson と同じ。ただし res.ok が false なら `HTTP 404` の Error を投げる
//     例: getJsonOrThrow(url) → 404 なら Error("HTTP 404") で失敗する
// fetch と async・await を使ってください。
// res.json() の結果を unknown 型の変数に入れてから返してください。
// HTTP エラーのメッセージには実際の res.status を入れてください。

export const API = "https://api.example.com";

export async function getJsonOrThrow(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data: unknown = await res.json();
  return data;
}
