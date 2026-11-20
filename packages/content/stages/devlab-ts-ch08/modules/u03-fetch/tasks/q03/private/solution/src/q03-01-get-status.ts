// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch

export const API = "https://api.example.com";

// 問1
export async function getStatus(url: string): Promise<number> {
  const res = await fetch(url);
  return res.status;
}
