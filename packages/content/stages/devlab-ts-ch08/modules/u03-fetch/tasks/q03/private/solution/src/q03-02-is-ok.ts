// 問2 url を fetch して、res.ok を返す
//     例: isOk(url) → 成功なら true で解決する
// fetch と async・await を使ってください。

export const API = "https://api.example.com";

export async function isOk(url: string): Promise<boolean> {
  const res = await fetch(url);
  return res.ok;
}
