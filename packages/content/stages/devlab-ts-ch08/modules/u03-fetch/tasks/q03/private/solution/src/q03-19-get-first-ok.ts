// 問19 urls を前から順番に取得し、最初に ok だったものの本文の文字列を返す（それより後ろは取得しない）。どれも ok でなければ "取得できませんでした" の Error
//     例: getFirstOk([404 の url, 200 の url, …]) → 2つ目の本文で解決する
// fetch と async・await を使ってください。

export const API = "https://api.example.com";

export async function getFirstOk(urls: readonly string[]): Promise<string> {
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) {
      return await res.text();
    }
  }
  throw new Error("取得できませんでした");
}
