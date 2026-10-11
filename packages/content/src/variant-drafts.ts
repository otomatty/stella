/**
 * AI で類題の下書きを作る (#69・07 §7.3)。ここは API を呼ばない部分 (何を何問作るか・名前・
 * 下書きのファイルの検査・プロンプト・見積もり) で、呼び出しと検査は
 * `scripts/lib/variant-draft-run.ts`、CLI は `scripts/draft-variants.ts`。
 *
 * - 何を作るか: 親の課題にテンプレートがあり、作る種別がテンプレートの種別と同じなら、
 *   `params.json` に足す値だけを作らせる。テンプレートが無い (種別が違う) なら類題 1 問を丸ごと。
 * - 何問作るか: 種別と数を省けば、その課題の在庫が補習 3 問・確認用 3 問に足りない分。
 * - 1 回の実行で 20 問まで。
 */

import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { TaskKind } from "../../shared/src/tasks/manifest.js";
import {
  CHECK_VARIANT_KINDS,
  REMEDIAL_VARIANT_COUNT,
  REMEDIAL_VARIANT_KINDS,
  variantKindProblem,
} from "../../shared/src/tasks/variants.js";
import { sortNatural } from "./natural-order.mjs";
import {
  generatedVariantsOf,
  type VariantParamValue,
  type VariantParams,
  variantTemplatesOf,
} from "./variant-templates.js";

/** 1 回の実行で作る類題の上限 (費用の上限、#69 の決定)。 */
export const MAX_DRAFTS_PER_RUN = 20;
/** 在庫の目標。補習は支援付きの受講者に 3 問ずつ、確認用は時間を空けた 3 回分。 */
export const DRAFT_TARGET = { remedial: REMEDIAL_VARIANT_COUNT, check: 3 } as const;
/** 種別を省いたときに作る種別。 */
const DEFAULT_KIND = { remedial: "basic", check: "independent" } as const satisfies Record<
  "remedial" | "check",
  TaskKind
>;

/** 課題の在庫 (手で書いた類題と、テンプレートで作る類題)。 */
export interface VariantStock {
  /** 使っている類題の名前 (新しい名前と重ねない)。 */
  names: string[];
  remedial: number;
  check: number;
}

function kindOf(taskJson: string | Buffer | undefined): string | undefined {
  if (taskJson === undefined) return undefined;
  try {
    const kind = (JSON.parse(taskJson.toString()) as { kind?: unknown }).kind;
    return typeof kind === "string" ? kind : undefined;
  } catch {
    return undefined;
  }
}

/** 課題の `private/variants/` と、テンプレートで作る類題から在庫を数える。 */
export function variantStockOf(taskDir: string): VariantStock {
  const kinds = new Map<string, string | undefined>();
  const variantsDir = join(taskDir, "private/variants");
  if (existsSync(variantsDir))
    for (const name of sortNatural(readdirSync(variantsDir))) {
      const path = join(variantsDir, name);
      if (!lstatSync(path).isDirectory()) continue;
      const taskJson = join(path, "task.json");
      kinds.set(name, existsSync(taskJson) ? kindOf(readFileSync(taskJson)) : undefined);
    }
  for (const [name, files] of generatedVariantsOf(taskDir))
    kinds.set(name, kindOf(files["task.json"]));
  const stock: VariantStock = { names: [...kinds.keys()], remedial: 0, check: 0 };
  for (const kind of kinds.values()) {
    if (REMEDIAL_VARIANT_KINDS.includes(kind as TaskKind)) stock.remedial += 1;
    else if (CHECK_VARIANT_KINDS.includes(kind as TaskKind)) stock.check += 1;
  }
  return stock;
}

/** テンプレートの名前と、それが作る類題の種別。 */
export interface TemplateKind {
  name: string;
  kind: string | undefined;
}

/** 課題のテンプレートの種別 (テンプレートの task.json の kind)。 */
export function templateKindsOf(taskDir: string): TemplateKind[] {
  // 値の組が 1 つも無いテンプレートは種別もキーも分からないので、値だけを作らせない。
  return variantTemplatesOf(taskDir).flatMap((template) => {
    const first = [...template.variants.values()][0];
    if (!first) return [];
    return [{ name: template.dir.split(/[/\\]/).at(-1) ?? "", kind: kindOf(first["task.json"]) }];
  });
}

/** 1 回の依頼で作る類題のまとまり (同じ種別・同じ作り方)。 */
export interface DraftGroup {
  kind: TaskKind;
  count: number;
  /** 値だけを作らせるテンプレートの名前。null なら類題を丸ごと作らせる。 */
  template: string | null;
}

/**
 * 何を何問作るかを決める。`kind` を省けば在庫の不足分 (補習 → `basic`、確認用 → `independent`)。
 * `count` は `kind` と一緒に指定する (省けば、その種別の区分の不足分。不足が無ければ 1 問)。
 */
export function planDrafts(
  stock: VariantStock,
  templates: TemplateKind[],
  options: { kind?: string; count?: number },
): DraftGroup[] {
  const groups: { kind: TaskKind; count: number }[] = [];
  const shortage = {
    remedial: Math.max(0, DRAFT_TARGET.remedial - stock.remedial),
    check: Math.max(0, DRAFT_TARGET.check - stock.check),
  };
  if (options.kind !== undefined) {
    const kind = options.kind as TaskKind;
    const problem = variantKindProblem(kind);
    if (problem) throw new Error(`--kind ${options.kind}: ${problem}`);
    const area = REMEDIAL_VARIANT_KINDS.includes(kind) ? "remedial" : "check";
    groups.push({ kind, count: options.count ?? Math.max(1, shortage[area]) });
  } else {
    if (options.count !== undefined) throw new Error("--count は --kind と一緒に指定してください");
    if (shortage.remedial > 0)
      groups.push({ kind: DEFAULT_KIND.remedial, count: shortage.remedial });
    if (shortage.check > 0) groups.push({ kind: DEFAULT_KIND.check, count: shortage.check });
  }
  for (const group of groups)
    if (!Number.isInteger(group.count) || group.count < 1)
      throw new Error(`作る数は 1 以上の整数にしてください: ${group.count}`);
  const total = groups.reduce((sum, g) => sum + g.count, 0);
  if (total > MAX_DRAFTS_PER_RUN)
    throw new Error(
      `1 回の実行で作れるのは ${MAX_DRAFTS_PER_RUN} 問までです (指定は ${total} 問)。分けて実行してください`,
    );
  return groups.map((group) => ({
    ...group,
    template: templates.find((t) => t.kind === group.kind)?.name ?? null,
  }));
}

/** AI が付けた短い名前を、類題のフォルダー名に使える形にする。 */
export function slugOf(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30)
    .replace(/-$/, "");
  return slug || "variant";
}

/**
 * 新しい類題の名前 `v<番号>-<短い名前>` を、使っている名前の最大の番号の次から振る。
 * 番号は 2 桁以上 (教材の並びと自然順をそろえる)。
 */
export function allocateVariantNames(existing: string[], slugs: string[]): string[] {
  let next = Math.max(0, ...existing.map((name) => Number(/^v(\d+)-/.exec(name)?.[1] ?? 0))) + 1;
  const used = new Set(existing);
  return slugs.map((raw) => {
    let name: string;
    do {
      name = `v${String(next).padStart(2, "0")}-${slugOf(raw)}`;
      next += 1;
    } while (used.has(name));
    used.add(name);
    return name;
  });
}

/** 下書きの 1 ファイル。 */
export interface DraftFile {
  path: string;
  content: string;
}

/** 親と同じものを自動で写す設定ファイル (AI には出力させない)。 */
const CONFIG_FILE =
  /^(?:package\.json|package-lock\.json|bun\.lockb?|\.npmrc|tsconfig(?:\.[\w-]+)?\.json|(?:vitest|vite|playwright|eslint|next)\.config\.[cm]?[jt]s|\.prettierrc(?:\.[\w]+)?|\.prettierignore|\.eslintrc(?:\.[\w]+)?)$/;

export function isConfigFile(path: string): boolean {
  return CONFIG_FILE.test(path.split("/").at(-1) ?? "");
}

const REQUIRED_DRAFT_PATHS = [
  "task.json",
  "README.md",
  "hints.md",
  "private/explanation.md",
  "private/review.md",
];
const ALLOWED_DRAFT_PREFIXES = [
  "starter/",
  "tests/",
  "private/solution/",
  "private/mutants/",
] as const;

function safePath(path: string): boolean {
  return (
    path.length > 0 &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    path.split("/").every((part) => part !== "" && part !== "." && part !== "..")
  );
}

/**
 * AI が出した類題 1 問のファイルを、書き出せる一式にする。置けない場所・欠け・設定ファイルの
 * 重複を見つけたら、AI に直させるための理由を返す。`task.json` の `id`・`pattern`・`kind` は
 * こちらで決めた値に揃え、親の starter の設定ファイル (package.json・lockfile・テストや lint の設定) は
 * 親と同じものを写す。
 */
export function draftVariantFiles(
  files: DraftFile[],
  context: {
    id: string;
    pattern: string;
    kind: TaskKind;
    /** 親の starter の設定ファイル (相対パス → 中身)。 */
    parentConfig: Record<string, Buffer>;
  },
): { files: Record<string, Buffer>; errors: string[] } {
  const errors: string[] = [];
  const out: Record<string, Buffer> = {};
  for (const file of files) {
    if (!safePath(file.path)) {
      errors.push(`ファイルのパスが不正です: ${file.path}`);
      continue;
    }
    const allowed =
      REQUIRED_DRAFT_PATHS.includes(file.path) ||
      ALLOWED_DRAFT_PREFIXES.some((prefix) => file.path.startsWith(prefix));
    if (!allowed) {
      errors.push(
        `${file.path} は置けません。置けるのは ${REQUIRED_DRAFT_PATHS.join("・")} と ${ALLOWED_DRAFT_PREFIXES.join("・")} の下です`,
      );
      continue;
    }
    if (file.path.startsWith("starter/") && isConfigFile(file.path)) continue; // 親から写す
    if (file.path in out) {
      errors.push(`同じパスのファイルが 2 つあります: ${file.path}`);
      continue;
    }
    out[file.path] = Buffer.from(file.content);
  }
  for (const path of REQUIRED_DRAFT_PATHS) if (!(path in out)) errors.push(`${path} がありません`);
  for (const prefix of ["starter/", "tests/", "private/solution/", "private/mutants/"])
    if (!Object.keys(out).some((path) => path.startsWith(prefix)))
      errors.push(`${prefix} にファイルがありません`);
  if (out["task.json"]) {
    try {
      const task = JSON.parse(out["task.json"].toString()) as Record<string, unknown>;
      out["task.json"] = Buffer.from(
        `${JSON.stringify({ ...task, id: context.id, pattern: context.pattern, kind: context.kind }, null, 2)}\n`,
      );
    } catch (err) {
      errors.push(`task.json が JSON として読めません: ${(err as Error).message}`);
    }
  }
  for (const [path, data] of Object.entries(context.parentConfig)) out[`starter/${path}`] = data;
  return { files: out, errors };
}

/** AI が出したテンプレートの値 1 組。 */
export interface DraftParams {
  slug: string;
  values: { key: string; value: string }[];
}

/**
 * AI が出した値を `params.json` の 1 件にする。キーは今の `params.json` の最初の 1 件と同じに
 * そろえ、値の型 (数・真偽値) もそれに合わせる。合わなければ直させる理由を返す。
 */
export function draftTemplateParams(
  draft: DraftParams,
  name: string,
  existing: VariantParams[],
): { params: VariantParams | null; errors: string[] } {
  if (!Array.isArray(draft?.values))
    return { params: null, errors: ["values をキーと値の組の配列にしてください"] };
  const sample = existing[0]?.values ?? {};
  const keys = Object.keys(sample);
  const errors: string[] = [];
  const values: Record<string, VariantParamValue> = {};
  const given = new Map(draft.values.map((v) => [v.key, v.value]));
  for (const key of given.keys())
    if (!keys.includes(key)) errors.push(`テンプレートに無いキーです: ${key}`);
  for (const key of keys) {
    const raw = given.get(key);
    if (raw === undefined) {
      errors.push(`キー ${key} の値がありません`);
      continue;
    }
    const type = typeof sample[key];
    if (type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) errors.push(`キー ${key} は数にしてください: ${raw}`);
      else values[key] = n;
    } else if (type === "boolean") {
      if (raw !== "true" && raw !== "false")
        errors.push(`キー ${key} は true か false にしてください`);
      else values[key] = raw === "true";
    } else values[key] = raw;
  }
  // 既存 (同じ応答で先に通った組を含む) と同じ値の組は、名前が違っても同じ問題になる。
  const same = existing.find((p) => keys.every((key) => p.values[key] === values[key]));
  if (errors.length === 0 && same)
    errors.push(`${same.name} と同じ値の組です。別の問題になる値にしてください`);
  return { params: errors.length > 0 ? null : { name, values }, errors };
}

/** 構造化出力のスキーマ: 類題を丸ごと。 */
export const FULL_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    variants: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slug: { type: "string" },
          files: {
            type: "array",
            items: {
              type: "object",
              properties: { path: { type: "string" }, content: { type: "string" } },
              required: ["path", "content"],
              additionalProperties: false,
            },
          },
        },
        required: ["slug", "files"],
        additionalProperties: false,
      },
    },
  },
  required: ["variants"],
  additionalProperties: false,
} as const;

/** 構造化出力のスキーマ: テンプレートの値。 */
export const PARAMS_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    params: {
      type: "array",
      items: {
        type: "object",
        properties: {
          slug: { type: "string" },
          values: {
            type: "array",
            items: {
              type: "object",
              properties: { key: { type: "string" }, value: { type: "string" } },
              required: ["key", "value"],
              additionalProperties: false,
            },
          },
        },
        required: ["slug", "values"],
        additionalProperties: false,
      },
    },
  },
  required: ["params"],
  additionalProperties: false,
} as const;

/** モデルごとの料金 (100 万トークンあたりの米ドル、入力・出力)。知らないモデルはトークン数だけを出す。 */
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};
/** 1 問あたりの出力の見込み (考える分を含む)。丸ごとは課題文・コード・テスト・誤答を書く。 */
const OUTPUT_TOKENS = { full: 12_000, params: 1_500 } as const;
/** 検査に落ちたときに直させる回数 (#69 の決定)。 */
export const MAX_REPAIRS = 2;

export interface DraftEstimate {
  inputTokens: number;
  outputTokens: number;
  /** 直しなしの概算 (ドル)。料金を知らないモデルは null。 */
  usual: number | null;
  /** すべての下書きを 2 回直した場合の最大 (ドル)。 */
  worst: number | null;
}

/**
 * 見積もり。`requests` は依頼ごとの入力トークン数と作る数。直しは 1 問ずつ、最初の入力と同じ
 * 文脈に前の下書きを足して送るので、1 回の直しを「入力 + 1 問分の出力 × 2」で見込む。
 * Batch は最初の依頼だけが半額 (直しはその場で行う)。
 */
export function estimateDrafts(
  model: string,
  requests: { inputTokens: number; count: number; mode: "full" | "params" }[],
  options: { batch: boolean },
): DraftEstimate {
  const price = PRICES[model];
  let inputTokens = 0;
  let outputTokens = 0;
  let usual = 0;
  let repairs = 0;
  for (const request of requests) {
    const out = OUTPUT_TOKENS[request.mode] * request.count;
    inputTokens += request.inputTokens;
    outputTokens += out;
    const discount = options.batch ? 0.5 : 1;
    if (price) usual += ((request.inputTokens * price.input + out * price.output) / 1e6) * discount;
    if (price) {
      const perVariant = OUTPUT_TOKENS[request.mode];
      const repairInput = request.inputTokens + perVariant * 2;
      repairs +=
        (MAX_REPAIRS * request.count * (repairInput * price.input + perVariant * price.output)) /
        1e6;
    }
  }
  return {
    inputTokens,
    outputTokens,
    usual: price ? usual : null,
    worst: price ? usual + repairs : null,
  };
}
