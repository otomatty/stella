/**
 * 教材ファイル (PDF / 動画) の URL 解決 (R2 への置き換え)。
 *
 * Cloudflare R2 の公開バケット URL を `VITE_MATERIALS_BASE_URL` に設定する。
 * 例 (r2.dev): https://pub-xxxx.r2.dev
 * 例 (カスタムドメイン): https://materials.example.com
 *
 * パス形式は `tenant/{tenantId}/courses/{stageId}/{fileName}`。 `courses/` は
 * 「コース → ステージ」改名前からの R2 プレフィックスで、 既存オブジェクトを
 * 指し続けるためそのまま使う。
 * 例: `getMaterialUrl('tenant/ses/courses/6b200629-c6af-5746-bf86-69718cfacf2f/01-http.pdf')`
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
