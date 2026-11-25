import { normalizeForHash, sha256Hex } from "./hash.js";

// ponytail: 複数行の文字列の中の `//` 行も落ちる。雛形では起きない。文字列を見るなら字句解析に替える。
export function withoutLineComments(text: string): string {
  return text
    .split(/\r\n|\n|\r/)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed.length > 0 && !trimmed.startsWith("//");
    })
    .join("\n");
}

export async function starterCodeHash(bytes: Uint8Array): Promise<string> {
  const text = new TextDecoder().decode(normalizeForHash(bytes));
  return sha256Hex(new TextEncoder().encode(withoutLineComments(text)));
}
