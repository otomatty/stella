/**
 * 類題のテンプレート (#69・07 §7.2 の「作り方」)。
 *
 * データや条件を差し替えられる課題は、類題を 1 問ずつ手で書かず、テンプレートとパラメータから作る。
 * テンプレートは親の課題の `private/variant-templates/<テンプレート>/` に置く。
 *
 * ```text
 * tasks/q01-first-page/private/variant-templates/
 *   heading/
 *     params.json       # [{ "name": "v01-profile", "values": { "heading": "自己紹介" } }, ...]
 *     template/         # 類題 1 問と同じ形 (task.json・README.md・hints.md・starter/・tests/・private/)
 *     generated.json    # 書き出した類題の名前の台帳 (variants:generate が書く)
 * ```
 *
 * - テンプレートの文字のファイルに書いた `{{=キー}}` を、パラメータの値に置き換える。組み込みの
 *   `{{=id}}` (類題の ID `<講座>/<単元>/<名前>`) と `{{=name}}` (名前) も使える。
 * - `.json` のファイルでは、文字列の値を JSON の文字列の中身として書く (`"` などを逃がす)。ほかの
 *   ファイルはそのまま埋める。文字でないファイル (画像など) は置き換えずに写す。
 * - 書き出し先は `private/variants/<名前>/`。生成した類題も手で書いた類題と同じく `content:check` が
 *   検査し (解答例が通る・典型的な誤答が落ちる)、PR のレビューとマージで在庫に入る (07 §7.3)。
 * - 生成した類題を手で直さない。`content:check` は、テンプレートから作り直した結果と食い違えば落とす。
 * - `params.json` から外した類題は、台帳 (`generated.json`) を見て書き出しのときに消す。台帳に無い
 *   類題 (手で書いた類題) は触らず、同じ名前を作ろうとしたら止める。
 *
 * 置き換えの記法は `{{=キー}}` にする。JSX の `style={{x}}` や Markdown の波かっこと取り違えないため。
 */

import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { sortNatural } from "./natural-order.mjs";

/** 親の課題のフォルダーから見たテンプレートの置き場所。 */
export const VARIANT_TEMPLATES_DIR = "private/variant-templates";
/** 類題 1 問の書き出し先 (親の課題のフォルダーから見た場所)。 */
const VARIANTS_DIR = "private/variants";
const PLACEHOLDER = /\{\{=([A-Za-z_][A-Za-z0-9_]*)\}\}/g;
/** 類題の名前 (学習フォルダーのフォルダー名と ID の末尾になる)。 */
const VARIANT_NAME = /^[a-z0-9][a-z0-9-]*$/;
const BUILTIN_KEYS = ["id", "name"] as const;

export type VariantParamValue = string | number | boolean;
export interface VariantParams {
  name: string;
  values: Record<string, VariantParamValue>;
}

/**
 * `params.json` を確かめる。名前は類題のフォルダー名にするので、小文字・数字・`-` に限る。
 * 空の配列は許す (最後の類題を外したときに、台帳を見て書き出し済みの類題を消すため)。
 */
export function parseVariantParams(raw: unknown, label: string): VariantParams[] {
  if (!Array.isArray(raw))
    throw new Error(`${label}: params.json は類題 1 問ずつの配列にしてください`);
  const names = new Set<string>();
  return raw.map((entry, i) => {
    const where = `${label}: params.json の ${i + 1} 件目`;
    if (typeof entry !== "object" || entry === null || Array.isArray(entry))
      throw new Error(`${where}は { "name", "values" } にしてください`);
    const { name, values, ...rest } = entry as Record<string, unknown>;
    if (Object.keys(rest).length > 0)
      throw new Error(`${where}に知らない項目があります: ${Object.keys(rest).join(", ")}`);
    if (typeof name !== "string" || !VARIANT_NAME.test(name))
      throw new Error(`${where}の name は小文字・数字・- にしてください: ${String(name)}`);
    if (names.has(name)) throw new Error(`${label}: params.json の name が重複しています: ${name}`);
    names.add(name);
    if (typeof values !== "object" || values === null || Array.isArray(values))
      throw new Error(`${where}の values はキーと値の組にしてください`);
    for (const [key, value] of Object.entries(values)) {
      if ((BUILTIN_KEYS as readonly string[]).includes(key))
        throw new Error(`${where}の values に組み込みのキー ${key} は書けません`);
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key))
        throw new Error(`${where}の values のキーが不正です: ${key}`);
      if (!["string", "number", "boolean"].includes(typeof value))
        throw new Error(`${where}の values.${key} は文字列・数・真偽値にしてください`);
    }
    return { name, values: values as Record<string, VariantParamValue> };
  });
}

/** 文字のファイルか (UTF-8 として読めるか)。読めないファイルは置き換えずに写す。 */
function decodeText(data: Buffer): string | null {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    return null;
  }
}

/**
 * テンプレートの一式 (相対パス → 中身) を、パラメータ 1 件ごとの類題の一式に展開する。
 * `idPrefix` は `<講座>/<単元>` (親の課題と同じ)。テンプレートに無いキーを書いた・パラメータの
 * キーがテンプレートで使われていない (書き間違い) ときは止める。
 */
export function expandVariantTemplate(
  template: Record<string, Buffer>,
  params: VariantParams[],
  idPrefix: string,
  label: string,
): Map<string, Record<string, Buffer>> {
  const out = new Map<string, Record<string, Buffer>>();
  for (const param of params) {
    const values: Record<string, VariantParamValue> = {
      ...param.values,
      id: `${idPrefix}/${param.name}`,
      name: param.name,
    };
    const used = new Set<string>();
    const files: Record<string, Buffer> = {};
    for (const [path, data] of Object.entries(template)) {
      if (path.includes("{{="))
        throw new Error(`${label}: ファイル名には {{=...}} を使えません: ${path}`);
      const text = decodeText(data);
      if (text === null) {
        files[path] = data;
        continue;
      }
      const json = path.endsWith(".json");
      files[path] = Buffer.from(
        text.replace(PLACEHOLDER, (_whole, key: string) => {
          if (!(key in values))
            throw new Error(
              `${label}: ${path} の {{=${key}}} が ${param.name} の values にありません`,
            );
          used.add(key);
          const value = values[key] as VariantParamValue;
          return json && typeof value === "string"
            ? JSON.stringify(value).slice(1, -1)
            : String(value);
        }),
      );
    }
    const unused = Object.keys(param.values).filter((key) => !used.has(key));
    if (unused.length > 0)
      throw new Error(
        `${label}: ${param.name} の values にテンプレートで使っていないキーがあります: ${unused.join(", ")}`,
      );
    out.set(param.name, files);
  }
  return out;
}

/** ディレクトリの通常のファイルを相対パス → 中身で読む。シンボリックリンクは止める。 */
function readTree(root: string): Record<string, Buffer> {
  const files: Record<string, Buffer> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      const stat = lstatSync(path);
      if (stat.isSymbolicLink())
        throw new Error(`類題のテンプレートにシンボリックリンクは使えません: ${path}`);
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile())
        files[relative(root, path).split("\\").join("/")] = readFileSync(path);
    }
  };
  walk(root);
  return files;
}

/** テンプレートで書き出した類題の名前の台帳 (テンプレートのフォルダーに置く)。 */
export const GENERATED_LEDGER = "generated.json";

/** 課題に置いたテンプレート 1 つ。 */
export interface VariantTemplate {
  /** テンプレートのフォルダー。 */
  dir: string;
  label: string;
  /** 作る類題 (名前 → 一式)。 */
  variants: Map<string, Record<string, Buffer>>;
  /** 台帳 (`generated.json`) に残した、前に書き出した類題の名前。台帳が無ければ null。 */
  ledger: string[] | null;
}

function readLedger(dir: string, label: string): string[] | null {
  const path = join(dir, GENERATED_LEDGER);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (
    !Array.isArray(raw) ||
    !raw.every((name) => typeof name === "string" && VARIANT_NAME.test(name))
  )
    throw new Error(`${label}: ${GENERATED_LEDGER} は類題の名前の配列にしてください`);
  return raw as string[];
}

/** 課題 1 つのテンプレート (テンプレートの名前の順)。テンプレートが無ければ空。 */
export function variantTemplatesOf(taskDir: string): VariantTemplate[] {
  const templatesRoot = join(taskDir, VARIANT_TEMPLATES_DIR);
  if (!existsSync(templatesRoot)) return [];
  const parent = JSON.parse(readFileSync(join(taskDir, "task.json"), "utf8")) as { id?: unknown };
  if (typeof parent.id !== "string") throw new Error(`task.json に id がありません: ${taskDir}`);
  const idPrefix = parent.id.split("/").slice(0, -1).join("/");
  const templates: VariantTemplate[] = [];
  const names = new Set<string>();
  for (const name of sortNatural(readdirSync(templatesRoot))) {
    const dir = join(templatesRoot, name);
    if (name === ".gitkeep" && lstatSync(dir).isFile()) continue;
    const label = `${parent.id} のテンプレート ${name}`;
    if (!lstatSync(dir).isDirectory() || lstatSync(dir).isSymbolicLink())
      throw new Error(
        `${VARIANT_TEMPLATES_DIR}/ にはテンプレートを 1 つ 1 フォルダーで置いてください: ${label}`,
      );
    const extra = readdirSync(dir).filter(
      (entry) => !["params.json", "template", GENERATED_LEDGER].includes(entry),
    );
    if (
      extra.length > 0 ||
      !existsSync(join(dir, "template")) ||
      !existsSync(join(dir, "params.json"))
    )
      throw new Error(
        `${label}: params.json と template/ (と台帳の ${GENERATED_LEDGER}) だけを置いてください`,
      );
    const params = parseVariantParams(
      JSON.parse(readFileSync(join(dir, "params.json"), "utf8")),
      label,
    );
    const variants = expandVariantTemplate(
      readTree(join(dir, "template")),
      params,
      idPrefix,
      label,
    );
    for (const variant of variants.keys()) {
      if (names.has(variant))
        throw new Error(`${parent.id}: 類題 ${variant} を作るテンプレートが 2 つあります`);
      names.add(variant);
    }
    templates.push({ dir, label, variants, ledger: readLedger(dir, label) });
  }
  return templates;
}

/** 課題 1 つの、テンプレートから作る類題 (名前 → 一式)。テンプレートが無ければ空。 */
export function generatedVariantsOf(taskDir: string): Map<string, Record<string, Buffer>> {
  const out = new Map<string, Record<string, Buffer>>();
  for (const template of variantTemplatesOf(taskDir))
    for (const [name, files] of template.variants) out.set(name, files);
  return out;
}

/** 教材の講座フォルダーの下で、テンプレートを持つ課題のフォルダーを探す。 */
export function tasksWithTemplates(coursesRoot: string): string[] {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      const stat = lstatSync(path);
      if (!stat.isDirectory() || stat.isSymbolicLink()) continue;
      if (["node_modules", ".git", "variant-templates"].includes(entry)) continue;
      if (existsSync(join(path, "task.json")) && existsSync(join(path, VARIANT_TEMPLATES_DIR)))
        found.push(path);
      // 類題の中にテンプレートは置けない (入れ子の予備と同じく類題の検査が止める) ので、
      // 予備のフォルダーの下は探さない。
      if (entry === "variants" && dirname(path).endsWith("private")) continue;
      walk(path);
    }
  };
  walk(coursesRoot);
  return found;
}

export interface VariantSyncResult {
  /**
   * 書き出した (check では食い違っていた) もの。類題の `<課題のフォルダー>/private/variants/<名前>`、
   * 台帳の `.../generated.json`、消した (check では残っている) 外した類題のフォルダー。
   */
  changed: string[];
  /** テンプレートから作る類題の数。 */
  total: number;
}

/**
 * テンプレートから類題を書き出す。`check` では書かずに、書き出し済みの類題がテンプレートから
 * 作り直した結果と一致するかだけを確かめる (食い違いを `changed` に返す)。
 *
 * - 書き出すときは、その名前の類題のフォルダーを丸ごと置き換える (テンプレートがその名前を持つ)。
 *   ただし同じ課題のどの台帳にも無い名前のフォルダーが既にあれば、手で書いた類題なので上書きせずに止める。
 *   台帳は課題の中のテンプレートをまとめて見るので、類題をテンプレートの間で移せる。
 * - 台帳 (`generated.json`) にあって、どのテンプレートの `params.json` からも外した類題は、フォルダーごと消す。
 * - 台帳はテンプレートが作る類題の名前 (並べた順) にそろえる。`check` は台帳の食い違いも落とす。
 */
export function syncVariantTemplates(
  coursesRoot: string,
  options: { check: boolean; filter?: (taskDir: string) => boolean },
): VariantSyncResult {
  const changed: string[] = [];
  let total = 0;
  for (const taskDir of tasksWithTemplates(coursesRoot)) {
    if (options.filter && !options.filter(taskDir)) continue;
    const templates = variantTemplatesOf(taskDir);
    const generated = new Set(templates.flatMap((template) => template.ledger ?? []));
    // 同じ名前を 2 つのテンプレートが作ることは variantTemplatesOf が止めている。
    const owned = new Set(templates.flatMap((template) => [...template.variants.keys()]));
    for (const template of templates) {
      for (const [name, files] of template.variants) {
        total += 1;
        const target = join(taskDir, VARIANTS_DIR, name);
        const current = existsSync(target) ? readTree(target) : null;
        // 中身が同じでも、台帳に無い (手で書いた) 類題は取り込まない (外したときに消してしまう)。
        if (current !== null && !generated.has(name))
          throw new Error(
            `${template.label}: 類題 ${name} は手で書いた類題と同じ名前です。params.json の name を変えてください`,
          );
        const same =
          current !== null &&
          Object.keys(current).length === Object.keys(files).length &&
          Object.entries(files).every(([path, data]) => current[path]?.equals(data) === true);
        if (same) continue;
        changed.push(target);
        if (options.check) continue;
        rmSync(target, { recursive: true, force: true });
        for (const [path, data] of Object.entries(files)) {
          mkdirSync(dirname(join(target, path)), { recursive: true });
          writeFileSync(join(target, path), data);
        }
      }
      // params.json から外した類題 (台帳にだけある名前) を消す。ほかのテンプレートへ移した類題は残す。
      for (const name of template.ledger ?? []) {
        if (owned.has(name)) continue;
        const target = join(taskDir, VARIANTS_DIR, name);
        if (!existsSync(target)) continue;
        changed.push(target);
        if (!options.check) rmSync(target, { recursive: true, force: true });
      }
      const names = [...template.variants.keys()];
      if (JSON.stringify(template.ledger) !== JSON.stringify(names)) {
        const path = join(template.dir, GENERATED_LEDGER);
        changed.push(path);
        if (!options.check) writeFileSync(path, `${JSON.stringify(names, null, 2)}\n`);
      }
    }
  }
  return { changed, total };
}
