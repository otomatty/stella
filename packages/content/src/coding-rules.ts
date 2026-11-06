/**
 * コーディング規則の正本の読み込み (docs/curriculum/07 §6.4.1)。
 *
 * プログラム共通の規則は `packages/content/coding-rules.md`、ステージの追加分は
 * `stages/<slug>/coding-rules.md` に置く。AI の一次レビューと人のレビューは、seed で D1 の
 * `coding_rules` に入れた同じ本文を読む。課題は `task.json` の `review.rules` で規則の ID を指す。
 *
 * 書式は 1 規則 = 1 見出し (`## <ID> <短い名前>`) と、その下の箇条書き 3〜4 行。
 *
 * ```markdown
 * ## CR-NAME-01 名前が意味を表す
 *
 * - 規則: 変数・関数の名前から、入っている値や戻り値の意味を言い当てられる。
 * - 対象: すべての言語のコード
 * - 導入: javascript-basics
 * - 例外: (任意) 対象と理由
 * ```
 */

import { createHash } from "node:crypto";
import { existsSync, lstatSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compareNatural } from "./natural-order.mjs";

export const COMMON_RULE_SCOPE = "common";
export const CODING_RULES_FILE = "coding-rules.md";

export interface CodingRule {
  id: string;
  /** `common` かステージの slug。 */
  scope: string;
  /** 文書の中の順番。プロンプトに同じ順で並べ、キャッシュを効かせる。 */
  position: number;
  title: string;
  /** コードを見て当否を決められる文。 */
  statement: string;
  /** 適用する言語・場面。 */
  appliesTo: string;
  /** 導入するステージ (`<slug>`) か単元 (`<slug>/<単元>`)。 */
  introducedIn: string;
  exception?: string;
  /** 規則の内容ハッシュ。レビュー結果に残し、改訂後も当時の規則を確かめられるようにする。 */
  contentHash: string;
}

const RULE_ID = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-\d{2}$/;
const FIELDS = {
  規則: "statement",
  対象: "appliesTo",
  導入: "introducedIn",
  例外: "exception",
} as const;
type FieldKey = (typeof FIELDS)[keyof typeof FIELDS];

export function codingRuleHash(
  rule: Omit<CodingRule, "contentHash" | "position" | "scope">,
): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        id: rule.id,
        title: rule.title,
        statement: rule.statement,
        appliesTo: rule.appliesTo,
        introducedIn: rule.introducedIn,
        exception: rule.exception ?? null,
      }),
    )
    .digest("hex");
}

/** 1 つの規則文書を読む。書式の誤りは場所が分かる文で投げる。 */
export function parseCodingRules(markdown: string, scope: string, source: string): CodingRule[] {
  const rules: CodingRule[] = [];
  let current: { id: string; title: string; fields: Partial<Record<FieldKey, string>> } | null =
    null;
  const finish = () => {
    if (!current) return;
    const { id, title, fields } = current;
    for (const [label, key] of Object.entries(FIELDS))
      if (key !== "exception" && !fields[key])
        throw new Error(`${source}: ${id} に「${label}:」がありません`);
    const rule = {
      id,
      title,
      statement: fields.statement as string,
      appliesTo: fields.appliesTo as string,
      introducedIn: fields.introducedIn as string,
      ...(fields.exception ? { exception: fields.exception } : {}),
    };
    rules.push({ ...rule, scope, position: rules.length, contentHash: codingRuleHash(rule) });
    current = null;
  };
  markdown
    .replace(/\r\n/g, "\n")
    .split("\n")
    .forEach((line, index) => {
      const at = `${source}:${index + 1}`;
      if (line.startsWith("## ")) {
        finish();
        const match = /^## (\S+) (.+)$/.exec(line);
        if (!match || !RULE_ID.test(match[1] as string))
          throw new Error(
            `${at}: 見出しは「## <ID> <短い名前>」で、ID は英大文字・数字・ハイフンと末尾 2 桁にしてください (例 CR-NAME-01)`,
          );
        current = { id: match[1] as string, title: (match[2] as string).trim(), fields: {} };
        return;
      }
      if (!current) return; // 最初の規則より前は文書の説明。
      if (line.trim() === "") return;
      if (line.startsWith("#")) throw new Error(`${at}: 規則の中に見出しを置けません`);
      const field = /^- (規則|対象|導入|例外): (.+)$/.exec(line);
      if (!field)
        throw new Error(
          `${at}: 規則の本文は「- 規則: / - 対象: / - 導入: / - 例外:」の箇条書きにしてください`,
        );
      const key = FIELDS[field[1] as keyof typeof FIELDS];
      if (current.fields[key]) throw new Error(`${at}: 「${field[1]}:」が重複しています`);
      current.fields[key] = (field[2] as string).trim();
    });
  finish();
  return rules;
}

function defaultContentRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}

/** `stages/` 直下のフォルダー。modules の無い準備中のステージも含む。 */
function stageDirectorySlugs(contentRoot: string): string[] {
  const stagesRoot = join(contentRoot, "stages");
  if (!existsSync(stagesRoot)) return [];
  return readdirSync(stagesRoot)
    .filter((slug) => lstatSync(join(stagesRoot, slug)).isDirectory())
    .sort(compareNatural);
}

/** seed が規則を入れ替える範囲。共通と、この checkout のステージ。 */
export function listCodingRuleScopes(contentRoot = defaultContentRoot()): string[] {
  return [COMMON_RULE_SCOPE, ...stageDirectorySlugs(contentRoot)];
}

/**
 * 共通の規則と、ステージごとの追加規則をすべて読む。共通の正本が無ければ共通の規則は 0 件
 * (教材検査の `check-tasks` が正本の有無を別に確かめる)。
 */
export function readCodingRules(contentRoot: string): CodingRule[] {
  const rules: CodingRule[] = [];
  const common = join(contentRoot, CODING_RULES_FILE);
  if (existsSync(common))
    rules.push(
      ...parseCodingRules(readFileSync(common, "utf8"), COMMON_RULE_SCOPE, CODING_RULES_FILE),
    );
  const stagesRoot = join(contentRoot, "stages");
  for (const slug of stageDirectorySlugs(contentRoot)) {
    const file = join(stagesRoot, slug, CODING_RULES_FILE);
    if (!existsSync(file)) continue;
    rules.push(
      ...parseCodingRules(readFileSync(file, "utf8"), slug, `stages/${slug}/${CODING_RULES_FILE}`),
    );
  }
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.id)) throw new Error(`コーディング規則の ID が重複しています: ${rule.id}`);
    seen.add(rule.id);
    const common = rule.scope === COMMON_RULE_SCOPE;
    // 共通の規則は CR- で始め、ステージの規則と見分けられるようにする。
    if (common !== rule.id.startsWith("CR-"))
      throw new Error(
        common
          ? `共通の規則の ID は CR- で始めてください: ${rule.id}`
          : `ステージの規則の ID に CR- は使えません (共通の規則と区別します): ${rule.id}`,
      );
    const [stage, unit, ...rest] = rule.introducedIn.split("/");
    const stageDir = join(stagesRoot, stage ?? "");
    if (
      rest.length > 0 ||
      !stage ||
      !/^[a-z0-9][a-z0-9-]*$/.test(stage) ||
      !existsSync(join(stageDir, "stage.json"))
    )
      throw new Error(
        `${rule.id}: 導入は <ステージslug> か <ステージslug>/<単元> で、存在するステージを書いてください`,
      );
    if (unit !== undefined && !existsSync(join(stageDir, "modules", unit)))
      throw new Error(`${rule.id}: 導入の単元がありません: ${rule.introducedIn}`);
    if (!common && stage !== rule.scope)
      throw new Error(`${rule.id}: ステージの規則は、そのステージの中で導入してください`);
  }
  return rules;
}

/** 課題が規則を指せるか。指す規則の範囲と、必須にする規則が出題までに導入済みかを確かめる。 */
export function assertTaskRules(
  task: {
    id: string;
    stageId: string;
    unitId: string;
    rules: { id: string; required: boolean }[];
  },
  rules: CodingRule[],
  prerequisitesOf: (slug: string) => string[],
): void {
  const ancestors = new Set<string>();
  const visit = (slug: string) => {
    for (const p of prerequisitesOf(slug)) {
      if (ancestors.has(p)) continue;
      ancestors.add(p);
      visit(p);
    }
  };
  visit(task.stageId);
  for (const ref of task.rules) {
    const rule = rules.find((r) => r.id === ref.id);
    if (!rule) throw new Error(`${task.id}: 未知のコーディング規則です: ${ref.id}`);
    if (rule.scope !== COMMON_RULE_SCOPE && rule.scope !== task.stageId)
      throw new Error(
        `${task.id}: 別のステージの規則は指せません (共通の規則に移してください): ${ref.id}`,
      );
    if (!ref.required) continue;
    // 未習の規則は合否の必須条件にしない (07 §6.4.1)。
    const [stage, unit] = rule.introducedIn.split("/");
    const introduced =
      (stage !== undefined && ancestors.has(stage)) ||
      (stage === task.stageId && (unit === undefined || compareNatural(unit, task.unitId) <= 0));
    if (!introduced)
      throw new Error(
        `${task.id}: ${ref.id} はこの課題の時点で未習です (導入: ${rule.introducedIn})。任意にするか、導入の位置を見直してください`,
      );
  }
}
