export const MATERIALS_BUCKET_NAME = "stella-materials-public";
export const LESSON_PDF_PREFIX = "lesson-pdf/";
export const LESSON_PDF_RULE_ID = "retire-lesson-pdf-2026-11";

const PLACEHOLDER_DATABASE_ID = "00000000-0000-0000-0000-000000000000";
const DAY_SECONDS = 86_400;

export const lessonPdfRetirementRule = {
  id: LESSON_PDF_RULE_ID,
  enabled: true,
  conditions: { prefix: LESSON_PDF_PREFIX },
  deleteObjectsTransition: { condition: { type: "Age", maxAge: DAY_SECONDS } },
  abortMultipartUploadsTransition: { condition: { type: "Age", maxAge: DAY_SECONDS } },
};

const BAD_MATERIAL_SQL =
  "select path from lesson_materials where source is null or source <> 'auto' or path is null or instr(path, 'lesson-pdf/') <> 1 limit 20";
const BAD_VERSION_SQL =
  "select path from lesson_material_versions where path is null or instr(path, 'lesson-pdf/') <> 1 limit 20";

type CfError = { code?: number; message?: string };
type CfBody = {
  success?: boolean;
  errors?: CfError[];
  result?: unknown;
  result_info?: { cursor?: unknown; is_truncated?: unknown };
};

type Log = (message: string) => void;

/** CI only: schedule deletion of lesson-pdf/ in the public materials bucket. Never deletes the bucket. */
export async function retireLessonPdfs(input: {
  accountId: string;
  databaseId: string;
  apiToken: string;
  fetchImpl?: typeof fetch;
  log?: Log;
}): Promise<void> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const log = input.log ?? console.log;
  const { accountId, databaseId, apiToken } = input;
  if (!/^[a-f0-9]{32}$/i.test(accountId) || !apiToken.trim()) {
    throw new Error("Cloudflare のアカウントと API トークンが必要です");
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(databaseId) ||
    databaseId.toLowerCase() === PLACEHOLDER_DATABASE_ID
  ) {
    throw new Error("D1 の database id が無効です");
  }

  const bucketBase = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${MATERIALS_BUCKET_NAME}`;
  const d1Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  function redact(message: string): string {
    return message
      .split(apiToken)
      .join("[redacted]")
      .replace(/[\r\n]/g, " ");
  }

  function errorText(response: Response, data: CfBody | null): string {
    const details = Array.isArray(data?.errors)
      ? data.errors
          .map((error) => {
            const code = typeof error?.code === "number" ? String(error.code) : "unknown";
            const message =
              typeof error?.message === "string" ? redact(error.message) : "不明なエラー";
            return `${code}: ${message}`;
          })
          .join("; ")
      : "";
    return details || `配布資料のリクエストに失敗しました: HTTP ${response.status}`;
  }

  async function call(
    method: string,
    url: string,
    body?: unknown,
  ): Promise<{ response: Response; data: CfBody | null }> {
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(30_000),
        redirect: "error",
      });
    } catch {
      throw new Error("配布資料のリクエストに失敗しました（ネットワークまたは時間切れ）");
    }
    const data = (await response.json().catch(() => null)) as CfBody | null;
    return { response, data };
  }

  function failed(response: Response, data: CfBody | null): never {
    throw new Error(errorText(response, data));
  }

  async function listPage(cursor?: string): Promise<{
    objects: { key: string; size: number }[];
    truncated: boolean;
    cursor?: string;
  }> {
    const url = new URL(`${bucketBase}/objects`);
    url.searchParams.set("prefix", LESSON_PDF_PREFIX);
    url.searchParams.set("per_page", "1000");
    if (cursor !== undefined) url.searchParams.set("cursor", cursor);
    const { response, data } = await call("GET", url.toString());
    if (!response.ok || data?.success !== true) failed(response, data);
    if (!data || !Array.isArray(data.result)) throw new Error("オブジェクト一覧の形式が不正です");
    const flag = data.result_info?.is_truncated;
    let truncated: boolean;
    if (flag === true || flag === "true") truncated = true;
    else if (flag === false || flag === "false" || flag === undefined) truncated = false;
    else throw new Error("オブジェクト一覧の形式が不正です");
    const objects: { key: string; size: number }[] = [];
    for (const row of data.result) {
      if (typeof row !== "object" || row === null)
        throw new Error("オブジェクト一覧の形式が不正です");
      const key = (row as { key?: unknown }).key;
      const size = (row as { size?: unknown }).size;
      if (typeof key !== "string" || !key.startsWith(LESSON_PDF_PREFIX)) {
        throw new Error("lesson-pdf/ 以外のキーがありました");
      }
      if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
        throw new Error("オブジェクトのサイズが不正です");
      }
      objects.push({ key, size });
    }
    const next = data.result_info?.cursor;
    return {
      objects,
      truncated,
      cursor: typeof next === "string" && next !== "" ? next : undefined,
    };
  }

  const seen = new Set<string>();
  let cursor: string | undefined;
  let count = 0;
  let bytes = 0;
  for (;;) {
    const page = await listPage(cursor);
    for (const object of page.objects) {
      count += 1;
      bytes += object.size;
    }
    if (!page.truncated) break;
    if (page.cursor === undefined || seen.has(page.cursor)) {
      throw new Error("オブジェクト一覧のカーソルが繰り返しました");
    }
    seen.add(page.cursor);
    cursor = page.cursor;
  }
  log(`lesson-pdf/: ${count} オブジェクト、${bytes} bytes`);

  async function d1(sql: string): Promise<Record<string, unknown>[]> {
    const { response, data } = await call("POST", d1Url, { sql });
    if (!response.ok || data?.success !== true) failed(response, data);
    if (!data || !Array.isArray(data.result)) throw new Error("D1 の応答の形式が不正です");
    const statement = data.result[0];
    if (typeof statement !== "object" || statement === null) {
      throw new Error("D1 の応答の形式が不正です");
    }
    const row = statement as { success?: boolean; error?: unknown; results?: unknown };
    if (row.success === false) {
      const message = typeof row.error === "string" ? redact(row.error) : "";
      throw new Error(message || "D1 の問い合わせに失敗しました");
    }
    if (!Array.isArray(row.results)) throw new Error("D1 の応答の形式が不正です");
    return row.results.filter(
      (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
    );
  }

  function countOf(rows: Record<string, unknown>[]): number {
    const n = rows[0]?.n;
    if (typeof n === "number" && Number.isFinite(n)) return n;
    if (typeof n === "string" && /^\d+$/.test(n)) return Number(n);
    throw new Error("件数の形式が不正です");
  }

  const tables = await d1(
    "select name from sqlite_master where type = 'table' and name in ('lesson_materials', 'lesson_material_versions')",
  );
  const names = new Set(
    tables.map((row) => row.name).filter((name): name is string => typeof name === "string"),
  );
  const hasMaterials = names.has("lesson_materials");
  const hasVersions = names.has("lesson_material_versions");
  if (!hasMaterials && !hasVersions) {
    log("配布資料の表はもう無い。");
  } else {
    if (hasMaterials) {
      const n = countOf(await d1("select count(*) as n from lesson_materials"));
      log(`lesson_materials: ${n} 行`);
    }
    if (hasVersions) {
      const n = countOf(await d1("select count(*) as n from lesson_material_versions"));
      log(`lesson_material_versions: ${n} 行`);
    }
    const bad: string[] = [];
    async function collect(sql: string) {
      if (bad.length >= 20) return;
      for (const row of await d1(sql)) {
        if (bad.length >= 20) return;
        bad.push(typeof row.path === "string" ? row.path : "(null)");
      }
    }
    if (hasMaterials) await collect(BAD_MATERIAL_SQL);
    if (hasVersions) await collect(BAD_VERSION_SQL);
    if (bad.length > 0) {
      for (const path of bad) log(`配布資料の対象外: ${path}`);
      throw new Error(
        "配布資料に自動生成以外、または lesson-pdf/ 以外のパスがあるため、ライフサイクルを書きません",
      );
    }
  }

  const existing = await call("GET", `${bucketBase}/lifecycle`);
  if (!existing.response.ok || existing.data?.success !== true)
    failed(existing.response, existing.data);
  const result = existing.data?.result;
  const rules =
    typeof result === "object" &&
    result !== null &&
    Array.isArray((result as { rules?: unknown }).rules)
      ? (result as { rules: unknown[] }).rules
      : null;
  if (!rules) throw new Error("ライフサイクルの形式が不正です");

  function deletesObjects(rule: unknown): boolean {
    return (
      typeof rule === "object" &&
      rule !== null &&
      (rule as { deleteObjectsTransition?: unknown }).deleteObjectsTransition != null
    );
  }
  function prefixOf(rule: unknown): string {
    if (typeof rule !== "object" || rule === null) return "";
    const prefix = (rule as { conditions?: { prefix?: unknown } }).conditions?.prefix;
    return typeof prefix === "string" ? prefix : "";
  }
  function ageOf(transition: unknown): number | undefined {
    if (typeof transition !== "object" || transition === null) return undefined;
    const condition = (transition as { condition?: { type?: unknown; maxAge?: unknown } })
      .condition;
    if (condition?.type !== "Age" || typeof condition.maxAge !== "number") return undefined;
    return condition.maxAge;
  }
  function isOurRule(rule: unknown): boolean {
    return (
      typeof rule === "object" &&
      rule !== null &&
      (rule as { id?: unknown }).id === LESSON_PDF_RULE_ID
    );
  }
  function sameRule(rule: unknown): boolean {
    if (!isOurRule(rule) || typeof rule !== "object" || rule === null) return false;
    const body = rule as {
      enabled?: unknown;
      deleteObjectsTransition?: unknown;
      abortMultipartUploadsTransition?: unknown;
    };
    return (
      body.enabled === true &&
      prefixOf(rule) === LESSON_PDF_PREFIX &&
      ageOf(body.deleteObjectsTransition) === DAY_SECONDS &&
      ageOf(body.abortMultipartUploadsTransition) === DAY_SECONDS
    );
  }

  for (const rule of rules) {
    if (deletesObjects(rule) && prefixOf(rule) !== LESSON_PDF_PREFIX) {
      throw new Error("lesson-pdf/ 以外を消すライフサイクルがあるため、ルールを書きません");
    }
  }
  const index = rules.findIndex(isOurRule);
  if (index >= 0 && sameRule(rules[index])) {
    log("lesson-pdf/ の削除は予約済み。");
    return;
  }
  const next = rules.slice();
  if (index >= 0) next[index] = lessonPdfRetirementRule;
  else next.push(lessonPdfRetirementRule);
  const scheduled = await call("PUT", `${bucketBase}/lifecycle`, { rules: next });
  if (!scheduled.response.ok || scheduled.data?.success !== true) {
    failed(scheduled.response, scheduled.data);
  }
  log("lesson-pdf/ の削除を 1 日後に予約した。");
}
