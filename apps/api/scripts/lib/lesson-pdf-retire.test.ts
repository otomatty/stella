import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import { retireLessonPdfs } from "./lesson-pdf-retire.js";

const account = "a".repeat(32);
const databaseId = "11111111-1111-4111-8111-111111111111";
const token = "test-token";
const bucket = `https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets/stella-materials-public`;
const objectsUrl = `${bucket}/objects`;
const lifecycleUrl = `${bucket}/lifecycle`;
const d1Url = `https://api.cloudflare.com/client/v4/accounts/${account}/d1/database/${databaseId}/query`;

const defaultRule = {
  id: "Default Multipart Abort Rule",
  enabled: true,
  conditions: {},
  abortMultipartUploadsTransition: { condition: { type: "Age", maxAge: 604800 } },
};

const ourRule = {
  id: "retire-lesson-pdf-2026-11",
  enabled: true,
  conditions: { prefix: "lesson-pdf/" },
  deleteObjectsTransition: { condition: { type: "Age", maxAge: 86400 } },
  abortMultipartUploadsTransition: { condition: { type: "Age", maxAge: 86400 } },
};

type Page = { objects: { key: string; size: number }[]; cursor?: string };

function materialsDb(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    create table lesson_materials (path text, source text);
    create table lesson_material_versions (path text);
    insert into lesson_materials values ('lesson-pdf/a.pdf', 'auto');
    insert into lesson_material_versions values ('lesson-pdf/a.pdf');
  `);
  return db;
}

function harness(options: {
  pages: Page[];
  db?: DatabaseSync | null;
  rules?: unknown[];
  onLifecycle?: (method: string) => Response;
}) {
  let pageIndex = 0;
  const fetcher = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method === "DELETE") throw new Error("DELETE is not allowed");
    if (url.startsWith(objectsUrl)) {
      const page = options.pages[pageIndex++];
      if (!page) throw new Error("unexpected objects page");
      return Response.json({
        success: true,
        result: page.objects,
        result_info: {
          is_truncated: page.cursor !== undefined,
          ...(page.cursor !== undefined ? { cursor: page.cursor } : {}),
        },
      });
    }
    if (url === d1Url && method === "POST") {
      const sql = JSON.parse(String(init?.body)).sql as string;
      if (!options.db) {
        if (!sql.includes("sqlite_master")) throw new Error(`unexpected sql: ${sql}`);
        return Response.json({ success: true, result: [{ success: true, results: [] }] });
      }
      return Response.json({
        success: true,
        result: [{ success: true, results: options.db.prepare(sql).all() }],
      });
    }
    if (url === lifecycleUrl) {
      if (options.onLifecycle) return options.onLifecycle(method);
      if (method === "GET") {
        return Response.json({ success: true, result: { rules: options.rules ?? [defaultRule] } });
      }
      if (method === "PUT") return Response.json({ success: true });
    }
    throw new Error(`unexpected ${method} ${url}`);
  });
  return fetcher;
}

async function run(
  fetcher: ReturnType<typeof harness>,
  logs: string[] = [],
  ids: { accountId?: string; databaseId?: string; apiToken?: string } = {},
) {
  await retireLessonPdfs({
    accountId: ids.accountId ?? account,
    databaseId: ids.databaseId ?? databaseId,
    apiToken: ids.apiToken ?? token,
    fetchImpl: fetcher,
    log: (message) => logs.push(message),
  });
}

describe("retire lesson PDF storage", () => {
  it("lists every page, keeps the existing rule, and schedules lesson-pdf/ only", async () => {
    const db = materialsDb();
    const logs: string[] = [];
    const fetcher = harness({
      db,
      pages: [
        { objects: [{ key: "lesson-pdf/a.pdf", size: 100 }, { key: "lesson-pdf/b.pdf", size: 50 }], cursor: "next" },
        { objects: [{ key: "lesson-pdf/c.pdf", size: 25 }] },
      ],
    });
    const timeout = vi.spyOn(AbortSignal, "timeout");
    try {
      await run(fetcher, logs);
      const first = new URL(String(fetcher.mock.calls[0]?.[0]));
      expect(first.pathname).toBe(`/client/v4/accounts/${account}/r2/buckets/stella-materials-public/objects`);
      expect(first.searchParams.get("prefix")).toBe("lesson-pdf/");
      expect(first.searchParams.get("per_page")).toBe("1000");
      expect(first.searchParams.get("delimiter")).toBeNull();
      const second = new URL(String(fetcher.mock.calls[1]?.[0]));
      expect(second.searchParams.get("cursor")).toBe("next");
      expect(logs).toContain("lesson-pdf/: 3 オブジェクト、175 bytes");
      expect(logs).toContain("lesson_materials: 1 行");
      expect(logs).toContain("lesson_material_versions: 1 行");
      expect(logs).toContain("lesson-pdf/ の削除を 1 日後に予約した。");
      const methods = fetcher.mock.calls.map((call) => (call[1] as RequestInit).method);
      expect(methods).not.toContain("DELETE");
      const put = fetcher.mock.calls.find((call) => (call[1] as RequestInit).method === "PUT");
      expect(String(put?.[0])).toBe(lifecycleUrl);
      expect(JSON.parse(String((put?.[1] as RequestInit).body))).toEqual({
        rules: [defaultRule, ourRule],
      });
      expect((fetcher.mock.calls[0]?.[1] as RequestInit).redirect).toBe("error");
      expect((fetcher.mock.calls[0]?.[1] as RequestInit).headers).toEqual({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      });
      expect(timeout.mock.calls.length).toBeGreaterThan(0);
      expect(timeout.mock.calls.every((call) => call[0] === 30_000)).toBe(true);
      expect(fetcher.mock.calls.some((call) => String(call[0]) === d1Url)).toBe(true);
    } finally {
      timeout.mockRestore();
      db.close();
    }
  });

  it("continues when the tables are already gone and does not rewrite an existing rule", async () => {
    const logs: string[] = [];
    const fetcher = harness({
      pages: [{ objects: [{ key: "lesson-pdf/a.pdf", size: 10 }] }],
      rules: [defaultRule, ourRule],
    });
    await run(fetcher, logs);
    expect(logs).toContain("配布資料の表はもう無い。");
    expect(logs).toContain("lesson-pdf/ の削除は予約済み。");
    expect(fetcher.mock.calls.map((call) => (call[1] as RequestInit).method)).not.toContain("PUT");
    expect(fetcher.mock.calls.map((call) => (call[1] as RequestInit).method)).not.toContain("DELETE");
  });

  it("fails before writing lifecycle when a row is not auto or leaves the prefix", async () => {
    const db = new DatabaseSync(":memory:");
    db.exec(`
      create table lesson_materials (path text, source text);
      create table lesson_material_versions (path text);
      insert into lesson_materials values
        ('lesson-pdf/ok.pdf', 'auto'),
        ('lesson-pdf/uploaded.pdf', 'upload'),
        ('Lesson-pdf/case.pdf', 'auto'),
        ('tenant/ses/other.pdf', 'auto'),
        (null, 'auto');
      insert into lesson_material_versions values
        ('lesson-pdf/ok.pdf'),
        ('tenant/ses/version.pdf');
    `);
    const logs: string[] = [];
    const fetcher = harness({
      db,
      pages: [{ objects: [{ key: "lesson-pdf/ok.pdf", size: 1 }] }],
    });
    try {
      await expect(run(fetcher, logs)).rejects.toThrow(
        "配布資料に自動生成以外、または lesson-pdf/ 以外のパスがあるため、ライフサイクルを書きません",
      );
      const paths = logs.filter((line) => line.startsWith("配布資料の対象外: ")).map((line) => line.slice("配布資料の対象外: ".length));
      expect(paths).toEqual(expect.arrayContaining([
        "lesson-pdf/uploaded.pdf",
        "Lesson-pdf/case.pdf",
        "tenant/ses/other.pdf",
        "(null)",
        "tenant/ses/version.pdf",
      ]));
      expect(paths).not.toContain("lesson-pdf/ok.pdf");
      expect(fetcher.mock.calls.some((call) => String(call[0]) === lifecycleUrl)).toBe(false);
    } finally {
      db.close();
    }
  });

  it("logs at most 20 paths", async () => {
    const db = new DatabaseSync(":memory:");
    const values = Array.from({ length: 25 }, (_, i) => `('lesson-pdf/bad-${i}.pdf', 'upload')`).join(", ");
    db.exec(`
      create table lesson_materials (path text, source text);
      create table lesson_material_versions (path text);
      insert into lesson_materials values ${values};
    `);
    const logs: string[] = [];
    const fetcher = harness({ db, pages: [{ objects: [] }] });
    try {
      await expect(run(fetcher, logs)).rejects.toThrow("ライフサイクルを書きません");
      expect(logs.filter((line) => line.startsWith("配布資料の対象外: "))).toHaveLength(20);
      expect(fetcher.mock.calls.some((call) => String(call[0]) === lifecycleUrl)).toBe(false);
    } finally {
      db.close();
    }
  });

  it("fails when a listed key is outside lesson-pdf/", async () => {
    const fetcher = harness({
      pages: [{ objects: [{ key: "tenant/ses/figure.svg", size: 4 }] }],
    });
    await expect(run(fetcher)).rejects.toThrow("lesson-pdf/ 以外のキーがありました");
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it("fails when the cursor repeats and does not query D1", async () => {
    const fetcher = harness({
      pages: [
        { objects: [{ key: "lesson-pdf/a.pdf", size: 1 }], cursor: "same" },
        { objects: [{ key: "lesson-pdf/b.pdf", size: 1 }], cursor: "same" },
      ],
    });
    await expect(run(fetcher)).rejects.toThrow("オブジェクト一覧のカーソルが繰り返しました");
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.some((call) => String(call[0]) === d1Url)).toBe(false);
  });

  it("fails when a truncated page has no cursor", async () => {
    const fetcher = harness({
      pages: [{ objects: [{ key: "lesson-pdf/a.pdf", size: 1 }], cursor: "" }],
    });
    await expect(run(fetcher)).rejects.toThrow("オブジェクト一覧のカーソルが繰り返しました");
  });

  it("does not PUT when a delete rule targets another prefix", async () => {
    const fetcher = harness({
      pages: [{ objects: [] }],
      rules: [
        defaultRule,
        {
          id: "other",
          enabled: true,
          conditions: { prefix: "tenant/" },
          deleteObjectsTransition: { condition: { type: "Age", maxAge: 86400 } },
        },
      ],
    });
    await expect(run(fetcher)).rejects.toThrow(
      "lesson-pdf/ 以外を消すライフサイクルがあるため、ルールを書きません",
    );
    expect(fetcher.mock.calls.map((call) => (call[1] as RequestInit).method)).not.toContain("PUT");
    expect(fetcher.mock.calls.map((call) => (call[1] as RequestInit).method)).not.toContain("DELETE");
  });

  it("does not PUT when the lesson-pdf rule itself would delete another prefix", async () => {
    const fetcher = harness({
      pages: [{ objects: [] }],
      rules: [
        {
          ...ourRule,
          conditions: { prefix: "lesson-pdf/ses/" },
        },
      ],
    });
    await expect(run(fetcher)).rejects.toThrow("ルールを書きません");
    expect(fetcher.mock.calls.map((call) => (call[1] as RequestInit).method)).not.toContain("PUT");
  });

  it.each(["", "a".repeat(31), "g".repeat(32), "../other-account"])(
    "rejects an invalid account before fetching: %s",
    async (accountId) => {
      const fetcher = harness({ pages: [] });
      await expect(run(fetcher, [], { accountId })).rejects.toThrow(
        "Cloudflare のアカウントと API トークンが必要です",
      );
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it.each(["", "not-a-uuid", "00000000-0000-0000-0000-000000000000"])(
    "rejects an invalid database id before fetching: %s",
    async (id) => {
      const fetcher = harness({ pages: [] });
      await expect(run(fetcher, [], { databaseId: id })).rejects.toThrow("D1 の database id が無効です");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );

  it("rejects an empty token", async () => {
    const fetcher = harness({ pages: [] });
    await expect(run(fetcher, [], { apiToken: "  " })).rejects.toThrow(
      "Cloudflare のアカウントと API トークンが必要です",
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("exposes only Cloudflare codes and messages", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        { success: false, errors: [{ code: 10000, message: `Authentication error ${token}` }], private: "do not log" },
        { status: 403 },
      ),
    );
    await expect(run(fetcher)).rejects.toThrow("10000: Authentication error [redacted]");
  });

  it("does not leak network errors or non-JSON response bodies", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValueOnce(new Error(`private ${token}`));
    await expect(run(fetcher)).rejects.toThrow(
      "配布資料のリクエストに失敗しました（ネットワークまたは時間切れ）",
    );
    fetcher.mockResolvedValueOnce(new Response(`private ${token}`, { status: 502 }));
    await expect(run(fetcher)).rejects.toThrow("配布資料のリクエストに失敗しました: HTTP 502");
  });
});
