import { describe, expect, it } from "vitest";
import { sha256Hex } from "./hash.js";
import { starterCodeHash, withoutLineComments } from "./starter-code.js";

describe("雛形の行コメント", () => {
  it("空行と行全体の // を落とし、残りの行は無変更でつなぐ", () => {
    expect(
      withoutLineComments("  // note\n\nkeep\r\n//tail\rcode // stays\n  \n# hash\n/* block */"),
    ).toBe("keep\ncode // stays\n# hash\n/* block */");
  });

  it("行コメントと改行だけではハッシュが変わらず、コードが変わると変わる", async () => {
    const code = "export const value = 0;\n";
    const commented = `// note\r\n\r\n${code.replace(/\n/g, "\r\n")}`;
    const original = await starterCodeHash(new TextEncoder().encode(code));
    expect(await starterCodeHash(new TextEncoder().encode(commented))).toBe(original);
    expect(await starterCodeHash(new TextEncoder().encode("export const value = 1;\n"))).not.toBe(
      original,
    );
    expect(original).toBe(await sha256Hex(new TextEncoder().encode(withoutLineComments(code))));
  });
});
