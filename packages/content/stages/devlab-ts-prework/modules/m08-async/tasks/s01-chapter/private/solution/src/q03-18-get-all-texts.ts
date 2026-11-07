// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch

export const API = "https://api.example.com";

// 問18
export async function getAllTexts(urls: readonly string[]): Promise<string[]> {
  const responses = await Promise.all(urls.map((url) => fetch(url)));
  return await Promise.all(responses.map((res) => res.text()));
}
