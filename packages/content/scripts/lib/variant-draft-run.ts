/**
 * AI で類題の下書きを作り、検査して書き出す (#69)。API の呼び出しは `DraftModel` に任せる
 * (CLI は Anthropic SDK、テストは偽物を渡す)。
 *
 * 1. 親の課題一式・既存の類題・テンプレート・書き方の決まりを渡して、まとまり (種別・作り方) ごとに
 *    構造化出力で下書きを作らせる。
 * 2. 下書きを 1 問ずつ、教材の一時の複製に置いて検査する (教材の形・解答例が固定ランナーで通る・
 *    誤答がすべて落ちる)。落ちたら理由を返して直させる (最大 2 回)。それでも落ちたら書き出さない。
 * 3. 通った下書きを書き出す。丸ごとの類題は `private/variants/<名前>/`、テンプレートの値は
 *    `params.json` に足して `variants:generate` と同じ書き出しを行う。
 */

import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import type { TaskKind } from "../../../shared/src/tasks/manifest.js";
import { buildContentManifest } from "../../src/manifest.js";
import { mutantsCheckable } from "../../src/task-content.js";
import type { TaskDefinition } from "../../src/task-schema.js";
import {
  allocateVariantNames,
  type DraftFile,
  type DraftGroup,
  type DraftParams,
  draftTemplateParams,
  draftVariantFiles,
  FULL_DRAFT_SCHEMA,
  isConfigFile,
  MAX_REPAIRS,
  PARAMS_DRAFT_SCHEMA,
  variantStockOf,
} from "../../src/variant-drafts.js";
import {
  parseVariantParams,
  syncVariantTemplates,
  VARIANT_TEMPLATES_DIR,
  type VariantParams,
} from "../../src/variant-templates.js";
import { mutantsFail, scrubbedEnv, solutionPasses } from "./task-run-check.js";

/** 依頼の 1 ブロック。`cache` を付けたブロックまでをプロンプトキャッシュに載せる。 */
export interface DraftBlock {
  text: string;
  cache?: boolean;
}
export interface DraftMessage {
  role: "user" | "assistant";
  content: DraftBlock[];
}
export interface DraftRequest {
  system: DraftBlock[];
  messages: DraftMessage[];
  schema: object;
}
/** モデルの呼び出し。`complete` は構造化出力の JSON を返し、拒否・打ち切りは例外にする。 */
export interface DraftModel {
  countTokens(request: DraftRequest): Promise<number>;
  complete(request: DraftRequest): Promise<unknown>;
}

/** 下書きを作る課題。 */
export interface DraftTarget {
  /** 教材のルート (`packages/content`)。 */
  contentRoot: string;
  /** 親の課題のフォルダー。 */
  taskDir: string;
}

interface ParentTask {
  id: string;
  pattern: string;
  /** `<講座>/<単元>` */
  idPrefix: string;
  /** 典型的な誤答を手元で確かめられる runner か。CI と公開・環境診断の類題は誤答を置けない。 */
  mutants: boolean;
}

function parentOf(taskDir: string): ParentTask {
  const task = JSON.parse(readFileSync(join(taskDir, "task.json"), "utf8")) as TaskDefinition;
  return {
    id: task.id,
    pattern: task.pattern,
    idPrefix: task.id.split("/").slice(0, -1).join("/"),
    mutants: mutantsCheckable(task),
  };
}

/** ディレクトリの通常のファイル (相対パス → 中身)。`skip` に当たるディレクトリは読まない。 */
function readTree(root: string, skip: (rel: string) => boolean = () => false) {
  const files: Record<string, Buffer> = {};
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir).sort()) {
      const path = join(dir, entry);
      const rel = relative(root, path).split("\\").join("/");
      if (skip(rel)) continue;
      const stat = lstatSync(path);
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile()) files[rel] = readFileSync(path);
    }
  };
  walk(root);
  return files;
}

/** ファイルを「=== パス ===」で並べる。lockfile と文字でないファイルは中身を省く。 */
function dump(title: string, files: Record<string, Buffer>): string {
  const parts = Object.entries(files).map(([path, data]) => {
    const name = path.split("/").at(-1) ?? "";
    if (/^(?:package-lock\.json|bun\.lockb?)$/.test(name))
      return `=== ${path} ===\n(lockfile。中身は省略。親と同じものを自動で写す)`;
    try {
      return `=== ${path} ===\n${new TextDecoder("utf-8", { fatal: true }).decode(data)}`;
    } catch {
      return `=== ${path} ===\n(文字でないファイル。中身は省略)`;
    }
  });
  return `## ${title}\n\n${parts.join("\n\n")}`;
}

/** Markdown から、`start` の見出しから `end` の見出しの手前までを切り出す。 */
function sectionOf(markdown: string, start: string, end?: string): string {
  const from = markdown.indexOf(start);
  if (from < 0) return "";
  const to = end ? markdown.indexOf(end, from + start.length) : -1;
  return markdown.slice(from, to < 0 ? undefined : to).trim();
}

/** 書き方の決まり (ADDING_COURSE の課題と類題の節・STYLE_GUIDE の文体とコード例)。 */
export function draftGuide(contentRoot: string): string {
  const adding = readFileSync(join(contentRoot, "ADDING_COURSE.md"), "utf8");
  const style = readFileSync(join(contentRoot, "STYLE_GUIDE.md"), "utf8");
  return [
    sectionOf(adding, "## 新カリキュラムの format 2", "### ログインなしで読める単元"),
    sectionOf(style, "## 対象者像", "## トピックスライド"),
    sectionOf(style, "## OS別の手順", "## 演習"),
    sectionOf(style, "## コード例のルール", "## 図解のルール"),
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

const KIND_USE: Record<string, string> = {
  basic:
    "補習の小問題 (支援付きでしか解けなかった受講者に、翌日から 1 日 1 問出す易しい問題。ヒントを開ける)",
  connection: "補習の小問題 (前に学んだことと結び付ける易しい問題。ヒントを開ける)",
  independent:
    "時間を空けた類題・未見の問題 (自分で手順を選んで解く。3 日後・1 週間後・3 週間後に出す)",
  debug: "時間を空けた類題・未見の問題 (壊れたコードを直す修正の問題)",
  "assessment-a": "未見の問題 (確認A。ヒントと解答は出さない)",
  "assessment-b": "1 週間後の確認 (確認B。ヒントと解答は出さない)",
};

function systemPrompt(guide: string, mode: "full" | "params", mutants: boolean): DraftBlock[] {
  const common = [
    "あなたは、未経験エンジニア向けの研修教材の課題を書く講師の補助です。",
    "親の課題と同じ実装パターンの「類題」を作ります。類題は、値・条件・境界・組合せ・利用場面を変えた別の問題で、親の課題や既存の類題を言い換えただけの問題にはしません。受講者は親の課題を解いたあと、時間を空けて類題を解きます。",
    "出力は指定の JSON だけにします。slug は類題を表す短い英小文字とハイフンの名前 (例: profile-page) にします。",
  ];
  const full = [
    `類題 1 問は次のファイルで書きます: task.json・README.md (課題文)・hints.md (ヒント。段の数は task.json の support.hintLevels とそろえ、0 段なら空文字)・starter/ (受講者に配る出発点)・tests/ (手元の検査)・private/solution/ (starter に重ねて検査に通る解答例)・private/explanation.md (解説)・private/review.md (レビューの観点とよくある違反)${mutants ? "・private/mutants/<誤答の名前>/ (典型的な誤答。1 つ以上)" : ""}。`,
    "task.json は親の課題の task.json を元にし、title・skills・estimatedMinutes・review・support・static などを類題に合わせて直します。id・pattern・kind はこちらで決めた値に置き換えるので、何を書いても構いません。support は類題の kind で選べる値にします (書き方の決まりの表)。",
    mutants
      ? "典型的な誤答は、受講者がやりがちな誤りを解答例に重ねた形で書きます。starter か解答例にあるファイルだけを置き、テスト・設定は変えません。誤答はテストで必ず落ちるようにし、落ちない誤答があればテストを足します。"
      : "この課題の runner は誤答を手元で確かめられないので、private/mutants/ は書きません。",
    "package.json・lockfile・テストや lint・整形の設定ファイルは親の課題と同じものを自動で写すので、出力しません。課題文に教材内の画像は使いません。",
  ];
  const params = [
    "親の課題には、類題を作るテンプレート (params.json と template/) があります。テンプレートのファイルの {{=キー}} が params.json の values の値に置き換わります。",
    'あなたは params.json に足す新しい値の組だけを作ります。キーは既存の値の組と同じにし、値は既存の組と重ならない、受講者にとって意味のある別の問題になるものにします。値は文字列で返し、数や真偽値のキーも文字列で書きます (例: "3"、"true")。',
  ];
  return [
    {
      text: [
        ...common,
        ...(mode === "full" ? full : params),
        "",
        "# 書き方の決まり",
        "",
        guide,
      ].join("\n"),
      cache: true,
    },
  ];
}

/** 親の課題一式・既存の類題・テンプレート (依頼の前半。直しでも同じものを送るのでキャッシュする)。 */
function contextBlock(target: DraftTarget, template: string | null): DraftBlock {
  const parent = parentOf(target.taskDir);
  const patterns = JSON.parse(readFileSync(join(target.contentRoot, "patterns.json"), "utf8")) as {
    id: string;
    title: string;
  }[];
  const patternTitle = patterns.find((p) => p.id === parent.pattern)?.title ?? parent.pattern;
  const parts = [
    `# 親の課題: ${parent.id}\n\nパターン: ${parent.pattern} (${patternTitle})`,
    dump(
      "親の課題のファイル",
      readTree(
        target.taskDir,
        (rel) =>
          rel === "private/variants" ||
          rel === VARIANT_TEMPLATES_DIR ||
          rel === "fixed-start" ||
          rel === ".stella",
      ),
    ),
  ];
  const variantsDir = join(target.taskDir, "private/variants");
  if (existsSync(variantsDir))
    for (const name of readdirSync(variantsDir).sort()) {
      const dir = join(variantsDir, name);
      if (!lstatSync(dir).isDirectory()) continue;
      const files = readTree(
        dir,
        (rel) => rel === "starter" || rel === "tests" || rel === "private/mutants",
      );
      parts.push(dump(`既存の類題 ${name} (重ならない問題にする)`, files));
    }
  if (template) {
    const dir = join(target.taskDir, VARIANT_TEMPLATES_DIR, template);
    parts.push(
      dump(
        `テンプレート ${template}`,
        readTree(dir, (rel) => rel === "generated.json"),
      ),
    );
  }
  return { text: parts.join("\n\n"), cache: true };
}

function requestText(group: DraftGroup): string {
  const use = KIND_USE[group.kind] ?? group.kind;
  return group.template
    ? `テンプレート ${group.template} の params.json に足す値の組を ${group.count} 組作ってください。類題の kind は ${group.kind} で、使い道は${use}です。`
    : `kind が ${group.kind} の類題を ${group.count} 問作ってください。使い道は${use}です。${group.count > 1 ? "問題どうしも重ならないようにします。" : ""}`;
}

/** まとまり 1 つの最初の依頼。 */
export function draftRequest(target: DraftTarget, group: DraftGroup, guide: string): DraftRequest {
  return {
    system: systemPrompt(
      guide,
      group.template ? "params" : "full",
      parentOf(target.taskDir).mutants,
    ),
    messages: [
      {
        role: "user",
        content: [contextBlock(target, group.template), { text: requestText(group) }],
      },
    ],
    schema: group.template ? PARAMS_DRAFT_SCHEMA : FULL_DRAFT_SCHEMA,
  };
}

/** 直しの依頼: 最初の依頼に、その 1 問の下書きと検査の結果を足す。 */
function repairRequest(first: DraftRequest, draft: unknown, errors: string[]): DraftRequest {
  return {
    ...first,
    messages: [
      ...first.messages,
      { role: "assistant", content: [{ text: JSON.stringify(draft) }] },
      {
        role: "user",
        content: [
          {
            text: [
              "この下書きは手元の検査で次のとおり落ちました。直した 1 問 (1 組) だけを同じ形式で出し直してください。",
              ...errors.map((e) => `- ${e}`),
            ].join("\n"),
          },
        ],
      },
    ],
  };
}

/**
 * 教材の一時の複製 (台帳・パターン・環境・参照元と講座)。講座は前提がほかの講座を指すので
 * 全部を写す (教材は全体で 10MB 程度)。生成物 (`dist`) は写さない。
 */
function scratchCopy(target: DraftTarget): { root: string; taskDir: string } {
  const root = mkdtempSync(join(tmpdir(), "stella-variant-draft-"));
  for (const name of [
    "skills.json",
    "patterns.json",
    "coding-rules.md",
    "environments",
    "sources",
    "courses",
  ])
    if (existsSync(join(target.contentRoot, name)))
      cpSync(join(target.contentRoot, name), join(root, name), { recursive: true });
  const rel = relative(join(target.contentRoot, "courses"), target.taskDir).split("\\").join("/");
  return { root, taskDir: join(root, "courses", rel) };
}

/** 一時の複製で、類題 (ID) が教材として読め、解答例が通り、誤答が落ちるかを確かめる。 */
async function checkVariants(root: string, ids: string[]): Promise<string[]> {
  let tasks: ReturnType<typeof buildContentManifest>["tasks"];
  try {
    tasks = buildContentManifest(join(root, "courses")).tasks;
  } catch (err) {
    return [`教材の検査に落ちました: ${(err as Error).message}`];
  }
  const errors: string[] = [];
  for (const id of ids) {
    const seed = tasks.find((t) => t.definition.id === id);
    if (!seed) {
      errors.push(`類題 ${id} が教材として読めません`);
      continue;
    }
    try {
      // AI が書いたテストと解答例は人が読む前に動くので、API キーなどの環境変数を渡さない。
      const env = scrubbedEnv(process.env);
      await solutionPasses(seed, seed.bundle.files, "配布ファイル", { env });
      await mutantsFail(seed, { env });
    } catch (err) {
      errors.push((err as Error).message);
    }
  }
  return errors;
}

function writeTree(dir: string, files: Record<string, Buffer>) {
  rmSync(dir, { recursive: true, force: true });
  for (const [path, data] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), data);
  }
}

/** 親の starter の設定ファイル (類題に写す)。 */
function parentConfigOf(taskDir: string): Record<string, Buffer> {
  return Object.fromEntries(
    Object.entries(readTree(join(taskDir, "starter"))).filter(([path]) => isConfigFile(path)),
  );
}

/** 類題 1 問の下書きを検査する (一時の複製に置く)。 */
async function verifyFullDraft(
  target: DraftTarget,
  name: string,
  files: Record<string, Buffer>,
): Promise<string[]> {
  const scratch = scratchCopy(target);
  try {
    writeTree(join(scratch.taskDir, "private/variants", name), files);
    return await checkVariants(scratch.root, [`${parentOf(target.taskDir).idPrefix}/${name}`]);
  } finally {
    rmSync(scratch.root, { recursive: true, force: true });
  }
}

function readParams(templateDir: string, label: string): VariantParams[] {
  return parseVariantParams(
    JSON.parse(readFileSync(join(templateDir, "params.json"), "utf8")),
    label,
  );
}

/** テンプレートの値 1 組を検査する (一時の複製の params.json に足して書き出す)。 */
async function verifyParamsDraft(
  target: DraftTarget,
  template: string,
  params: VariantParams,
): Promise<string[]> {
  const scratch = scratchCopy(target);
  try {
    const dir = join(scratch.taskDir, VARIANT_TEMPLATES_DIR, template);
    const existing = readParams(dir, template);
    writeFileSync(join(dir, "params.json"), `${JSON.stringify([...existing, params], null, 2)}\n`);
    try {
      syncVariantTemplates(join(scratch.root, "courses"), {
        check: false,
        filter: (dir) => dir === scratch.taskDir,
      });
    } catch (err) {
      return [(err as Error).message];
    }
    return await checkVariants(scratch.root, [
      `${parentOf(target.taskDir).idPrefix}/${params.name}`,
    ]);
  } finally {
    rmSync(scratch.root, { recursive: true, force: true });
  }
}

export interface DraftOutcome {
  /** 書き出した類題の名前。 */
  written: string[];
  /** 直しても検査に通らなかった下書き (書き出していない)。 */
  failed: { name: string; errors: string[] }[];
  /** 頼んだ数より少なく返ってきた数。 */
  missing: number;
}

function asArray<T>(value: unknown, key: string): T[] {
  const list = (value as Record<string, unknown> | null)?.[key];
  return Array.isArray(list) ? (list as T[]) : [];
}

/**
 * まとまり 1 つの下書きを作って書き出す。`first` を渡すと最初の依頼を呼ばずにそれを使う
 * (Batch で受け取った結果)。`log` に進み具合を出す。
 */
export async function runDraftGroup(
  model: DraftModel,
  target: DraftTarget,
  group: DraftGroup,
  options: { guide: string; first?: unknown; log?: (line: string) => void },
): Promise<DraftOutcome> {
  const log = options.log ?? (() => {});
  const request = draftRequest(target, group, options.guide);
  const output = options.first ?? (await model.complete(request));
  const parent = parentOf(target.taskDir);
  const outcome: DraftOutcome = { written: [], failed: [], missing: 0 };
  const existing = variantStockOf(target.taskDir).names;
  /** 直しを頼む。応答に下書きが無い・依頼が失敗したときは理由を返す (ほかの下書きは止めない)。 */
  const repair = async (
    key: "params" | "variants",
    draft: unknown,
    errors: string[],
  ): Promise<{ draft: unknown } | { error: string }> => {
    try {
      const next = asArray<unknown>(
        await model.complete(repairRequest(request, draft, errors)),
        key,
      )[0];
      return next === undefined
        ? { error: "直しの応答に下書きがありませんでした" }
        : { draft: next };
    } catch (err) {
      return { error: `直しの依頼に失敗しました: ${err instanceof Error ? err.message : err}` };
    }
  };

  if (group.template) {
    const templateDir = join(target.taskDir, VARIANT_TEMPLATES_DIR, group.template);
    const current = readParams(templateDir, group.template);
    const drafts = asArray<DraftParams>(output, "params").slice(0, group.count);
    outcome.missing = group.count - drafts.length;
    const names = allocateVariantNames(
      [...existing, ...current.map((p) => p.name)],
      drafts.map((d) => d.slug),
    );
    const accepted: VariantParams[] = [];
    for (const [i, first] of drafts.entries()) {
      const name = names[i] as string;
      let draft: unknown = first;
      let errors: string[] = [];
      for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
        if (attempt > 0) {
          log(`  ${name}: 直しています (${attempt}/${MAX_REPAIRS})`);
          const repaired = await repair("params", draft, errors);
          if ("error" in repaired) {
            errors = [...errors, repaired.error];
            break;
          }
          draft = repaired.draft;
        }
        const built = draftTemplateParams(draft as DraftParams, name, [...current, ...accepted]);
        errors = built.params
          ? await verifyParamsDraft(target, group.template, built.params)
          : built.errors;
        if (built.params && errors.length === 0) {
          accepted.push(built.params);
          break;
        }
      }
      if (errors.length > 0) outcome.failed.push({ name, errors });
    }
    if (accepted.length > 0) {
      writeFileSync(
        join(templateDir, "params.json"),
        `${JSON.stringify([...current, ...accepted], null, 2)}\n`,
      );
      syncVariantTemplates(join(target.contentRoot, "courses"), {
        check: false,
        filter: (dir) => dir === target.taskDir,
      });
      outcome.written.push(...accepted.map((p) => p.name));
    }
    return outcome;
  }

  const drafts = asArray<{ slug: string; files: DraftFile[] }>(output, "variants").slice(
    0,
    group.count,
  );
  outcome.missing = group.count - drafts.length;
  const names = allocateVariantNames(
    existing,
    drafts.map((d) => d.slug),
  );
  const parentConfig = parentConfigOf(target.taskDir);
  for (const [i, first] of drafts.entries()) {
    const name = names[i] as string;
    let draft: unknown = first;
    let errors: string[] = [];
    let files: Record<string, Buffer> = {};
    for (let attempt = 0; attempt <= MAX_REPAIRS; attempt++) {
      if (attempt > 0) {
        log(`  ${name}: 直しています (${attempt}/${MAX_REPAIRS})`);
        const repaired = await repair("variants", draft, errors);
        if ("error" in repaired) {
          errors = [...errors, repaired.error];
          break;
        }
        draft = repaired.draft;
      }
      const built = draftVariantFiles(asArray<DraftFile>(draft, "files"), {
        id: `${parent.idPrefix}/${name}`,
        pattern: parent.pattern,
        kind: group.kind as TaskKind,
        parentConfig,
        mutants: parent.mutants,
      });
      files = built.files;
      errors = built.errors.length > 0 ? built.errors : await verifyFullDraft(target, name, files);
      if (errors.length === 0) break;
    }
    if (errors.length > 0) {
      outcome.failed.push({ name, errors });
      continue;
    }
    writeTree(join(target.taskDir, "private/variants", name), files);
    outcome.written.push(name);
  }
  return outcome;
}
