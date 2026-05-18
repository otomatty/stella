/**
 * 共有型定義。サーバとクライアントの両方で使われる。
 *
 * サーバが import するのはこのファイルのみ。
 * AST解析(grading/ast.ts) と 評価(grading/evaluate.ts) はクライアントのみが使用する。
 */

// ───────────────────────────────────────────────────────────────────
// カリキュラム軸 (Stage x Chapter)
// ───────────────────────────────────────────────────────────────────

export type Stage = "S0" | "S1" | "S2" | "S3" | "S4" | "S5";

/**
 * 課題の対象言語。
 *
 * falcon-informal P0 では JavaScript / SQL のみ。
 * Python / PHP / Vitest mutation / ESLint config は本プロジェクトのスコープ外 (将来枠)。
 * `getRunner(language)` で言語別ランナー実装を取得する。
 */
export type Language = "javascript" | "sql";

/**
 * 多ファイル教材で 1 ファイルを表す。
 *
 * - `path` は仮想ワークスペース上の相対パス (例: `"main.js"`, `"schema.sql"`)
 * - `language` 省略時は所属 Assignment の `language` を継承
 * - `readonly: true` は UI 上で編集不可表示 (例: 課題が与える seed.sql)
 */
export interface AssignmentFile {
  path: string;
  content: string;
  language?: Language;
  readonly?: boolean;
}

export type TestKind = "stdout" | "function" | "sql" | "mutation" | "eslint-config";

export type ChapterId =
  | "Ch00"
  | "Ch01"
  | "Ch02"
  | "Ch03"
  | "Ch04"
  | "Ch05"
  | "Ch06"
  | "Ch07"
  | "Ch08"
  | "Ch09"
  | "Ch10"
  | "Ch11"
  | "Ch12"
  | "Ch13"
  | "Ch14"
  | "Ch15"
  | "Ch16";

export interface StageInfo {
  id: Stage;
  label: string;
  shortLabel: string;
  description: string;
  defaultTestKind: TestKind;
  estimatedMinutesRange: readonly [number, number];
  targetProblemCount: readonly [number, number];
}

export interface Chapter {
  id: ChapterId;
  /** 表示順。Ch00 は 0、Ch01 以降は章番号に揃える。 */
  order: number;
  /** UI表示用ラベル (例: "Ch01. 変数") */
  label: string;
  description: string;
  defaultMdnPage: string;
  /**
   * `defaultMdnPage` に対応する MDN のページタイトル（ブラウザタイトルから「 | MDN」等を除いたもの）。
   * MDN へのリンク文言として使う。
   */
  mdnPageTitle: string;
}

/**
 * MDN ガイドの特定セクション (見出し) への参照。
 *
 * 課題が学習対象とする MDN ページ内のサブセクションを指し示すために使う。
 * UI ではトピックの MDN ページリンクの下に「参考」として並べて表示される。
 */
export interface MdnSection {
  /** UI に表示する見出しラベル。例: "変数のスコープ" */
  heading: string;
  /**
   * URL のフラグメント部分 (`#` の後ろ)。
   * 省略時は `heading` をそのまま使う。
   * JA MDN は anchor に日本語見出しをそのまま使うため通常は省略可能。
   * 例: heading="数値と '+' 演算子" のように記号を含む場合のみ
   * `anchor: "数値と_演算子"` を明示する。
   */
  anchor?: string;
  /**
   * 参照先ページの URL 上書き。
   * 省略時は所属章の `defaultMdnPage` を使う。
   * 同じ MDN ページ内のセクションのみを参照する通常ケースでは省略する。
   */
  pageUrl?: string;
  /**
   * `pageUrl` で別ページを指すとき、そのページの MDN タイトル（章の `mdnPageTitle` と同じ規約）。
   * **`pageUrl` を指定したときは必須**（UI で「<pageTitle> §<heading>」として表示する）。
   */
  pageTitle?: string;
}

// ───────────────────────────────────────────────────────────────────
// 課題定義
// ───────────────────────────────────────────────────────────────────

export type Difficulty = 1 | 2 | 3;

export type LintPreset = "S1" | "S2" | "S3" | "S4" | "S5";

/**
 * `mutation` 設定 (referenceImpl + mutants) を必須とする testKind。
 * 採点ランナー側 (`vitest-runner` / `eslint-config-runner`) が `referenceImpl` と
 * `mutants` を直接参照するため、 課題定義時点で省略を型エラーにしたい (#135 P1)。
 */
export type MutationRequiredKind = "mutation" | "eslint-config";

/** Assignment の共通フィールド。 testKind / mutation 以外のすべて。 */
interface AssignmentBase {
  id: string;
  stage: Stage;
  chapterId: ChapterId;
  /** 章内・ステージ内での表示順。 */
  sequence: number;
  title: string;
  newConcept: string;
  estimatedMinutes: number;
  difficulty: Difficulty;
  /** 課題説明 (Markdown) */
  description: string;
  /**
   * 課題の対象言語。 省略時は `"javascript"` 扱い。
   * 多言語化 roadmap (#100) で導入。 `getLanguage(assignment)` でデフォルト解決する。
   */
  language?: Language;
  /**
   * 課題のスターターファイル群。
   * 単一ファイル課題では `starterFiles: singleFile(\`...\`)` (`problems/_common.ts`) で
   * `[{ path: "main.js", content: ... }]` 1 件を生成する。
   * 多ファイル課題はそのまま配列で記述する。 `getStarterFiles(assignment)` で取り出す。
   */
  starterFiles: AssignmentFile[];
  /**
   * 採点・実行の入口ファイルパス。 省略時は `starterFiles[0].path` または言語に応じた既定値。
   * `getEntryFile(assignment)` で解決する。
   *
   * 注意: 既存の `entryPoints` フィールド (lint で「未使用とみなさない名前」のリスト) とは別物。
   * 命名が紛らわしいが、 `entryFile` は 1 つの path 文字列、 `entryPoints` は識別子の配列。
   */
  entryFile?: string;
  /**
   * SQL 課題で採点前に実行される DDL + seed SQL。
   * 採点ランごとに新規 `Database` を生成してこの SQL を流してから、 学習者の `entryFile` を実行する。
   */
  sqlSeed?: string;
  /**
   * function 採点でコードから取り出す関数名・クラス名 (lint の「未使用とみなさない名前」)。
   *
   * 注意: 上記の `entryFile` (採点・実行入口ファイルの path) とは別物。
   * 多ファイル化 roadmap (#100) で `entryFile` が追加されたが、 リネームは scope 外。
   */
  entryPoints?: string[];
  /**
   * function 採点課題で「▶ 関数を試す」 を押したときに、 提出コードの末尾に
   * 追記して実行する 1 行のサンプル呼び出し (例: `console.log(sum([1, 2, 3]))`)。
   * 未指定の function 課題ではフリー実行ボタンを無効化する。
   */
  demoCall?: string;
  /** テストケース */
  tests: TestCase[];
  /** クライアント側静的解析の枠。プリセットの中身は各 content phase で詰める。 */
  lintPreset?: LintPreset;
  staticAnalysis?: StaticAnalysisConfig;
  hints?: string[];
  commonMistakes?: CommonMistake[];
  isCapstone?: boolean;
  /**
   * 模範解答。
   * 全テストにパスし、AST `required` を全充足、`forbidden` 違反ゼロ、
   * Lint エラーゼロで「全チェック通過 = クリア」に到達できる必要がある
   * (CI の回帰テストで検証)。
   * UI では「解答例を表示」アコーディオンからクリア後に閲覧できる。
   * ただし「常に表示」設定が有効な場合は未クリアでも閲覧できる。
   */
  solution?: string;
  /**
   * 「クリアしてはいけない」ことを担保するための誤実装サンプル (任意)。
   * 何らかのチェック (テスト / Lint / AST) を必ず1つ以上失敗することを CI で検証する。
   */
  badSolutions?: BadSolution[];
  /**
   * この課題が学習対象とする MDN のセクション（見出し）への参照。
   * UI では課題説明の上部に「参考」としてリンクを並べて表示する。
   *
   * **方針:** 新規・改稿課題では必ず 1 件以上を指定する（章の代表ページだけでなく、
   * その課題に直接関連するページ・セクションを明示する）。
   * `pageUrl` で別ページへ飛ばす場合は `pageTitle` も必ず付ける。
   */
  mdnSections?: MdnSection[];
}

/**
 * 課題定義の公開型。
 *
 * `testKind` に応じて `mutation` の必須性を型レベルで強制する判別共用体 (#135 P1):
 * - `testKind: "mutation"` (Vitest) または `testKind: "eslint-config"` (ESLint) →
 *   `mutation: MutationConfig` が必須。 ランナーが referenceImpl/mutants を直接読むため。
 * - それ以外の testKind → `mutation` は指定不可 (`?: never`)。
 *
 * 既存課題は JS / SQL / Python が大多数で testKind="stdout"|"function"|"sql" のため、
 * 後者分岐に自動的にマッチする。 ランタイム検証は `check-integrity.ts` が引き続き行う。
 */
export type Assignment =
  | (AssignmentBase & {
      testKind: MutationRequiredKind;
      /** referenceImpl + mutants。 該当 testKind では必須 (型で強制)。 */
      mutation: MutationConfig;
    })
  | (AssignmentBase & {
      testKind: Exclude<TestKind, MutationRequiredKind>;
      /** 非 mutation 系課題では mutation は指定不可。 */
      mutation?: never;
    });

export interface StaticAnalysisConfig {
  eslint?: { rules: Record<string, ESLintRuleConfig> };
  ast?: ASTRequirement;
}

/**
 * mutation 採点で使用するバグ入りスニペット 1 件 (#110 / #111)。
 *
 * - `testKind: "mutation"` (Vitest教材): `code` はバグ入り実装。 学習者のテストファイルと
 *   結合して実行され、 1 件以上 fail することを期待する (= 撃破)。
 * - `testKind: "eslint-config"` (ESLint教材): `code` は学習者の rules で検査すべきバグコード片。
 *   違反 1 件以上 (かつ `expectedRuleId` 指定時はその ruleId が含まれること) で撃破扱い。
 */
export interface Mutant {
  /** 課題内で一意な識別子 (例: "m1", "off-by-one")。 UI 表示と TestResult 名に使う。 */
  id: string;
  /** バグ入りソースの完全形。 testKind により扱いが変わる (上のコメント参照)。 */
  code: string;
  /** どの種類のバグかを説明する短い日本語 (例: "+ を - に取り違え")。 採点結果表示に使う。 */
  description: string;
  /**
   * `testKind: "eslint-config"` 限定の任意フィールド (#111)。 指定された場合、 検出された
   * 違反一覧のうち少なくとも 1 件がこの ruleId と一致しないと撃破扱いにならない。
   * 「このバグはこのルールで止めてほしい」 を採点で明示する用途。 Vitest mutation では未使用。
   */
  expectedRuleId?: string;
}

/**
 * mutation 採点用の共通設定 (#110 / #111)。
 *
 * - `testKind: "mutation"` (Vitest教材): `referenceImpl` は正解実装、 各 `mutant.code` は
 *   バグ入り実装。 学習者のテストが reference では全 pass、 各 mutant では 1 件以上 fail することを期待。
 * - `testKind: "eslint-config"` (ESLint教材): `referenceImpl` は違反 0 件であるべき正解コード、
 *   各 `mutant.code` は学習者の rules で違反を出すべきバグコード片。
 */
export interface MutationConfig {
  /** testKind により意味が変わる完全ソース (上のコメント参照)。 */
  referenceImpl: string;
  /** バグ入りスニペット集合。 各 mutant について撃破 (1 件以上 fail / 違反) が必要。 */
  mutants: Mutant[];
}

export interface BadSolution {
  code: string;
  description: string;
}

export interface CommonMistake {
  pattern: string;
  message: string;
}

export type TestCase = StdoutTestCase | FunctionTestCase | SqlTestCase;

export interface StdoutTestCase {
  name: string;
  /** console.log で捕捉した標準出力。末尾改行は比較時に無視される。 */
  expectedStdout: string;
  code?: never;
  query?: never;
}

export interface FunctionTestCase {
  name: string;
  /**
   * 評価対象のテスト式。 QuickJS ランタイム内で、`code` を読み込んだ後に評価される。
   * 例: 'sum([1,2,3]) === 6'
   *
   * 真値であれば PASS、それ以外は FAIL。例外は `error` として返る。
   */
  code: string;
  expectedStdout?: never;
  query?: never;
}

/**
 * SQL 採点用テストケース。
 *
 * - `query` 未指定: 学習者の SQL を実行し、 その **最終結果セット** を `expectedRows` と比較する。
 *   学習者が SELECT を書く問題で使う (もっとも一般的)。
 * - `query` 指定: 学習者の SQL を実行 (副作用のため。 例: CREATE/INSERT) した後、 同じ Database 上で
 *   `query` を実行して結果を比較する。 DDL/DML を学ぶ問題で使う。
 */
export interface SqlTestCase {
  name: string;
  /** 採点用アサーション SQL。 省略時は学習者 SQL の最終結果を比較する。 */
  query?: string;
  /** 期待される行 (列順は `expectedColumns` または SELECT 順)。 */
  expectedRows: SqlRow[];
  expectedColumns?: string[];
  code?: never;
  expectedStdout?: never;
}

/** SQL クエリの 1 行。 NULL は `null` で表現。 */
export type SqlRow = (string | number | null | boolean)[];

export type ESLintRuleConfig =
  | "off"
  | "warn"
  | "error"
  | 0
  | 1
  | 2
  | [string | number, ...unknown[]];

export interface ASTRequirement {
  /** 必ず使ってほしい識別子・呼び出し (例: ['reduce', 'filter']) */
  required?: ASTPattern[];
  /** 使ってほしくない構文 (例: ['ForStatement', 'VarDeclaration']) */
  forbidden?: ASTPattern[];
}

/**
 * AST要件のパターン。
 *
 * - `kind: "method"` … 任意のメソッド呼び出し `x.NAME(...)` (例: `arr.reduce(...)`)
 * - `kind: "node"`   … 特定のNode種別 (`ForStatement`, `WhileStatement`, etc.)
 * - `kind: "console-log"` … `console.log(...)` 呼び出し
 * - `kind: "const-declaration"` … `const NAME = ...` 宣言
 * - `kind: "var"`    … `var` 宣言
 * - `kind: "loose-eq"` … `==` または `!=`
 * - `kind: "async-fn"` … `async` 関数 (宣言・式・アロー)
 */
export type ASTPattern =
  | { kind: "method"; name: string; label?: string }
  | { kind: "node"; nodeType: ASTNodeType; label?: string }
  | { kind: "console-log"; argument?: ASTConsoleLogArgument; label?: string }
  | { kind: "const-declaration"; name?: string; label?: string }
  | { kind: "var"; label?: string }
  | { kind: "loose-eq"; label?: string }
  | { kind: "async-fn"; label?: string };

export type ASTConsoleLogArgument =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "identifier"; name: string }
  | { kind: "binary"; operator?: string };

export type ASTNodeType =
  // 制御構文・ループ
  | "ForStatement"
  | "ForInStatement"
  | "ForOfStatement"
  | "WhileStatement"
  | "DoWhileStatement"
  | "SwitchStatement"
  | "TryStatement"
  | "ThrowStatement"
  | "IfStatement"
  | "BreakStatement"
  | "ContinueStatement"
  | "ReturnStatement"
  // 宣言
  | "VariableDeclaration"
  | "FunctionDeclaration"
  | "ClassDeclaration"
  | "ClassExpression"
  // class member
  | "ClassPrivateProperty"
  | "PrivateName"
  // 関数式
  | "FunctionExpression"
  | "ArrowFunctionExpression"
  // 式
  | "TemplateLiteral"
  | "ConditionalExpression"
  | "LogicalExpression"
  | "BinaryExpression"
  | "NewExpression"
  | "RegExpLiteral"
  | "AwaitExpression"
  | "MemberExpression"
  // パターン (分割代入・スプレッド・残余)
  | "SpreadElement"
  | "RestElement"
  | "ObjectPattern"
  | "ArrayPattern";

// ───────────────────────────────────────────────────────────────────
// テスト実行 (サーバが返す)
// ───────────────────────────────────────────────────────────────────

export interface RunTestsRequest {
  code: string;
  testKind: TestKind;
  tests: TestCase[];
  entryPoints?: string[];
  /**
   * "test" (既定): tests を採点する通常モード。
   * "freerun": tests を無視してコードを実行し stdout のみ返す。
   * 学習者が採点とは別に「いまの出力を見たい」用途で使う。
   */
  mode?: "test" | "freerun";
}

export interface RunTestsResponse {
  durationMs: number;
  results: TestResult[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  stdout?: string;
  expectedStdout?: string;
  /** タイムアウトの場合は 'TIMEOUT'、コンパイルエラーは 'COMPILE_ERROR' */
  error?: string;
}

// ───────────────────────────────────────────────────────────────────
// 静的解析 (クライアントで計算)
// ───────────────────────────────────────────────────────────────────

export interface LintViolation {
  ruleId: string | null;
  severity: 1 | 2;
  /** 日本語化されたメッセージ */
  message: string;
  /** 元の英語メッセージ (フォールバック) */
  rawMessage?: string;
  line: number;
  column: number;
}

export interface ASTResult {
  /** 必須パターンが見つかったかどうか (順序は Assignment.staticAnalysis.ast.required と同じ) */
  required: ASTCheckResult[];
  /** 禁止パターンの違反 (見つかったもののみ) */
  forbidden: ASTViolation[];
  /** AST解析自体が失敗した場合 (パースエラー) */
  parseError?: string;
}

export interface ASTCheckResult {
  pattern: ASTPattern;
  label: string;
  found: boolean;
}

export interface ASTViolation {
  pattern: ASTPattern;
  label: string;
  line: number;
}

// ───────────────────────────────────────────────────────────────────
// 評価結果 (全チェック通過の二値判定)
// ───────────────────────────────────────────────────────────────────

export interface EvaluationResult {
  /** Lint / AST / テストすべてのチェックを通過しているか */
  cleared: boolean;
  /** 各セクションの結果 */
  checks: {
    /** Lint: severity===2 (error) が 0 件なら通過 */
    lintPassed: boolean;
    /** AST: parseError なし & required 全充足 & forbidden 0 件 */
    astPassed: boolean;
    /** Tests: 全テストが passed */
    testsPassed: boolean;
  };
}
