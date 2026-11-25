// 問18 urls をすべて同時に取得し（Promise.all）、本文の文字列の配列を返す
//     例: getAllTexts([url1, url2]) → ["a", "b"] で解決する
// fetch と async・await を使ってください。

export const API = "https://api.example.com";

export async function getAllTexts(urls: readonly string[]): Promise<string[]> {
  const responses = await Promise.all(urls.map((url) => fetch(url)));
  return await Promise.all(responses.map((res) => res.text()));
}
