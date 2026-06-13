/**
 * 教材ファイル (PDF / 動画) の URL 解決 (旧 Supabase Storage の置き換え)。
 *
 * Neon File Storage は S3 互換のオブジェクトストレージで、 公開バケットの
 * オブジェクトは公開ベース URL からそのまま配信できる。 ベース URL は
 * `VITE_MATERIALS_BASE_URL` で設定する (例: https://<bucket>.<region>.neon.storage)。
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
      "教材ストレージが未設定です。 VITE_MATERIALS_BASE_URL に Neon File Storage の公開ベース URL を設定してください。",
    );
  }
  const clean = path.replace(/^\/+/, "");
  return `${baseUrl}/${clean}`;
}
