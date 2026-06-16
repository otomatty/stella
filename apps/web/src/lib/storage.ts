/**
 * 教材ファイル (PDF / 動画) の URL 解決 (旧 Supabase Storage の置き換え)。
 *
 * Cloudflare R2 の公開バケット URL を `VITE_MATERIALS_BASE_URL` に設定する。
 * 例 (r2.dev): https://pub-xxxx.r2.dev
 * 例 (カスタムドメイン): https://materials.example.com
 *
 * 旧実装 (Supabase Storage `materials-public` バケット) と同じく、
 * `getMaterialUrl('web-fundamentals/01-http.pdf')` 形式で参照する。
 */

const baseUrl = (import.meta.env.VITE_MATERIALS_BASE_URL as string | undefined)?.replace(
  /\/+$/,
  "",
);

export function isStorageConfigured(): boolean {
  return Boolean(baseUrl);
}

/** 教材オブジェクトの公開 URL を返す。 */
export function getMaterialUrl(path: string): string {
  if (!baseUrl) {
    throw new Error(
      "教材ストレージが未設定です。 VITE_MATERIALS_BASE_URL に R2 バケットの公開ベース URL を設定してください。",
    );
  }
  const clean = path.replace(/^\/+/, "");
  return `${baseUrl}/${clean}`;
}
