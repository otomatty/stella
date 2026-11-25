// 問3 url を fetch して、本文を文字列（res.text()）で返す
//     例: getText(url) → 本文で解決する
// fetch と async・await を使ってください。

export const API = "https://api.example.com";

export async function getText(url: string): Promise<string> {
  const res = await fetch(url);
  return await res.text();
}
