import { describe, expect, it } from "vitest";

import { parseAccountId, parseD1DatabaseId, readWranglerToml } from "./wrangler-config.js";

const TOML = `name = "stella-api"
account_id = "acct"

[vars]
CLOUDFLARE_ACCOUNT_ID = "vars-must-not-win"
account_id = "vars-must-not-win"

[[d1_databases]]
binding = "DB"
database_name = "other-db"
database_id = "other-id"

[[d1_databases]]
binding = "DB"
database_name = "stella-db"
database_id = "db-id"
`;

describe("parseAccountId", () => {
  it("トップレベルのものだけを読む ([vars] の同名は拾わない)", () => {
    expect(parseAccountId(TOML)).toBe("acct");
  });
});

describe("parseD1DatabaseId", () => {
  it("database_name が一致するブロックの id を読む", () => {
    expect(parseD1DatabaseId(TOML, "stella-db")).toBe("db-id");
    expect(parseD1DatabaseId(TOML, "other-db")).toBe("other-id");
  });

  it("知らない名前は undefined", () => {
    expect(parseD1DatabaseId(TOML, "missing")).toBeUndefined();
  });
});

describe("readWranglerToml", () => {
  /**
   * 指紋は seed の宛先 D1 を含む。実ファイルから id を引けなくなると、その回だけ
   * 「宛先が変わっていない」と誤認する余地ができるので、実物で読めることを見る。
   */
  it("実際の apps/api/wrangler.toml から stella-db の id が引ける", () => {
    const toml = readWranglerToml();
    expect(parseAccountId(toml)).toMatch(/^[0-9a-f]{8,}$/);
    expect(parseD1DatabaseId(toml, "stella-db")).toMatch(/^[0-9a-f-]{36}$/);
  });
});
