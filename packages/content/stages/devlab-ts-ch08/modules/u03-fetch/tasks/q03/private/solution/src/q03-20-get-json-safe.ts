// 問20 url の JSON を返す。通信の失敗（fetch が失敗）、ok でない、JSON として読めない、のどれでも undefined を返す
//     例: getJsonSafe(url) → 読めなければ undefined で解決する
// fetch と async・await を使ってください。
// res.json() の結果を unknown 型の変数に入れてから返してください。

export const API = "https://api.example.com";

export async function getJsonSafe(url: string): Promise<unknown> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return undefined;
    }
    const data: unknown = await res.json();
    return data;
  } catch {
    return undefined;
  }
}
