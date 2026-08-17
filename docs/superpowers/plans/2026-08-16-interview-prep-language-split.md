# 面談対策の案件種別を言語・FW粒度へ分割する Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 面談対策の割当カテゴリ `PHP/JS` を `PHP` / `JS` へ分割し、`PHP/Laravel` のような FW 粒度の割当を可能にする。

**Architecture:** 質問の分類を `category: string`(1問1カテゴリ)から `categories: string[]`(階層タグの配列)へ変更する。タグは `PHP/Laravel` のようにスラッシュ区切りで、割当との照合は双方向プレフィックスマッチ (`tagMatches`)。`全案件共通` は特別なタグ値として残し、常時表示は `visibleQuestions` 側の責務とする。

**Tech Stack:** TypeScript / Vitest / Drizzle ORM (Cloudflare D1 = SQLite) / Hono / React + Vite / Biome

**設計書:** [2026-08-16-interview-prep-language-split-design.md](../specs/2026-08-16-interview-prep-language-split-design.md)

## Global Constraints

- 割当可能なタグは以下10個のみ。`全案件共通` は割当対象外で常時表示:
  `PHP` / `PHP/Laravel` / `PHP/CakePHP` / `PHP/スクラッチ` / `JS` / `JS/React` / `JS/Vue` / `JS/jQuery` / `SQL` / `テスト`
- 質問データの正本は `packages/shared/src/interview/questions.json`。D1 へは seed の upsert/prune で投入する。安定UUID は `interview-q:${tenantId}:${q.no}` で**変更しない**。
- 再タグ付け後の問題数は **175問**(188問 − 統合により削除される13問)。
- **どのコミットでも `bun run typecheck` / `bun run test` / `bun run build` が通ること。** `category` → `categories` は shared / api / web を跨ぐ破壊的変更なので、Task 1 は途中でコミットせず、3層すべてが揃ってから1コミットにまとめる。
- **lint について**: 実装中、`bun run lint` (`biome ci .`) が本計画と無関係なファイル(`tsconfig.json` / `package.json` / `apps/api/src/routes/me.ts` など)で CRLF フォーマットエラーを出していたため、検証は変更ファイル限定の `bunx biome check <files>` で代替していた。
  **原因は後に判明し解消済み**: リポジトリの index は LF (`git ls-files --eol` が `i/lf w/crlf`)、`.gitattributes` も `* text=auto eol=lf` で正しい。`.gitattributes` が追加された `255d35a` より前にチェックアウトされたファイルが作業ツリーで再正規化されず CRLF のまま残っていただけで、リポジトリにも CI (Linux の fresh clone) にも問題は無かった。対象550ファイルを index から取り直して解消し、現在は `bun run lint` が 361ファイル0エラーで通る。**以降の検証はリポジトリ全体の `bun run lint` を使ってよい。**
- Lint は Biome (`bun run lint` = `biome ci .`)。`noExplicitAny` / `noNonNullAssertion` / `noArrayIndexKey` / `noConsoleLog` は error。
- 日本語コメント・日本語UIコピーは既存コードのトーンに合わせる。
- FW別問題の執筆(`PHP/CakePHP` など計20–24問)は**本計画のスコープ外**。

---

## File Structure

| ファイル | 変更 | 責務 | Task |
|---|---|---|---|
| `packages/shared/src/interview/types.ts` | Modify | `InterviewQuestion.categories`、割当可能タグ定数 | 1 |
| `packages/shared/src/interview/filter.ts` | Modify | 階層タグ照合 (`tagMatches`) と可視質問の絞り込み | 1 |
| `packages/shared/src/interview/filter.test.ts` | Modify | 上記のユニットテスト + データ不変条件 | 1 |
| `packages/shared/src/interview/questions.json` | Modify | 質問データ本体(再タグ付け + 13問削除) | 1 |
| `packages/shared/src/interview/questions.ts` | Modify | 件数コメント | 1 |
| `apps/api/src/db/schema.ts` | Modify:504 | `interview_questions` の列定義 | 1 |
| `apps/api/drizzle/0013_*.sql` | Create | 列の置換 + 既存割当行の変換 | 1 |
| `packages/shared/scripts/export-seed-sql.ts` | Modify:324-338 | seed SQL 生成 | 1 |
| `apps/api/src/routes/interview-prep.ts` | Modify:25-26 | `Q_SELECT` | 1 |
| `apps/web/src/components/learner/InterviewPrep.tsx` | Modify | 受講者のチップ・絞り込み・カード表示 | 1 |
| `apps/web/src/components/ui/chip.tsx` | Create | 両画面で使う共通チップ(`disabled` 対応) | 2 |
| `apps/web/src/components/instructor/InterviewPrepAssignments.tsx` | Modify | 割当UI(表の列 → チップ群) | 2 |

---

## Task 1: 面談対策を階層タグへ移行する (shared + API + 受講者画面)

`questions.json` の構造・`InterviewQuestion` 型・D1 の列・API の SELECT・受講者画面は一本の破壊的変更で繋がっている。途中でコミットするとどの中間コミットも `typecheck` が通らないため、**1タスク・1コミット**で通す。

**Files:**
- Modify: `packages/shared/src/interview/types.ts`
- Modify: `packages/shared/src/interview/filter.ts`
- Modify: `packages/shared/src/interview/filter.test.ts`
- Modify: `packages/shared/src/interview/questions.json`
- Modify: `packages/shared/src/interview/questions.ts`
- Modify: `packages/shared/scripts/export-seed-sql.ts`
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/drizzle/0013_*.sql` (drizzle-kit が命名)
- Modify: `apps/api/src/routes/interview-prep.ts`
- Modify: `apps/web/src/components/learner/InterviewPrep.tsx`

**Interfaces:**
- Consumes: なし(起点タスク)
- Produces:
  - `InterviewQuestion.categories: string[]` (`category: string` は廃止)
  - `ASSIGNABLE_CATEGORIES: readonly string[]` — 上記10タグ
  - `COMMON_CATEGORY = "全案件共通"`
  - `isAssignableCategory(v: unknown): v is AssignableCategory`
  - `tagMatches(tag: string, selected: string): boolean` — `@falcon/shared/interview/filter`
  - `visibleQuestions<T extends { categories: string[] }>(all: T[], assignedCategories: string[]): T[]`
  - D1 `interview_questions.categories` (text 列に JSON 配列)
  - API レスポンス `rows[].categories: string[]`

### A. shared の型と照合ロジック

- [ ] **Step 1: 型を書き換える**

`packages/shared/src/interview/types.ts` の該当箇所を置き換える。

```ts
export interface InterviewQuestion {
  no: number;
  /** 案件種別タグ (階層値)。 COMMON_CATEGORY を含む場合は全員へ表示 */
  categories: string[];
  subcategory: string;
  /** 優先度: A 必修 / B 推奨 / C 参考 */
  freq: "A" | "B" | "C";
  question: string;
  /** 目安回答時間 (例: "30秒") */
  time: string | null;
  keywords: string | null;
  /** 面談官の質問意図 */
  intent: string | null;
  /** 穴埋め式「回答の型」。 HTML 文字列 (class="blank" の span が穴) */
  answer_template: string | null;
  deep1: string | null;
  deep2: string | null;
  deep3: string | null;
  /** 避けたい回答 */
  ng: string | null;
  /** 評価軸 */
  criteria: string | null;
  /** 逆質問 (エンジニア側から聞く質問) */
  is_reverse: boolean;
}

/**
 * 講師が受講者へ割当できる案件種別タグ。 共通カテゴリは割当対象外で常時表示。
 * 階層は "/" 区切り (例: "PHP/Laravel")。 FW を増やすときはここに文字列を足すだけでよい。
 */
export const ASSIGNABLE_CATEGORIES = [
  "PHP",
  "PHP/Laravel",
  "PHP/CakePHP",
  "PHP/スクラッチ",
  "JS",
  "JS/React",
  "JS/Vue",
  "JS/jQuery",
  "SQL",
  "テスト",
] as const;
export type AssignableCategory = (typeof ASSIGNABLE_CATEGORIES)[number];

export const COMMON_CATEGORY = "全案件共通";

export function isAssignableCategory(v: unknown): v is AssignableCategory {
  return typeof v === "string" && (ASSIGNABLE_CATEGORIES as readonly string[]).includes(v);
}
```

ファイル先頭のコメントの「188 問」を「175 問」に直す。

- [ ] **Step 2: 失敗するテストを書く**

`packages/shared/src/interview/filter.test.ts` の先頭から `describe("visibleQuestions")` ブロックの終わりまでを、以下で置き換える(`describe("INTERVIEW_QUESTIONS")` ブロックは Step 7 で更新するのでこの時点では残す)。

```ts
import { describe, expect, it } from "vitest";

import { tagMatches, visibleQuestions } from "./filter.js";
import { INTERVIEW_QUESTIONS } from "./questions.js";
import { ASSIGNABLE_CATEGORIES, COMMON_CATEGORY } from "./types.js";

const q = (no: number, categories: string[]) => ({ no, categories });

describe("tagMatches", () => {
  it("完全一致", () => {
    expect(tagMatches("PHP", "PHP")).toBe(true);
  });

  it("下位タグの問題は上位の割当にマッチする", () => {
    expect(tagMatches("PHP/Laravel", "PHP")).toBe(true);
  });

  it("上位タグの問題は下位の割当にマッチする", () => {
    expect(tagMatches("PHP", "PHP/Laravel")).toBe(true);
  });

  it("別系統にはマッチしない", () => {
    expect(tagMatches("PHP", "JS")).toBe(false);
    expect(tagMatches("PHP/Laravel", "JS/React")).toBe(false);
  });

  it("前方一致だけの別タグにはマッチしない (区切りを跨がない)", () => {
    expect(tagMatches("PHPUnit", "PHP")).toBe(false);
  });
});

describe("visibleQuestions", () => {
  const all = [
    q(1, ["PHP"]),
    q(2, ["PHP/Laravel"]),
    q(3, ["JS"]),
    q(4, ["PHP", "JS"]),
    q(5, ["SQL"]),
    q(6, ["テスト"]),
    q(7, [COMMON_CATEGORY]),
  ];

  it("割当なしなら共通タグのみ", () => {
    expect(visibleQuestions(all, []).map((x) => x.no)).toEqual([7]);
  });

  it("言語タグの割当は同言語の下位タグの問題も拾う", () => {
    expect(visibleQuestions(all, ["PHP"]).map((x) => x.no)).toEqual([1, 2, 4, 7]);
  });

  it("FW タグの割当は上位の言語タグの問題も拾う", () => {
    expect(visibleQuestions(all, ["PHP/Laravel"]).map((x) => x.no)).toEqual([1, 2, 4, 7]);
  });

  it("複数タグの問題はいずれかの割当にマッチすれば出る", () => {
    expect(visibleQuestions(all, ["JS"]).map((x) => x.no)).toEqual([3, 4, 7]);
  });

  it("テスト案件の受講者に PHP/JS 向けの問題は出ない (課題①の回帰防止)", () => {
    expect(visibleQuestions(all, ["テスト"]).map((x) => x.no)).toEqual([6, 7]);
  });

  it("未知の割当タグは無視される", () => {
    expect(visibleQuestions(all, ["Java"]).map((x) => x.no)).toEqual([7]);
  });
});
```

- [ ] **Step 3: テストが落ちることを確認する**

```bash
bun run test -- filter
```

期待: `tagMatches` が `filter.js` から export されておらず FAIL。

- [ ] **Step 4: `filter.ts` を実装する**

`packages/shared/src/interview/filter.ts` を全置換する。

```ts
import { COMMON_CATEGORY } from "./types.js";

/**
 * 案件種別タグ同士の階層照合。 タグは "/" 区切り (例: "PHP/Laravel")。
 * 上位・下位のどちらからでもマッチさせる —
 * 割当 "PHP" は "PHP/Laravel" の問題を拾い、 割当 "PHP/Laravel" は "PHP" の問題も拾う。
 *
 * COMMON_CATEGORY の常時通過はここでは扱わない (visibleQuestions 側の責務)。
 * ここに入れると、 受講者がチップで "PHP" を選んだときに共通問題まで出てしまう。
 */
export function tagMatches(tag: string, selected: string): boolean {
  return tag === selected || tag.startsWith(`${selected}/`) || selected.startsWith(`${tag}/`);
}

/**
 * 受講者に見せる質問: 共通タグ + 割当タグにマッチするもの。
 * API (D1 行) と web (バンドル済み fixtures) の両方で使うため categories だけに依存する。
 */
export function visibleQuestions<T extends { categories: string[] }>(
  all: T[],
  assignedCategories: string[],
): T[] {
  return all.filter((q) =>
    q.categories.some(
      (tag) => tag === COMMON_CATEGORY || assignedCategories.some((a) => tagMatches(tag, a)),
    ),
  );
}
```

- [ ] **Step 5: 照合のテストが通ることを確認する**

```bash
bun run test -- filter
```

期待: `tagMatches` / `visibleQuestions` の全ケース PASS。`INTERVIEW_QUESTIONS` の describe はデータ未変換のため FAIL のままでよい。

### B. 質問データの再タグ付け

- [ ] **Step 6: 変換スクリプトを書いて実行する**

リポジトリ外の一時ディレクトリ(セッションのスクラッチパッド)に `retag.mjs` を作成する。一回限りのスクリプトなのでリポジトリにはコミットしない。パスを相対で開くので、**リポジトリルートを作業ディレクトリにして**実行すること。

```js
import { readFileSync, writeFileSync } from "node:fs";

const PATH = "packages/shared/src/interview/questions.json";
const rows = JSON.parse(readFileSync(PATH, "utf8"));

// 重複の統合: [残す no, 削除する no]。 残す側の判定は設計書の実測結果。
// 内容はほぼ同一なので、 削除する側を落とすだけでよい (本文のマージは不要)。
const MERGE = [
  [5, 148], [17, 156], [20, 157], [22, 158], [25, 163],
  [166, 30], [167, 33], [172, 34], [35, 146], [37, 164],
  [39, 170], [45, 187], [46, 188],
];
const DROP = new Set(MERGE.map(([, drop]) => drop));

// 明示タグ。 ここに無い no は元の category を 1 要素配列にする (SQL / テスト / 全案件共通)。
const TAGS = {
  // --- 旧 PHP/JS (no 2-46) ---
  2: ["PHP", "JS"],
  3: ["全案件共通"],
  4: ["全案件共通"],
  5: ["PHP"],
  6: ["PHP/Laravel"],
  7: ["PHP"], 8: ["PHP"], 9: ["PHP"], 10: ["PHP"],
  11: ["PHP"], 12: ["PHP"], 13: ["PHP"], 14: ["PHP"],
  15: ["JS"], 16: ["JS"], 17: ["JS"], 18: ["JS"], 19: ["JS"],
  20: ["JS"], 21: ["JS"], 22: ["JS"], 23: ["JS"], 24: ["JS"],
  25: ["全案件共通"],
  26: ["PHP/Laravel"],
  27: ["PHP", "JS"], 28: ["PHP", "JS"], 29: ["PHP", "JS"],
  31: ["PHP", "JS"], 32: ["PHP", "JS"],
  35: ["全案件共通"], 36: ["全案件共通"], 37: ["全案件共通"],
  38: ["全案件共通"], 39: ["全案件共通"], 40: ["全案件共通"],
  41: ["全案件共通"], 42: ["全案件共通"], 43: ["全案件共通"],
  44: ["PHP", "JS"],
  45: ["全案件共通"], 46: ["全案件共通"],
  // --- 旧 全案件共通 からの救出 (no 149-162) ---
  149: ["PHP"],
  150: ["PHP/Laravel"], 151: ["PHP/Laravel"], 152: ["PHP/Laravel"],
  153: ["PHP"],
  154: ["JS"], 155: ["JS"],
  159: ["SQL"], 160: ["SQL"], 161: ["SQL"], 162: ["SQL"],
  // --- 統合で 全案件共通 側が残る組 (タグは広い方を採用) ---
  166: ["全案件共通"], 167: ["全案件共通"], 172: ["全案件共通"],
};

const KNOWN = new Set([
  "PHP", "PHP/Laravel", "PHP/CakePHP", "PHP/スクラッチ",
  "JS", "JS/React", "JS/Vue", "JS/jQuery",
  "SQL", "テスト", "全案件共通",
]);

const out = rows
  .filter((x) => !DROP.has(x.no))
  .map((x) => ({
    no: x.no,
    categories: TAGS[x.no] ?? [x.category],
    subcategory: x.subcategory,
    freq: x.freq,
    question: x.question,
    time: x.time,
    keywords: x.keywords,
    intent: x.intent,
    answer_template: x.answer_template,
    deep1: x.deep1,
    deep2: x.deep2,
    deep3: x.deep3,
    ng: x.ng,
    criteria: x.criteria,
    is_reverse: x.is_reverse,
  }));

// 検証 — 失敗したら書き込まずに落とす
if (out.length !== 175) throw new Error(`件数が 175 ではない: ${out.length}`);
for (const x of out) {
  if (!Array.isArray(x.categories) || x.categories.length === 0) {
    throw new Error(`no=${x.no} の categories が空`);
  }
  for (const t of x.categories) {
    if (!KNOWN.has(t)) throw new Error(`no=${x.no} に未知のタグ: ${t}`);
  }
}
const counts = {};
for (const x of out) for (const t of x.categories) counts[t] = (counts[t] ?? 0) + 1;
process.stdout.write(`${JSON.stringify(counts, null, 2)}\n`);

writeFileSync(PATH, `${JSON.stringify(out, null, 2)}\n`);
```

実行する(`<スクラッチパッド>` は実際の保存先に置き換える)。

```bash
node <スクラッチパッド>/retag.mjs
```

期待する出力(**タグの出現回数**。`["PHP","JS"]` の7問は PHP と JS の両方に計上される):

```json
{
  "PHP": 18,
  "JS": 19,
  "PHP/Laravel": 5,
  "全案件共通": 43,
  "SQL": 50,
  "テスト": 47
}
```

合計出現回数 182 = 175問 + 複数タグ7問ぶんの重複。行数そのものは175問(スクリプト冒頭の検証で担保)。タグの**専有**内訳は `PHP` のみ11問 / `JS` のみ12問 / `PHP`+`JS` 7問。

書き出したあとフォーマットを揃える。

```bash
bunx biome format --write packages/shared/src/interview/questions.json
```

- [ ] **Step 7: データ不変条件のテストを更新する**

`filter.test.ts` の `describe("INTERVIEW_QUESTIONS")` 内の最初の2つの `it` を以下で置き換える(`HTML タグは answer_template の blank span のみ` の `it` は変更しない)。

```ts
  it("175 問で no が一意", () => {
    expect(INTERVIEW_QUESTIONS).toHaveLength(175);
    expect(new Set(INTERVIEW_QUESTIONS.map((d) => d.no)).size).toBe(175);
  });

  it("タグと優先度が既知の値のみ", () => {
    const known = new Set<string>([...ASSIGNABLE_CATEGORIES, COMMON_CATEGORY]);
    for (const d of INTERVIEW_QUESTIONS) {
      expect(d.categories.length, `no=${d.no} の categories が空`).toBeGreaterThan(0);
      for (const tag of d.categories) {
        expect(known, `no=${d.no} の ${tag}`).toContain(tag);
      }
      expect(["A", "B", "C"]).toContain(d.freq);
    }
  });

  it("旧 PHP/JS カテゴリが残っていない", () => {
    const tags = new Set(INTERVIEW_QUESTIONS.flatMap((d) => d.categories));
    expect(tags.has("PHP/JS")).toBe(false);
    expect(tags.has("PHP")).toBe(true);
    expect(tags.has("JS")).toBe(true);
    expect(tags.has("PHP/Laravel")).toBe(true);
  });
```

`packages/shared/src/interview/questions.ts` のコメント「想定質問バンク (188 問)」を「(175 問)」に直す。

- [ ] **Step 8: shared のテストが全部通ることを確認する**

```bash
bun run test
```

期待: `packages/shared` のテストが全 PASS。

### C. DB スキーマ・マイグレーション・seed・API

- [ ] **Step 9: スキーマの列を差し替える**

`apps/api/src/db/schema.ts` の `interviewQuestions` 内の

```ts
    category: text("category").notNull(),
```

を

```ts
    categories: json<string[]>("categories", []),
```

に置き換える。`json` ヘルパーは同ファイル26行目で定義済み(`text(name, { mode: "json" }).$type<T>().notNull().default(fallback)`)。

- [ ] **Step 10: マイグレーションを生成する**

```bash
bun run --filter=@falcon/api db:generate
```

`apps/api/drizzle/0013_*.sql` が生成される。

- [ ] **Step 11: 既存割当行の変換を追記する**

生成された `apps/api/drizzle/0013_*.sql` の末尾に以下を追記する。

```sql
--> statement-breakpoint
-- 既存の割当 ["PHP/JS"] を ["PHP","JS"] へ。 他タグと併記された行も replace で一括対応する
UPDATE `interview_prep_assignments` SET `categories` = replace(`categories`, '"PHP/JS"', '"PHP","JS"');
```

`interview_questions` 側の既存行はデータ変換不要。seed が全行 upsert / prune するため。デプロイは `D1 migrate remote → D1 seed remote` の順に走る([docs/ci-cd.md](../../ci-cd.md))ので順序は保証されている。

- [ ] **Step 12: seed の SQL 生成を更新する**

`packages/shared/scripts/export-seed-sql.ts` の `emitInterviewQuestions()` 内で、`category` を `categories` に置き換える。JSON 配列を文字列リテラルとして書き出す。

`for (const q of INTERVIEW_QUESTIONS) {` の直後の `const id = ...` の上に追加:

```ts
    const cats = strLit(JSON.stringify(q.categories));
```

insert 文の以下3箇所を書き換える:

| 箇所 | 変更前 | 変更後 |
|---|---|---|
| 列リスト | `no, category, subcategory,` | `no, categories, subcategory,` |
| VALUES | `${q.no}, ${strLit(q.category)}, ${strLit(q.subcategory)},` | `${q.no}, ${cats}, ${strLit(q.subcategory)},` |
| on conflict | `set category = excluded.category, subcategory = ...` | `set categories = excluded.categories, subcategory = ...` |

`stableUuid(\`interview-q:${tenantId}:${q.no}\`)` は**変更しない**(既存行の id を維持し、削除された13問は末尾の `delete ... not in (...)` で prune される)。

- [ ] **Step 13: API の SELECT を更新する**

`apps/api/src/routes/interview-prep.ts` の `Q_SELECT` 内で

```ts
  category: interviewQuestions.category,
```

を

```ts
  categories: interviewQuestions.categories,
```

に置き換える。他の行は変更しない(`visibleQuestions` の呼び出しは記述そのまま)。

- [ ] **Step 14: マイグレーションと seed を流す**

```bash
bun run db:migrate && bun run db:seed && bun run smoke:d1
```

期待: エラーなく完了。

- [ ] **Step 15: D1 の中身を確認する**

```bash
bunx wrangler d1 execute falcon-db --local --command "select categories, count(*) c from interview_questions group by categories order by c desc"
```

期待: `["SQL"]` 50 / `["テスト"]` 47 / `["全案件共通"]` 43 / `["JS"]` 12 / `["PHP"]` 11 / `["PHP","JS"]` 7 / `["PHP/Laravel"]` 5。合計175行。`PHP/JS` を含む行が0件であること。

### D. 受講者の面談対策画面

- [ ] **Step 16: import を追加する**

`apps/web/src/components/learner/InterviewPrep.tsx` の8行目付近の import に `tagMatches` を足す。

```ts
import { ASSIGNABLE_CATEGORIES, COMMON_CATEGORY } from "@falcon/shared/interview/types";
import { tagMatches } from "@falcon/shared/interview/filter";
```

- [ ] **Step 17: カテゴリチップの算出を書き換える**

125-128行目の `catChips` を置き換える。

```ts
  // 表示対象タグのチップ: 割当タグが 1 つ以上あるときだけ出す
  const catChips = useMemo(() => {
    const cats = [...assigned, COMMON_CATEGORY].filter((c) =>
      rows.some((r) => r.categories.some((t) => tagMatches(t, c))),
    );
    return cats.length > 1 ? cats : [];
  }, [assigned, rows]);
```

- [ ] **Step 18: 絞り込みを書き換える**

133行目の `if (cat !== "ALL" && d.category !== cat) return false;` を置き換える。

```ts
      if (cat !== "ALL" && !d.categories.some((t) => tagMatches(t, cat))) return false;
```

136-138行目の検索対象配列 `[d.question, d.keywords, d.subcategory, d.intent]` は変更しない(タグは検索対象に含めない — 既存挙動を維持する)。

- [ ] **Step 19: カード見出しの表示を書き換える**

266行目(一覧)と375行目(ランダム出題)の2箇所を置き換える。

```tsx
                {d.categories.join(" / ")} ・ {d.subcategory}
```

```tsx
          {cur.categories.join(" / ")} ・ {cur.subcategory}
```

96行目のデモ(fixtures)モードの `setAssigned([...ASSIGNABLE_CATEGORIES])` は変更しない(全件表示のまま)。

### E. 検証とコミット

- [ ] **Step 20: CI ゲートを全部通す**

```bash
bun run lint && bun run typecheck && bun run test && bun run build
```

期待: すべて PASS。ここが緑にならないうちはコミットしない(Global Constraints)。

- [ ] **Step 21: 画面で確認する**

`bun run dev:api` と `bun run dev` を起動する。`seed-learner` の割当を `PHP/Laravel` のみにする。

```bash
bunx wrangler d1 execute falcon-db --local --command "insert into interview_prep_assignments (id, tenant_id, profile_id, categories, assigned_by, updated_at) values ('test-assign-1', 'ses', 'seed-learner', '[\"PHP/Laravel\"]', 'seed-instructor', 0) on conflict (tenant_id, profile_id) do update set categories = excluded.categories"
```

`seed-learner` の JWT で `/interview-prep` を開き、確認する:
- 優先度「すべて」で **PHP 11問 + PHP/Laravel 5問 + PHP・JS 併記7問 + 全案件共通43問 = 66問** が表示される
- JS専用12問・SQL 50問・テスト47問が**表示されない**
- 案件種別チップに `PHP/Laravel` と `全案件共通` が出る
- `PHP/Laravel` チップを押すと **23問**(`["PHP"]` 11 + `["PHP/Laravel"]` 5 + `["PHP","JS"]` 7)になり、共通問題43問は出ない

確認後、テスト用の割当行を消す。

```bash
bunx wrangler d1 execute falcon-db --local --command "delete from interview_prep_assignments where id = 'test-assign-1'"
```

- [ ] **Step 22: コミットする**

```bash
git add packages/shared apps/api apps/web/src/components/learner/InterviewPrep.tsx
git commit -m "feat: 面談対策の案件種別を言語・FW粒度の階層タグにする"
```

---

## Task 2: 講師の割当画面とチップの共通化

タグが10個になり「受講者行 × カテゴリ列」のテーブルでは横に潰れるため、カテゴリ列をやめて「割当」1列に集約し、セル内にトグル可能なチップを `flex-wrap` で並べる。両画面で同じチップを使うため、`InterviewPrep.tsx` 内のローカル `Chip` を `components/ui/chip.tsx` へ切り出し、`disabled` に対応させる。受講者行の構造・API 呼び出し・楽観更新のロジックは変更しない。

**Files:**
- Create: `apps/web/src/components/ui/chip.tsx`
- Modify: `apps/web/src/components/learner/InterviewPrep.tsx` (ローカル `Chip` を削除して import に置換)
- Modify: `apps/web/src/components/instructor/InterviewPrepAssignments.tsx`
- Modify: `packages/shared/scripts/export-seed-sql.test.ts` (Step 8 — Task 1 レビューの Minor 対応)

**Interfaces:**
- Consumes: Task 1 の `ASSIGNABLE_CATEGORIES`。既存の `listInterviewPrepAssignments` / `saveInterviewPrepAssignment` は変更しない
- Produces: `Chip` — `{ active: boolean; children: React.ReactNode; onClick: () => void; disabled?: boolean }` を受ける共通コンポーネント (`@/components/ui/chip`)

- [ ] **Step 1: 共通 Chip を作る**

`apps/web/src/components/ui/chip.tsx` を新規作成する。中身は `InterviewPrep.tsx:58-81` の既存 `Chip` をそのまま移し、`disabled` を足したもの。

```tsx
import { cn } from "@/lib/utils";

/** 絞り込み・トグル用の丸チップ。 面談対策の受講者画面と講師の割当画面で共用する。 */
export function Chip({
  active,
  children,
  onClick,
  disabled = false,
  ariaLabel,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  /** 同じラベルのチップが並ぶ場合に、 何に対する操作かを読み上げへ伝える */
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "px-2.5 py-1 rounded-full text-[12px] border cursor-pointer transition-colors",
        "disabled:opacity-50 disabled:cursor-default",
        active
          ? "sf-gradient-bg text-white border-transparent font-bold"
          : "bg-card text-ink-2 border-border hover:bg-sunken",
      )}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: 受講者画面のローカル Chip を差し替える**

`apps/web/src/components/learner/InterviewPrep.tsx` から `function Chip({ ... })` の定義(58-81行目)を削除し、import を追加する。

```ts
import { Chip } from "@/components/ui/chip";
```

`cn` が他で使われていなければ `import { cn } from "@/lib/utils";` も削除する。使われていれば残す。`Chip` の呼び出し箇所(モード切替・案件種別・優先度)は**変更不要**(props は後方互換)。

- [ ] **Step 3: 受講者画面が壊れていないことを確認する**

```bash
bun run typecheck && bun run lint
```

期待: PASS。`/interview-prep` の見た目が Task 1 Step 21 と変わらないこと(`aria-pressed` が増えるだけ)。

- [ ] **Step 4: 割当画面のヘッダを1列に変える**

`apps/web/src/components/instructor/InterviewPrepAssignments.tsx` の92-101行目の `<TableHeader>` を置き換える。

```tsx
            <TableHeader>
              <TableRow>
                <TableHead className="w-40 sm:w-56">受講者</TableHead>
                <TableHead>割当</TableHead>
              </TableRow>
            </TableHeader>
```

あわせて、直前の `<Table>` の開始タグに `className="max-lg:min-w-0"` を足す。

```tsx
          <Table className="max-lg:min-w-0">
```

理由: [table.tsx:13](../../../apps/web/src/components/ui/table.tsx#L13) は `max-lg:min-w-max` で「狭幅では表を潰さず横スクロールさせる」既定になっている。列が固定幅のセルばかりの成績台帳ではこれが正しいが、この画面の 割当 セルは `flex-wrap` のチップ雲なので、`min-w-max` があるとチップ10個が1行に並んだ幅が最小幅になり、**折り返しが一切効かず表が横スクロールする**。`cn` は tailwind-merge なので消費側の `max-lg:min-w-0` が既定を上書きする。受講者列も 375px 幅では `w-56`(224px) が広すぎるため `w-40` に落とす。

- [ ] **Step 5: 行のセルをチップ群に変える**

109-120行目の `{ASSIGNABLE_CATEGORIES.map((c) => (<TableCell ...>...</TableCell>))}` を、以下の単一セルに置き換える。

```tsx
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {ASSIGNABLE_CATEGORIES.map((c) => (
                        <Chip
                          key={c}
                          active={row.categories.includes(c)}
                          disabled={savingId === row.profile_id}
                          onClick={() => void toggle(row, c)}
                          ariaLabel={`${row.display_name} に ${c} を割当`}
                        >
                          {c}
                        </Chip>
                      ))}
                    </div>
                  </TableCell>
```

import を追加する。

```ts
import { Chip } from "@/components/ui/chip";
```

- [ ] **Step 6: 空表示の colSpan を直す**

126行目の `colSpan={1 + ASSIGNABLE_CATEGORIES.length}` を `colSpan={2}` に変える。

- [ ] **Step 7: 説明文を更新する**

75行目の `sub` を置き換える。

```tsx
        sub="受講者ごとに対策する案件種別を設定します。フレームワークまで指定すると、その言語の共通問題も併せて表示されます"
```

- [ ] **Step 8: seed 生成の回帰テストを足す**

Task 1 のレビュー指摘(Minor)。`emitInterviewQuestions()` の `category` → `categories` は約1000文字のテンプレートリテラル内の3箇所書き換えで、現状 `packages/shared/scripts/export-seed-sql.test.ts` に該当の `it` が無く、実際に seed を流すまで壊れても気づけない。列名を固定するテストを1つ足す。

同ファイルの既存の `it` の書き方(SQL 文字列を生成して `toContain` で検証する形)に合わせて、以下の趣旨のテストを追加する。

```ts
  it("面談対策の insert が categories 列を使う", () => {
    expect(sql).toContain("insert into interview_questions (id, tenant_id, no, categories,");
    expect(sql).toContain("set categories = excluded.categories");
    expect(sql).not.toContain("no, category,");
  });
```

`sql` に相当する変数名・生成方法は既存テストに合わせること。既存テストが SQL 全体を1度だけ生成しているならそれを再利用し、新しいヘルパーは作らない。

- [ ] **Step 9: CI ゲートを通す**

```bash
bun run typecheck && bun run test && bun run build
```

期待: すべて PASS。変更したファイルの lint は `bunx biome check apps/web/src/components/ui/chip.tsx apps/web/src/components/learner/InterviewPrep.tsx apps/web/src/components/instructor/InterviewPrepAssignments.tsx packages/shared/scripts/export-seed-sql.test.ts` で0エラーを確認する(`bun run lint` のリポジトリ全体の CRLF エラーは既存ドリフトで対象外)。

- [ ] **Step 10: 画面で確認する**

`seed-instructor` の JWT で `/interview-prep` を開く。

- 受講者行ごとに10個のチップが折り返して表示される
- チップを押すと色が反転し、トースト「〜 の面談対策を更新しました」が出る
- リロード後も選択が保持される
- ウィンドウ幅を狭めても横スクロールが発生しない

- [ ] **Step 11: コミットする**

```bash
git add apps/web/src/components packages/shared/scripts/export-seed-sql.test.ts
git commit -m "feat(web): 面談対策の割当画面をタグチップ形式にする"
```

---

## Task 3: 全体検証

**Files:** なし(検証のみ)

**Interfaces:**
- Consumes: Task 1-2 のすべて
- Produces: なし

- [ ] **Step 1: CI ゲートを通す**

```bash
bun run lint && bun run typecheck && bun run test && bun run build
```

期待: すべて PASS。

- [ ] **Step 2: コアループのスモークを通す**

`bun run dev:api` を起動した状態で実行する。

```bash
bun run smoke:core
```

期待: 全ステップ PASS。面談対策は smoke:core の対象外だが、スキーマ変更が他機能を壊していないことの確認になる。

- [ ] **Step 3: 割当なしの受講者を確認する**

```bash
bunx wrangler d1 execute falcon-db --local --command "delete from interview_prep_assignments where profile_id = 'seed-learner'"
```

`seed-learner` で `/interview-prep` を開き、**全案件共通の43問のみ**が表示され、案件種別チップが出ない(該当タグが1つしかないため)ことを確認する。

- [ ] **Step 4: 複数割当を確認する**

```bash
bunx wrangler d1 execute falcon-db --local --command "insert into interview_prep_assignments (id, tenant_id, profile_id, categories, assigned_by, updated_at) values ('test-assign-1', 'ses', 'seed-learner', '[\"JS/React\",\"SQL\"]', 'seed-instructor', 0) on conflict (tenant_id, profile_id) do update set categories = excluded.categories"
```

確認項目:
- `JS` 12問 + `["PHP","JS"]` 7問 + `SQL` 50問 + 共通43問 = **112問**が表示される
- `React` 専用問題は0問だが画面は正常に動作する(空カテゴリの無害性の確認)
- `PHP` 専用11問と `PHP/Laravel` 5問が**表示されない**
- チップに `JS/React` / `SQL` / `全案件共通` の3つが出る

- [ ] **Step 5: テストデータを片付ける**

```bash
bunx wrangler d1 execute falcon-db --local --command "delete from interview_prep_assignments where id = 'test-assign-1'"
```

- [ ] **Step 6: 設計書のステータスを更新してコミットする**

`docs/superpowers/specs/2026-08-16-interview-prep-language-split-design.md` の `ステータス:` 行を `実装済み` に変える。

```bash
git add docs/superpowers/specs/2026-08-16-interview-prep-language-split-design.md
git commit -m "docs: 面談対策の言語分割の設計書を実装済みにする"
```

---

## 後続タスク(本計画のスコープ外)

FW別問題の執筆。`packages/shared/src/interview/questions.json` に `no` を190から採番して追記し、`filter.test.ts` の件数期待値を更新する。

| タグ | 必要問題数(目安) |
|---|---|
| `PHP/CakePHP` | 4–5 |
| `PHP/スクラッチ` | 3 |
| `JS/React` | 5–6 |
| `JS/Vue` | 5–6 |
| `JS/jQuery` | 3–4 |
