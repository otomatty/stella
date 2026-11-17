// 08-q03 fetch ドリル
//
// 教材: https://typescriptbook.jp/reference/asynchronous/await
//       https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch

export const API = "https://api.example.com";

// 問20
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
