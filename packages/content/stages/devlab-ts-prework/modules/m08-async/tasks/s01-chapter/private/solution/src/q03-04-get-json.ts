// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch

export const API = "https://api.example.com";

// 問4
export async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  const data: unknown = await res.json();
  return data;
}
