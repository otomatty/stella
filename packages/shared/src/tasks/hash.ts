/**
 * 提出ファイルと配布ファイルの内容ハッシュを取る前の正規化。
 *
 * Windows では Git の改行変換 (core.autocrlf) で、配布したテストが CRLF に
 * なることがある。そのまま比べると、受講者が何も触っていないのに「テストが
 * 改変された」と判定してしまう。そこでテキストは BOM を外し、CRLF を LF に
 * そろえてからハッシュを取る。拡張 (Node の crypto) とサーバー (Web Crypto) の
 * どちらも、この関数を通してから SHA-256 を取る。
 */

/** 先頭 8000 バイトに NUL があればバイナリとみなす (Git と同じ目安)。 */
export function looksBinary(bytes: Uint8Array): boolean {
  const end = Math.min(bytes.length, 8000);
  for (let i = 0; i < end; i++) {
    if (bytes[i] === 0) return true;
  }
  return false;
}

export function normalizeForHash(bytes: Uint8Array): Uint8Array {
  if (looksBinary(bytes)) return bytes;
  let start = 0;
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    start = 3;
  }
  const out = new Uint8Array(bytes.length - start);
  let length = 0;
  for (let i = start; i < bytes.length; i++) {
    const byte = bytes[i] as number;
    if (byte === 0x0d && bytes[i + 1] === 0x0a) continue;
    out[length++] = byte;
  }
  return out.subarray(0, length);
}
