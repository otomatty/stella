export interface BookLimitsConfig {
  MAX_PDF_MB?: string;
  MAX_PDF_PAGES?: string;
  MAX_BOOK_MB?: string;
  MAX_BOOK_PAGES?: string;
}
// 小さな共通部品。

/** UUID v7(先頭48ビットがミリ秒の時刻。並べると作成順になる)。 */
export function uuidv7(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  const ms = Date.now();
  for (let i = 0; i < 6; i++) b[i] = Math.floor(ms / 2 ** (8 * (5 - i))) & 0xff;
  b[6] = (b[6] & 0x0f) | 0x70;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(bytes = 32): string {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export const pad = (n: number, width: number) => String(n).padStart(width, "0");

/** 環境変数(文字列)を数にする。 */
export const num = (v: string | undefined, fallback: number) =>
  v && Number.isFinite(Number(v)) ? Number(v) : fallback;

/** PDFと本の上限【仮】。1PDFは50MB・100ページ(S-1で48.5MBは実環境に収まった)。1冊は1GB・1000ページ。 */
export function limitsOf(env: BookLimitsConfig) {
  const MB = 1024 * 1024;
  return {
    maxPdfBytes: num(env.MAX_PDF_MB, 50) * MB,
    maxPdfPages: num(env.MAX_PDF_PAGES, 100),
    maxBookBytes: num(env.MAX_BOOK_MB, 1024) * MB,
    maxBookPages: num(env.MAX_BOOK_PAGES, 1000),
  };
}

/** ブラウザがPDFを送るときの1回の大きさ。R2の分割アップロードは最後以外を同じ大きさにする必要がある。 */
export const UPLOAD_PART_BYTES = 10 * 1024 * 1024;

/** 1章の本文の上限【仮: 1MB】。 */
export const MAX_CHAPTER_BYTES = 1024 * 1024;

export const byteLength = (s: string) => new TextEncoder().encode(s).length;
