import { describe, expect, it } from "vitest";
import { looksBinary, normalizeForHash } from "./hash.js";

const encode = (text: string) => new TextEncoder().encode(text);
const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("normalizeForHash", () => {
  it("CRLF を LF にそろえ、BOM を外す", () => {
    const withCrlf = new Uint8Array([0xef, 0xbb, 0xbf, ...encode("a\r\nb\r\n")]);
    expect(decode(normalizeForHash(withCrlf))).toBe("a\nb\n");
  });

  it("CRLF と LF の内容が同じハッシュの元になる", () => {
    expect(normalizeForHash(encode("x\r\ny"))).toEqual(normalizeForHash(encode("x\ny")));
  });

  it("単独の CR は残す", () => {
    expect(decode(normalizeForHash(encode("a\rb")))).toBe("a\rb");
  });

  it("バイナリはそのまま", () => {
    const binary = new Uint8Array([0x89, 0x50, 0x00, 0x0d, 0x0a]);
    expect(looksBinary(binary)).toBe(true);
    expect(normalizeForHash(binary)).toBe(binary);
  });
});
