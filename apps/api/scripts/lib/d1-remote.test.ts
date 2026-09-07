import { describe, expect, it, vi } from "vitest";

import {
  MAX_CHUNK_BYTES,
  chunkStatements,
  executeChunks,
  parseD1Config,
  splitSqlStatements,
} from "./d1-remote.js";

const WRANGLER_TOML = `name = "stella-api"
account_id = "acct-from-toml"

[vars]
CLOUDFLARE_ACCOUNT_ID = "vars-account-must-not-win"

[[d1_databases]]
binding = "DB"
database_name = "other-db"
database_id = "other-id"

[[d1_databases]]
binding = "DB"
database_name = "stella-db"
database_id = "db-id"
`;

function okResponse(): Response {
  return new Response(JSON.stringify({ success: true, result: [] }), { status: 200 });
}

describe("splitSqlStatements", () => {
  it("文字列リテラルの中のセミコロンでは切らない", () => {
    const sql = "insert into t values ('a;b');\ninsert into t values ('c');\n";
    expect(splitSqlStatements(sql)).toEqual([
      "insert into t values ('a;b');",
      "insert into t values ('c');",
    ]);
  });

  it("エスケープされた引用符 ('') をリテラルの終わりと誤らない", () => {
    const sql = "insert into t values ('it''s; fine');\nselect 1;\n";
    expect(splitSqlStatements(sql)).toEqual(["insert into t values ('it''s; fine');", "select 1;"]);
  });
});

describe("chunkStatements", () => {
  it("上限を超えないところで区切り、文の順序は保つ", () => {
    const statements = ["a".repeat(40), "b".repeat(40), "c".repeat(40)];
    const chunks = chunkStatements(statements, 100);
    expect(chunks).toHaveLength(2);
    expect(chunks.join("")).toContain("a".repeat(40));
    expect(chunks[0]?.indexOf("b")).toBeGreaterThan(-1);
    expect(chunks[1]?.startsWith("c")).toBe(true);
    for (const chunk of chunks) expect(Buffer.byteLength(chunk)).toBeLessThanOrEqual(100);
  });

  it("1 文で上限を超えるものは落とす (黙って D1 に投げない)", () => {
    expect(() => chunkStatements(["x".repeat(MAX_CHUNK_BYTES + 1)], MAX_CHUNK_BYTES)).toThrow(
      /exceeds chunk limit/,
    );
  });
});

describe("parseD1Config", () => {
  it("database_name が一致するブロックの database_id を読む", () => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "");
    expect(parseD1Config(WRANGLER_TOML, "stella-db")).toEqual({
      accountId: "acct-from-toml",
      databaseId: "db-id",
    });
    vi.unstubAllEnvs();
  });

  it("CLOUDFLARE_ACCOUNT_ID が env にあればそちらを使う", () => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "acct-from-env");
    expect(parseD1Config(WRANGLER_TOML, "stella-db").accountId).toBe("acct-from-env");
    vi.unstubAllEnvs();
  });

  it("知らない database_name は落とす", () => {
    expect(() => parseD1Config(WRANGLER_TOML, "missing-db")).toThrow(/database_id/);
  });
});

describe("executeChunks", () => {
  const base = { accountId: "a", databaseId: "d", apiToken: "t", retryDelayMs: 0 };

  it("チャンクを順番どおり 1 本ずつ投げる", async () => {
    const sent: string[] = [];
    const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)).sql);
      return okResponse();
    }) as unknown as typeof fetch;
    await executeChunks({ ...base, fetchImpl }, ["one;\n", "two;\n", "three;\n"]);
    expect(sent).toEqual(["one;\n", "two;\n", "three;\n"]);
  });

  it("D1 の URL と Bearer 認証で叩く", async () => {
    let url = "";
    let auth: string | undefined;
    const fetchImpl = vi.fn(async (u: string, init?: RequestInit) => {
      url = u;
      auth = ((init?.headers ?? {}) as Record<string, string>).Authorization;
      return okResponse();
    }) as unknown as typeof fetch;
    await executeChunks({ ...base, fetchImpl }, ["select 1;\n"]);
    expect(url).toBe("https://api.cloudflare.com/client/v4/accounts/a/d1/database/d/query");
    expect(auth).toBe("Bearer t");
  });

  it("SQL エラーは再送せず、何チャンク目かを付けて落とす", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      if (calls === 1) return okResponse();
      return new Response(
        JSON.stringify({ success: false, errors: [{ code: 7500, message: "no such table" }] }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    await expect(
      executeChunks({ ...base, fetchImpl }, ["ok;\n", "insert into missing values (1);\n"]),
    ).rejects.toThrow(/2\/2 チャンク目.*no such table/s);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("封筒が成功でも result の要素が失敗していれば成功にしない", async () => {
    // ここを見落とすと、落ちた seed を通ったことにして指紋を記録し、
    // 次のデプロイが欠けた教材を飛ばす。
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            errors: [],
            result: [
              { success: true, results: [] },
              { success: false, error: "UNIQUE constraint failed" },
            ],
          }),
          { status: 200 },
        ),
    ) as unknown as typeof fetch;
    await expect(executeChunks({ ...base, fetchImpl }, ["insert …;\n"])).rejects.toThrow(
      /UNIQUE constraint failed/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("5xx は再送する", async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls++;
      return calls === 1 ? new Response("boom", { status: 503 }) : okResponse();
    }) as unknown as typeof fetch;
    await executeChunks({ ...base, fetchImpl }, ["select 1;\n"]);
    expect(calls).toBe(2);
  });

  it("再送しても直らなければ成功にしない", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNRESET");
    }) as unknown as typeof fetch;
    await expect(executeChunks({ ...base, fetchImpl }, ["select 1;\n"])).rejects.toThrow(
      /ECONNRESET/,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});
