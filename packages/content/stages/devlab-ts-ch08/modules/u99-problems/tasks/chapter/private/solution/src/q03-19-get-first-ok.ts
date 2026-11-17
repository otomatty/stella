// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch

export const API = "https://api.example.com";

// 問19
export async function getFirstOk(urls: readonly string[]): Promise<string> {
  for (const url of urls) {
    const res = await fetch(url);
    if (res.ok) {
      return await res.text();
    }
  }
  throw new Error("取得できませんでした");
}
