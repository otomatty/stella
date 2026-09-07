# TypeScript 教材 falcon-informal 移行 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ts-course リポジトリの TypeScript 研修教材（160トピック / 42レッスン）と、その執筆ルール一式を falcon-informal に完全移行し、LMS 上で スライド・ドキュメント・クイズ・自動採点課題として動作させる。

**Architecture:** 教材は `packages/content`（新規 Bun workspace `@stella/content`）にファイルとして置き、**ファイルが唯一の正本**とする。D1 へは既存の `export-seed-sql.ts` パイプラインを拡張して流し込む（CMS 画面での編集は上書きされる前提）。スライドは `slides.md` を LMS 側で描画し（PDF も pptx も配信しない）、図解 SVG と動画だけを R2 に置いて DB はパスを持つ。演習問題は `@stella/shared` の `Assignment` として書き起こし、既存の QuickJS 採点基盤に TypeScript 対応を追加して動かす。

**スライド配信の方式（決定事項）:** LMS のスライドビューア（`SlidesViewer`、react-pdf）は PDF しか読めないが、**PDF は作らない**。`build_pptx.py`（626行）がスライドの見た目の唯一の正本で、そこから PDF を得るには LibreOffice 相当の外部エンジンが要る。代わりに `slides.md` そのものを LMS へ渡し、React 側でスライド単位に描画する。pptx は収録・編集用として残る。動画スライドと Web ページは用途が違うので、見た目が一致しないことは仕様であって欠陥ではない。

**Tech Stack:** Bun workspaces / TypeScript strict / Hono + Cloudflare Workers / D1 (Drizzle) / R2 / React 19 + Vite / QuickJS WASM / Python 3 (python-pptx, pygments, playwright)

## Global Constraints

- 型検査は `bun run typecheck`（`tsc --noEmit`）、lint は `bun run lint`（Biome 1.9.4）。両方通ること。
- 教材本体（スライド・ドキュメント本文・講師ノート・課題文）に原典名（サバイバルTypeScript 等）を書かない。参考リンクは `doc.md` 末尾の「もっと知りたい人へ」のみ可。
- 1トピック = 1 Takeaway。スライドは 4〜6 枚。この粒度を崩さない。
- `slides.md` の front-matter 語彙台帳（`introduces` / `requires`）は必ず更新する。
- 生成物（`*.pptx` / `*.diagram.png` / `dist/`）はコミットしない。`assets/*.svg` は `doc.md` が参照する正本なのでコミットする。
- CI（`.github/workflows/ci.yml` と `deploy.yml`）に載せるのは **語彙台帳検査・画像リンク検査・スライド枚数検査の3つのみ**。Python / Playwright は CI に入れない。
- テナント ID は `ses` 固定（SES 未経験エンジニア育成）。コース slug は `typescript-basics`。
- 教材ビルドの実行には Python 3 と `pip install python-pptx pygments playwright` / `playwright install chromium` が必要。`bun install` だけでは足りない旨を README に書くこと。
- **PDF は作らない。** LMS のスライドは `slides.md` を Web で描画する（後述の Task 5 / 10）。pptx は収録・編集用の成果物として残す。

## File Structure

```text
packages/content/                          # @stella/content（新規 workspace）
├── package.json
├── CLAUDE.md                              # ← ts-course/CLAUDE.md（教材執筆の指針）
├── STYLE_GUIDE.md                         # ← ts-course/STYLE_GUIDE.md
├── CURRICULUM.md                          # ← ts-course/CURRICULUM.md
├── IMAGE_PLAN.md                          # ← ts-course/IMAGE_PLAN.md
├── templates/                             # ← ts-course/templates/
├── design-system/                         # ← ts-course/design-system/
├── modules/m0-orientation … m9-practice/  # ← ts-course/modules/（教材本体 2.1MB）
├── scripts/
│   ├── build.mjs                          # ← ts-course/scripts/build.mjs
│   ├── check_vocab.mjs                    # ← そのまま
│   ├── build_pptx.py                      # ← そのまま
│   ├── diagram_export.py                  # ← そのまま
│   ├── export-content-sql.ts              # 新規: 教材 → seed SQL 断片
│   └── upload-materials.ts                # 新規: 図解 SVG → R2
└── src/
    ├── index.ts                           # 公開 API
    ├── parse-slides.ts                    # slides.md front-matter パーサ
    ├── parse-quiz.ts                      # practice.md 確認クイズ → QuizSeed
    ├── manifest.ts                         # modules/** → Course[] + QuizSeed[]
    └── types.ts                            # QuizSeed 等

.claude/skills/diagram-design/             # ← ts-course/.claude/skills/diagram-design/
packages/shared/src/types.ts               # Language に "typescript" 追加 / ChapterId に Ch17,Ch18
packages/shared/src/curriculum/chapters.ts # Ch17 型システム / Ch18 ジェネリクス を追加
packages/shared/src/problems/10-types/     # 新規課題（M5 由来）
packages/shared/src/problems/11-generics/  # 新規課題（M6 由来）
packages/shared/scripts/export-seed-sql.ts # content の Course + Quiz を emit
packages/code-runner/src/quickjs-worker.ts # TypeScript トランスパイル段を追加
apps/web/src/components/learner/LessonPlayer.tsx  # LessonReadable を markdown 描画に置換
apps/api/scripts/seed-d1.ts                # 変更不要（export-seed-sql 経由で流れる）
```

---

## Phase 0 — 受け入れ先の準備

### Task 1: `@stella/content` workspace の骨格を作る

**Files:**
- Create: `packages/content/package.json`
- Create: `packages/content/tsconfig.json`
- Create: `packages/content/src/index.ts`
- Create: `packages/content/src/types.ts`
- Test: `packages/content/src/types.test.ts`

**Interfaces:**
- Produces: `QuizSeed`, `QuizQuestionSeed`, `QuizOptionSeed`（Task 8, 9 が消費）

- [ ] **Step 1: `packages/content/package.json` を作る**

```json
{
  "name": "@stella/content",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc --noEmit",
    "materials": "node scripts/build.mjs",
    "check": "node scripts/check_vocab.mjs"
  },
  "devDependencies": {
    "typescript": "^7.0.2"
  }
}
```

- [ ] **Step 2: `packages/content/tsconfig.json` を作る**

`packages/shared/tsconfig.json` と同じ形にそろえる。まず既存を読む。

```bash
cat packages/shared/tsconfig.json
```

読んだ内容の `include` を `["src/**/*.ts", "scripts/**/*.ts"]` に変えたものを `packages/content/tsconfig.json` として書く。

- [ ] **Step 3: `packages/content/src/types.ts` を書く**

```typescript
/**
 * 教材ファイル（practice.md の確認クイズ）から生成する quiz seed 型。
 * DB 行型 (`@stella/shared` の QuizRow / QuizQuestionRow / QuizOptionRow) へ
 * export-seed-sql.ts が変換する。
 */

export interface QuizOptionSeed {
  /** "A" / "B" / "C" の表示ラベルを除いた選択肢本文 */
  label: string;
  isCorrect: boolean;
}

export interface QuizQuestionSeed {
  /** 設問文（"Q1. " の接頭辞を除いたもの） */
  prompt: string;
  explanation: string;
  options: QuizOptionSeed[];
}

export interface QuizSeed {
  /** 紐づく lesson の安定キー（manifest が振る Lesson.id と一致させる） */
  lessonId: string;
  passScore: number;
  questions: QuizQuestionSeed[];
}
```

- [ ] **Step 4: `packages/content/src/index.ts` を書く**

```typescript
export type { QuizOptionSeed, QuizQuestionSeed, QuizSeed } from "./types.js";
```

- [ ] **Step 5: workspace が認識されることを確認**

```bash
bun install && bun run typecheck
```

Expected: `@stella/content` が workspace として解決され、typecheck が PASS

- [ ] **Step 6: コミット**

```bash
git add packages/content package.json bun.lock
git commit -m "feat(content): @stella/content workspace の骨格を追加"
```

### Task 2: 執筆ルールと diagram-design skill を移設する

**Files:**
- Create: `packages/content/CLAUDE.md`
- Create: `packages/content/STYLE_GUIDE.md`
- Create: `packages/content/CURRICULUM.md`
- Create: `packages/content/IMAGE_PLAN.md`
- Create: `packages/content/templates/*`（4ファイル）
- Create: `packages/content/design-system/*`
- Create: `.claude/skills/diagram-design/*`
- Modify: `AGENTS.md`

- [ ] **Step 1: ファイルをコピーする**

`<TS>` は ts-course のパス（例: `C:/work/ts-course`）。

```bash
cp -r "$TS/templates" packages/content/templates
cp -r "$TS/design-system" packages/content/design-system
cp "$TS/STYLE_GUIDE.md" "$TS/CURRICULUM.md" "$TS/IMAGE_PLAN.md" packages/content/
cp "$TS/CLAUDE.md" packages/content/CLAUDE.md
mkdir -p .claude/skills
cp -r "$TS/.claude/skills/diagram-design" .claude/skills/diagram-design
rm -rf .claude/skills/diagram-design/__pycache__
```

- [ ] **Step 2: `packages/content/CLAUDE.md` を falcon 向けに書き換える**

置換する箇所は次の4つだけ。それ以外（3層の粒度定義、語彙台帳、絶対に守るルール）は一字も変えない。

1. 冒頭「このリポジトリは何か」→「このディレクトリは何か」に変え、`falcon-informal` の LMS に配信される教材である旨を1文足す
2. 「ディレクトリ構成」のパスを `modules/<モジュールID>/…` から `packages/content/modules/<モジュールID>/…` に直す
3. 「コマンド」節を次に差し替える

````markdown
## コマンド

```bash
bun run --filter=@stella/content materials        # 全トピックを pptx 化
bun run --filter=@stella/content materials -- modules/m1-values/l1-variables   # 一部だけ
bun run --filter=@stella/content check            # 語彙台帳の検査だけ（CI と同じ）
```

Python 3 と `pip install python-pptx pygments playwright` / `playwright install chromium`、
`bun install` だけでは足りない。
````

4. 「現在の状態」の未着手課題に「LMS への seed 投入」「演習問題の Assignment 化」を追記する

- [ ] **Step 3: `.claude/skills/diagram-design/SKILL.md` のパス参照を直す**

```bash
grep -rn "modules/" .claude/skills/diagram-design/SKILL.md .claude/skills/diagram-design/references/*.md
```

出てきた `modules/...` を `packages/content/modules/...` に置換する。

- [ ] **Step 4: `AGENTS.md` にパッケージ表の行を足す**

`| `@stella/code-runner` | `packages/code-runner` | QuickJS WASM + sql.js in-browser runners |` の直後に追加。

```markdown
| `@stella/content` | `packages/content` | 研修教材の正本（スライド / ドキュメント / 演習）。執筆ルールは `packages/content/CLAUDE.md` |
```

- [ ] **Step 5: `.gitignore` に教材ビルド生成物を足す**

`# Cloudflare Workers / Pages` の直前に追加。

```gitignore
# 教材ビルド生成物（.svg は正本なのでコミットする）
packages/content/modules/**/slides.pptx
packages/content/modules/**/*.diagram.png
packages/content/dist/
packages/content/**/__pycache__/
```

- [ ] **Step 6: コミット**

```bash
git add packages/content .claude/skills AGENTS.md .gitignore
git commit -m "docs(content): 教材の執筆ルールと diagram-design skill を移設"
```

---

## Phase 1 — 教材本体の移設とビルド疎通

### Task 3: modules ツリーとビルドスクリプトを移設する

**Files:**
- Create: `packages/content/modules/**`（160トピック / 42レッスン）
- Create: `packages/content/scripts/build.mjs`
- Create: `packages/content/scripts/check_vocab.mjs`
- Create: `packages/content/scripts/build_pptx.py`
- Create: `packages/content/scripts/diagram_export.py`

- [ ] **Step 1: コピーする**

```bash
cp -r "$TS/modules" packages/content/modules
cp -r "$TS/scripts" packages/content/scripts
rm -rf packages/content/scripts/testdata packages/content/scripts/__pycache__
find packages/content/modules -name "slides.pptx" -delete
find packages/content/modules -name "*.diagram.png" -delete
```

`scripts/testdata` は `check_vocab.mjs` のテスト用なので Step 3 で戻す。

- [ ] **Step 2: 移設できた数を確認する**

```bash
echo "topics: $(find packages/content/modules -name slides.md | wc -l)"
echo "doc: $(find packages/content/modules -name doc.md | wc -l)"
echo "practice: $(find packages/content/modules -name practice.md | wc -l)"
echo "svg: $(find packages/content/modules -name '*.svg' | wc -l)"
```

Expected: `topics: 160` / `doc: 42` / `practice: 42` / `svg: 68`

- [ ] **Step 3: `scripts/testdata` を戻して check_vocab のテストを通す**

```bash
cp -r "$TS/scripts/testdata" packages/content/scripts/testdata
node packages/content/scripts/check_vocab.mjs packages/content/modules
```

Expected: 語彙台帳の検査が PASS（エラーゼロ）

- [ ] **Step 4: `build.mjs` の lint-skin.py パスを直す**

`build.mjs` の `ROOT` は `scripts/..`（= `packages/content`）に解決されるので `modules` / `scripts` / `dist` の参照はそのままでよい。ただし `lint-skin.py` だけは skill 側にあり、Task 2 で **リポジトリルート**の `.claude/skills/` へ置いたので参照が外れる。

該当行:

```javascript
const lint = spawnSync("python",
  [join(ROOT, ".claude", "skills", "diagram-design", "lint-skin.py"), ...searchRoots],
```

を次に変える。

```javascript
const SKILL_DIR = join(ROOT, "..", "..", ".claude", "skills", "diagram-design");
const lint = spawnSync("python",
  [join(SKILL_DIR, "lint-skin.py"), ...searchRoots],
```

- [ ] **Step 5: 教材ビルドを通す**

```bash
bun run --filter=@stella/content materials
```

Expected: 160トピック分の `slides.pptx` が生成される。Python 依存が無ければここで落ちるので、`pip install python-pptx pygments playwright && playwright install chromium` を先に済ませる。

- [ ] **Step 6: `packages/content/CLAUDE.md` の「現在の状態」に移設完了を記録し、コミット**

```bash
git add packages/content
git commit -m "feat(content): TypeScript 研修教材 160 トピックを移設"
```

### Task 4: 語彙台帳検査を CI ゲートに載せる

**Files:**
- Modify: `.github/workflows/ci.yml`
- Modify: `package.json`

- [ ] **Step 1: Node だけで走る検査に早期終了フラグを足し、ルートから呼べるようにする**

`build.mjs` は Python を起動する前に Node だけの検査を3つ通す（画像リンク `:74-80` → スライド枚数 `:84-95` → 語彙台帳 `:104-106`、Python は `:112` が最初）。ここで抜ければ CI に3検査とも載る。

`packages/content/scripts/build.mjs` の `if (vocab.status !== 0) process.exit(vocab.status ?? 1);` の直後に1行足す。

```js
if (process.argv.includes("--check-only")) process.exit(0);
```

`packages/content/package.json` の `scripts` に**追加**する（既存の `check` は置き換えない）。

```json
    "check:ci": "node scripts/build.mjs --check-only",
```

ルート `package.json` の `"test": "vitest run",` の直後に追加。

```json
    "content:check": "bun run --filter=@stella/content check:ci",
```

`check_vocab.mjs` は `ROOT = packages/content` を基準に引数を解決し、省略時は `join(ROOT, "modules")` を見る。ルート相対のパスを渡すと二重連結で落ちるので、引数は渡さない。

- [ ] **Step 2: 検査が落ちることを確認する（失敗の確認）**

わざと壊す。

```bash
sed -i 's/^requires: \[変数, 宣言, 代入\]/requires: [変数, 宣言, 代入, ジェネリクス]/' packages/content/modules/m1-values/l1-variables/t2-const-and-let/slides.md
bun run content:check
```

Expected: FAIL。「ジェネリクス が導入前に requires されている」旨のエラーで exit code 1

- [ ] **Step 3: 元に戻して PASS を確認する**

```bash
git checkout packages/content/modules/m1-values/l1-variables/t2-const-and-let/slides.md
bun run content:check
```

Expected: PASS

- [ ] **Step 4: `.github/workflows/ci.yml` と `deploy.yml` に step を足す**

両方の `- name: Test` の直前に挿入する。`deploy.yml:31` に `# --- 検証ゲート（ci.yml と同内容） ---` とあるので、片方だけに足すとこのコメントが嘘になる。`deploy.yml` は `push: main` トリガーなので、ci.yml を通らない経路を塞ぐ意味もある。

```yaml
      - name: Content check
        run: bun run content:check
```

Python / Playwright を要する `materials` は CI に載せない。CI が守るのは語彙台帳・画像リンク・スライド枚数の3つ。

- [ ] **Step 5: コミット**

```bash
git add .github/workflows/ci.yml .github/workflows/deploy.yml package.json packages/content/package.json packages/content/scripts/build.mjs
git commit -m "ci: 教材の整合性検査を PR ゲートに追加"
```

---

## Phase 2 — スライドを Web で配信できる形にする

LMS のスライドビューア（`apps/web/src/components/learner/SlidesViewer.tsx`）は react-pdf 実装で PDF しか読めない。しかし PDF を作るには LibreOffice 相当の外部エンジンが要り、`build_pptx.py`（626行）がスライドの見た目の唯一の正本である以上、HTML で作り直せば二重のレンダラを抱える。

そこで **`slides.md` そのものを LMS に渡し、React 側でスライド単位に描画する**。このフェーズはその入力を作る純粋なデータ処理で、React 側の描画は Task 10 で行う。

### Task 5: slides.md をスライド単位に分割する

**Files:**
- Create: `packages/content/src/split-slides.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/src/split-slides.test.ts`

**Interfaces:**
- Produces: `stripFrontMatter(source: string): string`、`splitSlides(source: string): Slide[]`、`Slide { body: string; note: string | null }`（Task 6 が `slideCount` の算出に、Task 8 が manifest の組み立てに使う）

`slides.md` の構造は次のとおり。front-matter があり、本文が `---` 区切りで 4〜6 枚に分かれ、各スライドの末尾に `<!-- ノート: ... -->` 形式の講師ノートが付く。ノートは収録台本なので、受講者向けの描画からは外す。

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { splitSlides, stripFrontMatter } from "./split-slides.js";

const SAMPLE = [
  "---",
  "id: 1-1-2",
  "title: constとletの違い",
  'takeaway: "constは再代入できない、letはできる"',
  "---",
  "",
  "<!-- _class: lead -->",
  "",
  "# 1-1-2",
  "# constとletの違い",
  "",
  "<!-- ノート: つかみ。ここで期待を持たせる。 -->",
  "",
  "---",
  "",
  "## なぜ必要か",
  "",
  "- 変わっていく値と、変わってほしくない値がある",
  "",
  "<!-- ノート: 税率の事故は現場で本当に起きる。 -->",
  "",
  "---",
  "",
  "## 結論",
  "",
  "**constは再代入できない、letはできる**",
  "",
].join("\n");

describe("stripFrontMatter", () => {
  it("front-matter を落とした本文を返す", () => {
    const body = stripFrontMatter(SAMPLE);
    expect(body).not.toContain("takeaway:");
    expect(body.trimStart().startsWith("<!-- _class: lead -->")).toBe(true);
  });

  it("CRLF でも落とせる", () => {
    expect(stripFrontMatter(SAMPLE.replace(/\n/g, "\r\n"))).not.toContain("takeaway:");
  });

  it("front-matter が無ければ投げる", () => {
    expect(() => stripFrontMatter("# no front matter")).toThrow(/front-matter/);
  });
});

describe("splitSlides", () => {
  it("--- 区切りでスライドに分ける", () => {
    expect(splitSlides(SAMPLE)).toHaveLength(3);
  });

  it("講師ノートを本文から外して note に入れる", () => {
    const slides = splitSlides(SAMPLE);
    expect(slides[0].note).toBe("つかみ。ここで期待を持たせる。");
    expect(slides[0].body).not.toContain("ノート:");
    expect(slides[1].note).toBe("税率の事故は現場で本当に起きる。");
  });

  it("ノートが無いスライドは note が null", () => {
    expect(splitSlides(SAMPLE)[2].note).toBeNull();
  });

  it("Marp 用のディレクティブコメントは本文から外す", () => {
    expect(splitSlides(SAMPLE)[0].body).not.toContain("_class");
  });

  it("本文は前後の空白を落として返す", () => {
    const slides = splitSlides(SAMPLE);
    expect(slides[0].body.startsWith("# 1-1-2")).toBe(true);
    expect(slides[2].body.endsWith("letはできる**")).toBe(true);
  });

  it("CRLF でも同じ結果になる", () => {
    const crlf = splitSlides(SAMPLE.replace(/\n/g, "\r\n"));
    expect(crlf).toHaveLength(3);
    expect(crlf[0].note).toBe("つかみ。ここで期待を持たせる。");
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test packages/content/src/split-slides.test.ts`
Expected: FAIL（`split-slides.js` が無い）

- [ ] **Step 3: 実装する**

```typescript
/**
 * slides.md をスライド単位に分割する。
 *
 * LMS はスライドを PDF ではなく Markdown として受け取り、React 側で 1 枚ずつ描画する。
 * 講師ノート（`<!-- ノート: ... -->`）は収録用の台本なので受講者向けの本文からは外し、
 * 別フィールドとして返す（将来スピーカーノート表示に使えるように捨てはしない）。
 */

export interface Slide {
  /** 講師ノートとディレクティブコメントを除いた本文 Markdown */
  body: string;
  /** 講師ノートの中身。無ければ null */
  note: string | null;
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const NOTE = /<!--\s*ノート:\s*([\s\S]*?)\s*-->/;
/** Marp 時代の名残のディレクティブコメント（`<!-- _class: lead -->` など） */
const DIRECTIVE = /<!--\s*_[\s\S]*?-->/g;

/** front-matter を落として本文だけを返す。 */
export function stripFrontMatter(source: string): string {
  const match = FRONT_MATTER.exec(source.replace(/\r\n/g, "\n"));
  if (!match) throw new Error("slides.md に front-matter がありません");
  return match[2];
}

export function splitSlides(source: string): Slide[] {
  return stripFrontMatter(source)
    .split(/\n---\n/)
    .map((chunk) => {
      const noteMatch = NOTE.exec(chunk);
      const body = chunk.replace(NOTE, "").replace(DIRECTIVE, "").trim();
      return { body, note: noteMatch ? noteMatch[1].trim() : null };
    });
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test packages/content/src/split-slides.test.ts`
Expected: PASS（9件）

- [ ] **Step 5: `packages/content/src/index.ts` に export を足す**

```typescript
export { splitSlides, stripFrontMatter } from "./split-slides.js";
export type { Slide } from "./split-slides.js";
```

- [ ] **Step 6: 実データ 160 件で検証する**

全トピックが 4〜6 枚に分かれること、本文が空のスライドが無いこと、ノートの取りこぼしが無いことを確かめる。

```bash
bun -e 'import{readFileSync,globSync}from"node:fs";import{splitSlides}from"./packages/content/src/split-slides.ts";let n=0,noted=0,empty=[];for(const p of globSync("packages/content/modules/**/slides.md")){const s=splitSlides(readFileSync(p,"utf8"));if(s.length<4||s.length>6)console.log("枚数外れ:",p,s.length);for(const x of s){n++;if(x.note)noted++;if(!x.body)empty.push(p);}}console.log("slides:",n,"noted:",noted,"empty:",empty.length);empty.slice(0,5).forEach(e=>console.log("  empty body:",e));'
```

Expected: 「枚数外れ」0 件、`empty: 0`、`noted` がスライド総数の大半（ノートは全スライドに付いている想定）

`empty` が 0 でなければ、そのファイルを開いて原因を確認し、**教材本文は変更せず**に分割ロジック側で対処すること（教材は移設元と blob 一致を保つ）。

- [ ] **Step 7: PDF をやめた決定をドキュメントに反映する**

Task 2 / 3 の時点では PDF を作る前提で書かれた記述が残っている。実態に合わせる。

1. `packages/content/CLAUDE.md` — 「コマンド」節の `# 全トピックを pptx + PDF 化` から `+ PDF` を削り、`pptx→PDF 変換用の LibreOffice が必要` の一文を削除する
2. `packages/content/CLAUDE.md` — `bun run --filter=@stella/content check` に付いた `# 語彙台帳の検査だけ（CI と同じ）` は実態と違う（CI は `check:ci` を呼び、語彙台帳・画像リンク・スライド枚数の3つを検査する）。`check:ci` を案内する形に直す
3. ルート `.gitignore` の `packages/content/modules/**/slides.pdf` を削除する（PDF は生成されない）
4. 次を実行してヒットが無いことを確認する

```bash
grep -rn -i "libreoffice\|soffice" packages/content/ .claude/skills/diagram-design/
```

- [ ] **Step 8: コミット**

```bash
git add packages/content/src packages/content/CLAUDE.md .gitignore
git commit -m "feat(content): slides.md をスライド単位に分割するパーサを追加"
```

**注意**: `.gitignore` には着手前からの別件の変更（`.worktrees` の追加）が未コミットで残っている。自分の変更行だけをステージすること。

---

## Phase 3 — 教材ツリー → LMS コース定義

### Task 6: slides.md front-matter パーサ

**Files:**
- Create: `packages/content/src/parse-slides.ts`
- Test: `packages/content/src/parse-slides.test.ts`

**Interfaces:**
- Consumes: `splitSlides`（Task 5）
- Produces: `parseSlides(source: string): SlidesFrontMatter`、`SlidesFrontMatter { id, title, takeaway, introduces, requires, slideCount }`（Task 8 が消費）

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { parseSlides } from "./parse-slides.js";

describe("parseSlides", () => {
  it("front-matter を取り出す", () => {
    const src = [
      "---",
      "id: 1-1-2",
      "title: constとletの違い",
      'takeaway: "constは再代入できない、letはできる"',
      "introduces: [const, let, 再代入]",
      "requires: [変数, 宣言, 代入]",
      'header: "TypeScript入門"',
      "---",
      "",
      "# 1-1-2",
    ].join("\n");

    expect(parseSlides(src)).toEqual({
      id: "1-1-2",
      title: "constとletの違い",
      takeaway: "constは再代入できない、letはできる",
      introduces: ["const", "let", "再代入"],
      requires: ["変数", "宣言", "代入"],
    });
  });

  it("スライド区切りを数える", () => {
    const src = "---\nid: 1-1-1\ntitle: t\ntakeaway: \"x\"\nintroduces: []\nrequires: []\n---\n\nA\n\n---\n\nB\n\n---\n\nC\n";
    expect(parseSlides(src).slideCount).toBe(3);
  });

  it("CRLF でも枚数を正しく数える", () => {
    const src = "---\nid: 1-1-1\ntitle: t\ntakeaway: \"x\"\nintroduces: []\nrequires: []\n---\n\nA\n\n---\n\nB\n\n---\n\nC\n";
    expect(parseSlides(src.replace(/\n/g, "\r\n")).slideCount).toBe(3);
  });

  it("front-matter が無ければ投げる", () => {
    expect(() => parseSlides("# no front matter")).toThrow(/front-matter/);
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test packages/content/src/parse-slides.test.ts`
Expected: FAIL（`parse-slides.js` が無い）

- [ ] **Step 3: 実装する**

```typescript
/**
 * slides.md の front-matter（語彙台帳）を読む。
 * YAML パーサは入れない。台帳のスキーマは check_vocab.mjs が守っており、
 * 使うのはスカラーと文字列配列だけなので行単位で足りる。
 */

import { splitSlides } from "./split-slides.js";

export interface SlidesFrontMatter {
  id: string;
  title: string;
  takeaway: string;
  introduces: string[];
  requires: string[];
  /** `---` 区切りで数えたスライド枚数 */
  slideCount: number;
}

function unquote(value: string): string {
  const t = value.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseList(value: string): string[] {
  const t = value.trim();
  if (!t.startsWith("[") || !t.endsWith("]")) return [];
  const inner = t.slice(1, -1).trim();
  if (inner === "") return [];
  return inner.split(",").map((s) => unquote(s));
}

export function parseSlides(source: string): SlidesFrontMatter {
  const normalized = source.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(normalized);
  if (!match) throw new Error("slides.md に front-matter がありません");

  const head = match[1];
  const fields = new Map<string, string>();
  for (const line of head.split("\n")) {
    const kv = /^([a-zA-Z_]+):\s*(.*)$/.exec(line);
    if (kv) fields.set(kv[1], kv[2]);
  }

  const required = ["id", "title", "takeaway"];
  for (const key of required) {
    if (!fields.has(key)) throw new Error(`front-matter に ${key} がありません`);
  }

  return {
    id: unquote(fields.get("id") ?? ""),
    title: unquote(fields.get("title") ?? ""),
    takeaway: unquote(fields.get("takeaway") ?? ""),
    introduces: parseList(fields.get("introduces") ?? "[]"),
    requires: parseList(fields.get("requires") ?? "[]"),
    // 分割ロジックは split-slides.ts が正本。ここで数え方を二重に持たない。
    slideCount: splitSlides(source).length,
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test packages/content/src/parse-slides.test.ts`
Expected: PASS（3件）

- [ ] **Step 5: 実データ 160 件で落ちないことを確認**

```bash
bun -e 'import{readFileSync}from"node:fs";import{globSync}from"node:fs";import{parseSlides}from"./packages/content/src/parse-slides.ts";const f=globSync("packages/content/modules/**/slides.md");console.log(f.length);for(const p of f){const fm=parseSlides(readFileSync(p,"utf8"));if(fm.slideCount<4||fm.slideCount>6)console.log("枚数外れ:",p,fm.slideCount);}'
```

Expected: `160` が出力され、枚数外れが 0 件

- [ ] **Step 6: コミット**

```bash
git add packages/content/src/parse-slides.ts packages/content/src/parse-slides.test.ts
git commit -m "feat(content): slides.md front-matter パーサを追加"
```

### Task 7: practice.md 確認クイズパーサ

42レッスン全部が同じ書式（`### Q1. 設問` / `- A. 選択肢` / `<details><summary>答え</summary>**B** — 解説</details>`）で書かれている。単一選択のみ。

**Files:**
- Create: `packages/content/src/parse-quiz.ts`
- Test: `packages/content/src/parse-quiz.test.ts`

**Interfaces:**
- Consumes: `QuizQuestionSeed`, `QuizOptionSeed`（Task 1）
- Produces: `parseQuiz(source: string): QuizQuestionSeed[]`（Task 8 が消費）

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { parseQuiz } from "./parse-quiz.js";

const SAMPLE = `# レッスン1-1 演習 — 変数

## 演習問題

### 問1(基本)

なにか

## 確認クイズ

### Q1. 再代入が必要な変数を宣言するキーワードはどれですか?

- A. \`const\`
- B. \`let\`
- C. どちらでもよい

<details>
<summary>答え</summary>

**B** — \`let\`は再代入できます。

</details>

### Q2. つぎの設問

- A. あ
- B. い

<details>
<summary>答え</summary>

**A** — あが正しい。

</details>
`;

describe("parseQuiz", () => {
  it("確認クイズ節の設問だけを取り出す", () => {
    const qs = parseQuiz(SAMPLE);
    expect(qs).toHaveLength(2);
    expect(qs[0].prompt).toBe("再代入が必要な変数を宣言するキーワードはどれですか?");
    expect(qs[0].explanation).toBe("`let`は再代入できます。");
    expect(qs[0].options).toEqual([
      { label: "`const`", isCorrect: false },
      { label: "`let`", isCorrect: true },
      { label: "どちらでもよい", isCorrect: false },
    ]);
    expect(qs[1].options[0]).toEqual({ label: "あ", isCorrect: true });
  });

  it("演習問題の見出しを拾わない", () => {
    expect(parseQuiz(SAMPLE).some((q) => q.prompt.includes("なにか"))).toBe(false);
  });

  it("正解ラベルが選択肢に無ければ投げる", () => {
    const broken = SAMPLE.replace("**B** — `let`は再代入できます。", "**Z** — こわれている");
    expect(() => parseQuiz(broken)).toThrow(/正解ラベル/);
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test packages/content/src/parse-quiz.test.ts`
Expected: FAIL（`parse-quiz.js` が無い）

- [ ] **Step 3: 実装する**

```typescript
/**
 * practice.md の「## 確認クイズ」節を QuizQuestionSeed[] に変換する。
 *
 * 全 42 レッスンが同一書式で書かれている前提。書式から外れた入力は
 * 黙って捨てず throw する（seed に穴が空くより、ビルドで気づきたい）。
 */

import type { QuizOptionSeed, QuizQuestionSeed } from "./types.js";

const QUIZ_HEADING = "## 確認クイズ";

export function parseQuiz(source: string): QuizQuestionSeed[] {
  const normalized = source.replace(/\r\n/g, "\n");
  const start = normalized.indexOf(QUIZ_HEADING);
  if (start === -1) return [];

  const after = normalized.slice(start + QUIZ_HEADING.length);
  const nextH2 = after.search(/\n## /);
  const section = nextH2 === -1 ? after : after.slice(0, nextH2);

  const blocks = section.split(/\n### /).slice(1);
  return blocks.map((block) => parseBlock("### " + block));
}

function parseBlock(block: string): QuizQuestionSeed {
  const promptMatch = /^###\s*Q\d+\.\s*(.+)$/m.exec(block);
  if (!promptMatch) throw new Error(`設問見出しが読めません: ${block.slice(0, 40)}`);

  const options: QuizOptionSeed[] = [];
  const labels: string[] = [];
  for (const m of block.matchAll(/^-\s+([A-Z])\.\s+(.+)$/gm)) {
    labels.push(m[1]);
    options.push({ label: m[2].trim(), isCorrect: false });
  }
  if (options.length < 2) throw new Error(`選択肢が足りません: ${promptMatch[1]}`);

  const answerMatch = /\*\*([A-Z])\*\*\s*—\s*([\s\S]*?)\n\n<\/details>/.exec(block);
  if (!answerMatch) throw new Error(`解答ブロックが読めません: ${promptMatch[1]}`);

  const index = labels.indexOf(answerMatch[1]);
  if (index === -1) {
    throw new Error(`正解ラベル ${answerMatch[1]} が選択肢にありません: ${promptMatch[1]}`);
  }
  options[index].isCorrect = true;

  return {
    prompt: promptMatch[1].trim(),
    explanation: answerMatch[2].trim(),
    options,
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test packages/content/src/parse-quiz.test.ts`
Expected: PASS（3件）

- [ ] **Step 5: 実データ 42 件で全問取れることを確認**

```bash
bun -e 'import{readFileSync,globSync}from"node:fs";import{parseQuiz}from"./packages/content/src/parse-quiz.ts";let n=0;for(const p of globSync("packages/content/modules/**/practice.md")){const q=parseQuiz(readFileSync(p,"utf8"));if(q.length===0)console.log("クイズ無し:",p);n+=q.length;}console.log("total questions:",n);'
```

Expected: 「クイズ無し」が 0 件、`total questions:` が 168 前後

- [ ] **Step 6: コミット**

```bash
git add packages/content/src/parse-quiz.ts packages/content/src/parse-quiz.test.ts
git commit -m "feat(content): practice.md 確認クイズのパーサを追加"
```

### Task 8: modules ツリー → Course / QuizSeed の manifest

ts-course の3層（モジュール / レッスン / トピック）を LMS の3層（Course / Section / Lesson）へ落とす。**モジュール = Section、トピック = Lesson**とし、コースは `typescript-basics` 1本にまとめる。`doc.md` と `practice.md` はレッスン層に付いているので、対応する Section 内に `text` / `quiz` の Lesson として並べる。

**Files:**
- Create: `packages/content/src/manifest.ts`
- Modify: `packages/content/src/index.ts`
- Test: `packages/content/src/manifest.test.ts`

**Interfaces:**
- Consumes: `splitSlides`（Task 5）、`parseSlides`（Task 6）、`parseQuiz`（Task 7）、`QuizSeed`（Task 1）
- Produces: `buildContentManifest(root?: string): { courses: Course[]; quizzes: QuizSeed[] }`、`assetPath(topicDir, fileName)`（Task 9, 11 が消費）

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { buildContentManifest } from "./manifest.js";

describe("buildContentManifest", () => {
  const { courses, quizzes } = buildContentManifest();

  it("コースは typescript-basics 1本", () => {
    expect(courses).toHaveLength(1);
    expect(courses[0].id).toBe("typescript-basics");
    expect(courses[0].category).toBe("プログラミング");
  });

  it("Section はモジュール 10 個", () => {
    expect(courses[0].sections).toHaveLength(10);
    expect(courses[0].sections?.[0].id).toBe("m0-orientation");
  });

  it("トピックが slides レッスンになり、本文と枚数を持つ", () => {
    const m1 = courses[0].sections?.find((s) => s.id === "m1-values");
    const lesson = m1?.lessons.find((l) => l.id === "1-1-2");
    expect(lesson?.type).toBe("slides");
    expect(lesson?.title).toBe("constとletの違い");
    expect(lesson?.pdfPath).toBeUndefined();
    expect(lesson?.markdown).toContain("constは再代入できない");
    expect(lesson?.totalPages).toBeGreaterThanOrEqual(4);
    expect(lesson?.totalPages).toBeLessThanOrEqual(6);
  });

  it("スライド本文から講師ノートが除かれている", () => {
    const m1 = courses[0].sections?.find((s) => s.id === "m1-values");
    const lesson = m1?.lessons.find((l) => l.id === "1-1-2");
    expect(lesson?.markdown).not.toContain("ノート:");
  });

  it("スライド本文の画像も R2 の絶対パスに書き換わる", () => {
    const slides = courses[0].sections?.flatMap((s) => s.lessons).filter((l) => l.type === "slides");
    for (const l of slides ?? []) {
      expect(l.markdown ?? "").not.toMatch(/!\[[^\]]*\]\(assets\//);
    }
  });

  it("レッスンごとに doc(text) と quiz が 1 つずつ付く", () => {
    const m1 = courses[0].sections?.find((s) => s.id === "m1-values");
    expect(m1?.lessons.filter((l) => l.type === "text").map((l) => l.id)).toContain("doc-1-1");
    expect(m1?.lessons.filter((l) => l.type === "quiz").map((l) => l.id)).toContain("quiz-1-1");
  });

  it("doc の markdown は画像を R2 の絶対 URL に書き換える", () => {
    const m1 = courses[0].sections?.find((s) => s.id === "m1-values");
    const doc = m1?.lessons.find((l) => l.id === "doc-1-1");
    expect(doc?.markdown).toContain(
      "tenant/ses/courses/typescript-basics/assets/t1-what-is-a-variable/variable-box.svg",
    );
    expect(doc?.markdown).not.toMatch(/\]\(t\d-/);
  });

  it("quiz レッスンごとに QuizSeed がある", () => {
    const quizLessonIds = courses[0].sections
      ?.flatMap((s) => s.lessons)
      .filter((l) => l.type === "quiz")
      .map((l) => l.id);
    expect(quizzes.map((q) => q.lessonId).sort()).toEqual(quizLessonIds?.sort());
  });

  it("全 160 トピックが載る", () => {
    const slides = courses[0].sections?.flatMap((s) => s.lessons).filter((l) => l.type === "slides");
    expect(slides).toHaveLength(160);
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test packages/content/src/manifest.test.ts`
Expected: FAIL（`manifest.js` が無い）

- [ ] **Step 3: 実装する**

```typescript
/**
 * packages/content/modules/** を走査して、LMS の Course / Section / Lesson と
 * quiz seed を組み立てる。ファイルが正本で、D1 はここから毎回作り直される。
 *
 * 対応:
 *   モジュール (m0..m9)          → Section
 *   トピック   (t1..)            → Lesson (type: "slides")
 *   レッスンの doc.md            → Lesson (type: "text")
 *   レッスンの practice.md 確認クイズ → Lesson (type: "quiz") + QuizSeed
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Course, Lesson, Section } from "../../../apps/web/src/data/types.js";
import { parseQuiz } from "./parse-quiz.js";
import { parseSlides } from "./parse-slides.js";
import { splitSlides } from "./split-slides.js";
import type { QuizSeed } from "./types.js";

export const TENANT_ID = "ses";
export const COURSE_SLUG = "typescript-basics";

const MATERIAL_PREFIX = `tenant/${TENANT_ID}/courses/${COURSE_SLUG}`;

export function assetPath(topicDir: string, fileName: string): string {
  return `${MATERIAL_PREFIX}/assets/${topicDir}/${fileName}`;
}

const MODULE_TITLES: Record<string, string> = {
  "m0-orientation": "M0. オリエンテーション",
  "m1-values": "M1. 値と変数",
  "m2-conditionals": "M2. 条件分岐とスコープ",
  "m3-data": "M3. 配列とオブジェクト",
  "m4-functions": "M4. 関数",
  "m5-type-system": "M5. 型システム",
  "m6-generics": "M6. ジェネリクス",
  "m7-oop": "M7. クラスとインターフェース",
  "m8-async": "M8. 非同期処理",
  "m9-practice": "M9. 実務への接続",
};

function dirsIn(path: string): string[] {
  return readdirSync(path)
    .filter((e) => statSync(join(path, e)).isDirectory())
    .sort();
}

function defaultRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "modules");
}

/**
 * 相対画像パスを R2 の公開パスへ書き換える。
 *
 * doc.md はレッスンディレクトリから見た `t1-.../assets/x.svg` 形式、
 * slides.md はトピックディレクトリから見た `assets/x.svg` 形式で書かれている。
 * 前者は自分でトピックを名乗るので `topicDir` を渡さず、後者は呼び出し側が渡す。
 */
function rewriteImagePaths(markdown: string, topicDir?: string): string {
  return markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt: string, src: string) => {
    if (/^https?:/.test(src)) return whole;
    const withTopic = /^(t[^/]+)\/assets\/(.+)$/.exec(src);
    if (withTopic) return `![${alt}](${assetPath(withTopic[1], withTopic[2])})`;
    const bare = /^(?:\.\/)?assets\/(.+)$/.exec(src);
    if (bare && topicDir) return `![${alt}](${assetPath(topicDir, bare[1])})`;
    return whole;
  });
}

/** レッスンディレクトリ ID (`l1-variables`) と id (`1-1`) から doc/quiz の安定キーを作る。 */
function lessonKey(topicIds: string[]): string {
  // トピック id は "1-1-2" 形式。先頭 2 節がレッスンを表す。
  const first = topicIds[0] ?? "";
  return first.split("-").slice(0, 2).join("-");
}

export function buildContentManifest(root: string = defaultRoot()): {
  courses: Course[];
  quizzes: QuizSeed[];
} {
  const sections: Section[] = [];
  const quizzes: QuizSeed[] = [];

  for (const moduleDir of dirsIn(root)) {
    const modulePath = join(root, moduleDir);
    const lessons: Lesson[] = [];

    for (const lessonDir of dirsIn(modulePath)) {
      const lessonPath = join(modulePath, lessonDir);
      const topicDirs = dirsIn(lessonPath);
      const topicIds: string[] = [];

      for (const topicDir of topicDirs) {
        const slidesFile = join(lessonPath, topicDir, "slides.md");
        let source: string;
        try {
          source = readFileSync(slidesFile, "utf8");
        } catch {
          continue; // assets/ など slides.md を持たないディレクトリ
        }
        const fm = parseSlides(source);
        topicIds.push(fm.id);
        // 受講者に渡すのは講師ノートを外した本文だけ。区切りは `---` のまま残し、
        // 何枚に分けるかは描画側 (Task 10) が splitSlides で決める。
        const body = splitSlides(source)
          .map((s) => rewriteImagePaths(s.body, topicDir))
          .join("\n\n---\n\n");
        lessons.push({
          id: fm.id,
          title: fm.title,
          type: "slides",
          duration: "3分",
          status: "todo",
          markdown: body,
          totalPages: fm.slideCount,
        });
      }

      const key = lessonKey(topicIds);

      const docFile = join(lessonPath, "doc.md");
      lessons.push({
        id: `doc-${key}`,
        title: `${key} ドキュメント`,
        type: "text",
        duration: "10分",
        status: "todo",
        markdown: rewriteImagePaths(readFileSync(docFile, "utf8")),
      });

      const practiceFile = join(lessonPath, "practice.md");
      const questions = parseQuiz(readFileSync(practiceFile, "utf8"));
      if (questions.length > 0) {
        const quizLessonId = `quiz-${key}`;
        lessons.push({
          id: quizLessonId,
          title: `${key} 確認クイズ`,
          type: "quiz",
          duration: "5分",
          status: "todo",
        });
        quizzes.push({ lessonId: quizLessonId, passScore: 80, questions });
      }
    }

    sections.push({
      id: moduleDir,
      title: MODULE_TITLES[moduleDir] ?? moduleDir,
      lessons,
    });
  }

  const lessonsCount = sections.reduce((n, s) => n + s.lessons.length, 0);

  return {
    courses: [
      {
        id: COURSE_SLUG,
        title: "TypeScript 入門",
        category: "プログラミング",
        color: "indigo",
        lessonsCount,
        progress: 0,
        description:
          "未経験からの TypeScript 研修。ショート動画 1 本で 1 つだけ覚える粒度で、値・型・関数・非同期まで通す。",
        sections,
      },
    ],
    quizzes,
  };
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `bun run test packages/content/src/manifest.test.ts`
Expected: PASS（7件）

- [ ] **Step 5: `packages/content/src/index.ts` に export を足す**

```typescript
export { buildContentManifest, COURSE_SLUG, TENANT_ID, assetPath } from "./manifest.js";
export { parseQuiz } from "./parse-quiz.js";
export { parseSlides } from "./parse-slides.js";
export type { SlidesFrontMatter } from "./parse-slides.js";
export type { QuizOptionSeed, QuizQuestionSeed, QuizSeed } from "./types.js";
```

- [ ] **Step 6: コミット**

```bash
git add packages/content/src
git commit -m "feat(content): 教材ツリーから LMS コース定義を組み立てる manifest を追加"
```

---

## Phase 4 — D1 への投入

### Task 9: seed に教材コースと quiz を流す

既存の `export-seed-sql.ts` は fixtures の Course を courses / sections / lessons に upsert している。ここに教材コースを足し、未対応だった quiz 3 テーブルの emit を新設する。

**Files:**
- Modify: `packages/shared/scripts/export-seed-sql.ts`
- Modify: `packages/shared/package.json`
- Test: `packages/shared/scripts/export-seed-sql.test.ts`

**Interfaces:**
- Consumes: `buildContentManifest`（Task 8）

- [ ] **Step 1: `@stella/content` を shared の依存に足す**

`packages/shared/package.json` の `dependencies`（無ければ新設）に追加。

```json
    "@stella/content": "workspace:*"
```

```bash
bun install
```

- [ ] **Step 2: 失敗するテストを書く**

```typescript
import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("export-seed-sql (sqlite)", () => {
  const sql = execSync("bun run packages/shared/scripts/export-seed-sql.ts", {
    cwd: new URL("../../..", import.meta.url).pathname,
    encoding: "utf8",
    env: { ...process.env, DIALECT: "sqlite" },
  });

  it("教材コースを upsert する", () => {
    expect(sql).toContain("'typescript-basics'");
  });

  it("スライドレッスンに本文 markdown が入る", () => {
    expect(sql).toMatch(/insert into lessons [^;]*'slides'[^;]*constは再代入できない/);
  });

  it("図解画像は R2 の絶対パスで入る", () => {
    expect(sql).toContain("tenant/ses/courses/typescript-basics/assets/");
  });

  it("quiz / quiz_questions / quiz_options を emit する", () => {
    expect(sql).toMatch(/insert into quizzes /);
    expect(sql).toMatch(/insert into quiz_questions /);
    expect(sql).toMatch(/insert into quiz_options /);
  });

  it("設問は単一選択で正解が 1 つ", () => {
    const correct = sql.match(/insert into quiz_options [^;]*, 1, \d+\);/g) ?? [];
    const questions = sql.match(/insert into quiz_questions /g) ?? [];
    expect(correct.length).toBe(questions.length);
  });
});
```

- [ ] **Step 3: テストが落ちることを確認**

Run: `bun run test packages/shared/scripts/export-seed-sql.test.ts`
Expected: FAIL（`typescript-basics` が SQL に含まれない）

- [ ] **Step 4: import と course 列挙に教材コースを足す**

`export-seed-sql.ts` の import 群に追加。

```typescript
import { buildContentManifest } from "@stella/content";
```

fixtures のコースを回しているループの直前に、教材の manifest を取り出す。

```typescript
const content = buildContentManifest();
```

`SES_COURSES` を回している箇所で、対象配列を `[...SES_COURSES, ...content.courses]` に変える。

- [ ] **Step 5: quiz emit を実装する**

`emitAssignment` 関数の直後に追加する。

```typescript
/**
 * quiz / quiz_questions / quiz_options を emit する。
 * lesson と同じく stableUuid で ID を決めるので、seed を何度流しても同じ行になる。
 * 設問・選択肢は差分マージせず delete → insert（教材ファイルが唯一の正本）。
 */
function emitQuiz(
  tenantId: Tenant["id"],
  courseId: string,
  sectionId: string,
  quiz: { lessonId: string; passScore: number; questions: QuizQuestionSeed[] },
) {
  const lessonUuid = stableUuid(`lesson:${tenantId}:${courseId}:${sectionId}:${quiz.lessonId}`);
  const quizUuid = stableUuid(`quiz:${tenantId}:${quiz.lessonId}`);

  lines.push(
    `insert into ${tbl("quizzes")} (id, lesson_id, pass_score, time_limit_sec, shuffle_questions, shuffle_options, max_attempts${isSqlite ? ", created_at, updated_at" : ""}) values ('${quizUuid}', '${lessonUuid}', ${quiz.passScore}, null, ${isSqlite ? "0" : "false"}, ${isSqlite ? "0" : "false"}, null${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""}) on conflict (id) do update set pass_score = excluded.pass_score, updated_at = ${nowExpr()};`,
    `delete from ${tbl("quiz_questions")} where quiz_id = '${quizUuid}';`,
  );

  for (let i = 0; i < quiz.questions.length; i++) {
    const q = quiz.questions[i];
    const qUuid = stableUuid(`quiz-q:${tenantId}:${quiz.lessonId}:${i}`);
    lines.push(
      `insert into ${tbl("quiz_questions")} (id, quiz_id, kind, prompt, explanation, points, "order"${isSqlite ? ", created_at, updated_at" : ""}) values ('${qUuid}', '${quizUuid}', 'single', ${strLit(q.prompt)}, ${strLit(q.explanation)}, 1, ${i}${isSqlite ? `, ${nowExpr()}, ${nowExpr()}` : ""});`,
    );
    for (let j = 0; j < q.options.length; j++) {
      const o = q.options[j];
      const oUuid = stableUuid(`quiz-o:${tenantId}:${quiz.lessonId}:${i}:${j}`);
      lines.push(
        `insert into ${tbl("quiz_options")} (id, question_id, label, is_correct, "order") values ('${oUuid}', '${qUuid}', ${strLit(o.label)}, ${o.isCorrect ? (isSqlite ? "1" : "true") : isSqlite ? "0" : "false"}, ${j});`,
      );
    }
  }
}
```

`tbl()` ヘルパが未定義なら、既存の `isSqlite ? "" : "public."` パターンを包む形で先に定義する。

- [ ] **Step 6: quiz レッスンの emit 時に emitQuiz を呼ぶ**

`emitLesson` を呼んでいるループ内で、教材コースの quiz レッスンに対応する `QuizSeed` があれば呼ぶ。

```typescript
const seed = content.quizzes.find((q) => q.lessonId === lesson.id);
if (seed) emitQuiz(tenantId, course.id, section.id, seed);
```

- [ ] **Step 7: テストが通ることを確認**

Run: `bun run test packages/shared/scripts/export-seed-sql.test.ts`
Expected: PASS（4件）

- [ ] **Step 8: 実際に D1 へ流す**

```bash
bun run db:migrate && bun run db:seed && bun run smoke:d1
```

Expected: seed が完走し、smoke が PASS

- [ ] **Step 9: 行数を確認する**

```bash
bunx wrangler d1 execute falcon-db --local --command "select count(*) from lessons"
bunx wrangler d1 execute falcon-db --local --command "select count(*) from quiz_questions"
```

Expected: lessons が既存分 + 244（160 slides + 42 text + 42 quiz）、quiz_questions が 168 前後

- [ ] **Step 10: コミット**

```bash
git add packages/shared packages/content bun.lock
git commit -m "feat(shared): 教材コースと確認クイズを D1 seed に流す"
```

---

## Phase 5 — 受講者 UI

### Task 10: text レッスンと slides レッスンを描画する

2つを同時に直す。どちらも `lesson.markdown` を読む描画で、同じ import とヘルパを使うため分けると二度手間になる。

1. `apps/web/src/components/learner/LessonPlayer.tsx:552` の `LessonReadable` はクロージャの説明がハードコードされたダミーで、`lesson.markdown` を一切読んでいない
2. `slides` レッスンは `LessonOverview`（`pdfPath` 前提）に流れているが、Task 8 以降 `pdfPath` は入らず `markdown` にスライド本文が入る。`---` 区切りでページ送りする描画に差し替える

**Files:**
- Modify: `apps/web/src/components/learner/LessonPlayer.tsx:444-450,552-600`
- Create: `apps/web/src/components/learner/MarkdownSlides.tsx`

- [ ] **Step 1: いまのダミーを確認する**

```bash
grep -n "LessonReadable" apps/web/src/components/learner/LessonPlayer.tsx
```

`552` 付近の実装本体（`レッスンの目的` / `makeCounter` を含むブロック）が丸ごと差し替え対象。

- [ ] **Step 2: import を足す**

ファイル冒頭の import 群に追加。`AIChatBot.tsx` と同じ組み合わせを使う。

```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getMaterialUrl } from '@/lib/storage';
```

- [ ] **Step 3: `LessonReadable` を差し替える**

`552` から始まる `const LessonReadable = ...` の定義全体を次に置き換える。

```typescript
/**
 * `type: "text"` のレッスン本文。教材の doc.md をそのまま描画する。
 * 画像パスは R2 のバケット内パスで入っているので、表示時に公開 URL へ解決する。
 */
const LessonReadable = ({
  markdown,
  onComplete,
}: {
  markdown?: string;
  onComplete: () => void;
}) => {
  if (!markdown) {
    return (
      <div className="prose-lms">
        <p className="text-ink-3">このレッスンには本文が登録されていません。</p>
      </div>
    );
  }

  return (
    <div className="prose-lms">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ src, alt }) => {
            const resolved =
              typeof src === 'string' && !/^https?:/.test(src) ? getMaterialUrl(src) : src;
            return <img src={resolved} alt={alt ?? ''} loading="lazy" />;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
      <Button onClick={onComplete} className="mt-6">
        読了にする
      </Button>
    </div>
  );
};
```

- [ ] **Step 4: 呼び出し 2 箇所に markdown を渡す**

`444` と `449` の `<LessonReadable onComplete={handleMarkComplete} />` を両方とも次に変える。

```tsx
<LessonReadable markdown={lessonObj.markdown} onComplete={handleMarkComplete} />
```

- [ ] **Step 5: スライド描画コンポーネントを作る**

`apps/web/src/components/learner/MarkdownSlides.tsx` を新規作成する。既存の `SlidesViewer`（react-pdf）は動画レッスンの PDF 教材が残る間そのままにして、置き換えではなく別コンポーネントとして足す。

```tsx
/**
 * `type: "slides"` のレッスン。教材の slides.md 本文を `---` 区切りで 1 枚ずつ表示する。
 *
 * PDF は作らない方針のため react-pdf は使わない。テキストが選択でき、画面幅に追従し、
 * 図解 SVG がそのまま拡大縮小できるので、LMS で読む用途では PDF より扱いやすい。
 */

import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChevronLeft, ChevronRight, Check } from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getMaterialUrl } from '@/lib/storage';
import { useLessonProgress } from '@/hooks/useLessonProgress';

interface Props {
  lessonId: string;
  markdown: string;
  onComplete?: () => void;
}

const COMPLETION_THRESHOLD = 0.9;

export function MarkdownSlides({ lessonId, markdown, onComplete }: Props) {
  const slides = useMemo(
    () => markdown.split(/\n---\n/).map((s) => s.trim()).filter(Boolean),
    [markdown],
  );
  const { entry, recordPage, markComplete } = useLessonProgress(lessonId);
  const [page, setPage] = useState(entry?.lastPage ?? 1);

  const total = slides.length;
  const go = (next: number) => {
    const clamped = Math.min(Math.max(next, 1), total);
    setPage(clamped);
    recordPage(clamped);
    if (clamped / total >= COMPLETION_THRESHOLD) {
      markComplete();
      onComplete?.();
    }
  };

  return (
    <div>
      <div className="prose-lms border border-border rounded-md p-6 min-h-[52vh] bg-card">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ src, alt }) => {
              const resolved =
                typeof src === 'string' && !/^https?:/.test(src) ? getMaterialUrl(src) : src;
              return <img src={resolved} alt={alt ?? ''} loading="lazy" />;
            },
          }}
        >
          {slides[page - 1] ?? ''}
        </ReactMarkdown>
      </div>
      <div className="flex items-center gap-3 mt-4">
        <Button variant="outline" onClick={() => go(page - 1)} disabled={page <= 1}>
          <ChevronLeft size={16} aria-hidden="true" />
          前へ
        </Button>
        <span className="text-[13px] text-ink-3 tabular-nums">
          {page} / {total}
        </span>
        <Button variant="outline" onClick={() => go(page + 1)} disabled={page >= total}>
          次へ
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
        <Progress value={(page / total) * 100} className="flex-1" />
        {page >= total ? (
          <Button onClick={() => { markComplete(); onComplete?.(); }}>
            <Check size={16} aria-hidden="true" />
            完了にする
          </Button>
        ) : null}
      </div>
    </div>
  );
}
```

`useLessonProgress` の `recordPage` / `markComplete` と `Progress` / `Button` の props は、既存の `SlidesViewer.tsx` の使い方に合わせること。**実装前に `SlidesViewer.tsx` を読み、シグネチャが違えばそちらに合わせる。**

- [ ] **Step 6: slides レッスンを新しい描画に繋ぐ**

`446` の `) : isVideo || isSlides ? (` の分岐を分ける。

```tsx
              ) : isSlides && lessonObj.markdown ? (
                <MarkdownSlides
                  lessonId={lessonObj.id}
                  markdown={lessonObj.markdown}
                  onComplete={handleMarkComplete}
                />
              ) : isVideo || isSlides ? (
                <LessonOverview lesson={lessonObj} onComplete={handleMarkComplete} />
```

`markdown` を持たない slides レッスン（旧データ）は従来どおり `LessonOverview` に落ちる。import も足す。

```tsx
import { MarkdownSlides } from './MarkdownSlides';
```

- [ ] **Step 7: 型検査と lint を通す**

```bash
bun run typecheck && bun run lint
```

Expected: どちらも PASS

- [ ] **Step 8: 実データで目視確認する**

```bash
bun run dev:api
```

別ターミナルで `bun run dev` を起動し、`TypeScript 入門` → `M1. 値と変数` を開いて次を確認する。

1. `1-1 ドキュメント`（text）— 見出し・コードブロック・`<details>` が崩れず出る
2. `1-1-2 constとletの違い`（slides）— 4〜6 枚がページ送りでき、`1 / 5` のような枚数表示と進捗バーが動く。**講師ノートが表示されていないこと**を確認する
3. 画像は Task 11 の前なので 404 になる（これは想定内）

- [ ] **Step 9: コミット**

```bash
git add apps/web/src/components/learner/LessonPlayer.tsx apps/web/src/components/learner/MarkdownSlides.tsx
git commit -m "feat(web): text / slides レッスンで登録済み markdown を描画する"
```

### Task 11: 図解 SVG を R2 へアップロードする

**Files:**
- Create: `packages/content/scripts/upload-materials.ts`
- Modify: `packages/content/package.json`

**Interfaces:**
- Consumes: `assetPath`（Task 8）

- [ ] **Step 1: アップロードスクリプトを書く**

```typescript
/**
 * 教材の図解 SVG を R2 へ流す。
 *
 *   bun run --filter=@stella/content upload            # local (--local)
 *   bun run --filter=@stella/content upload -- --remote
 *
 * スライド本文と doc.md は D1 の lessons.markdown に入るので、R2 に置くのは
 * 本文から参照される画像だけ。キーは manifest の assetPath() と一致していなければならない。
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { assetPath } from "../src/manifest.js";

const BUCKET = "falcon-materials";
const remote = process.argv.includes("--remote");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "modules");

function put(key: string, file: string, contentType: string) {
  execFileSync(
    "bunx",
    [
      "wrangler", "r2", "object", "put", `${BUCKET}/${key}`,
      "--file", file,
      "--content-type", contentType,
      remote ? "--remote" : "--local",
    ],
    { stdio: "inherit" },
  );
}

function dirsIn(path: string): string[] {
  return readdirSync(path).filter((e) => statSync(join(path, e)).isDirectory()).sort();
}

let svgs = 0;

for (const moduleDir of dirsIn(root)) {
  for (const lessonDir of dirsIn(join(root, moduleDir))) {
    const lessonPath = join(root, moduleDir, lessonDir);
    for (const topicDir of dirsIn(lessonPath)) {
      const assetsDir = join(lessonPath, topicDir, "assets");
      if (!existsSync(assetsDir)) continue;
      for (const file of readdirSync(assetsDir)) {
        if (!file.endsWith(".svg")) continue;
        put(assetPath(topicDir, file), join(assetsDir, file), "image/svg+xml");
        svgs++;
      }
    }
  }
}

console.log(`✓ SVG ${svgs} 件をアップロードしました`);
if (svgs === 0) {
  console.error("SVG が 1 件も見つかりませんでした。modules の配置を確認してください。");
  process.exit(1);
}
```

- [ ] **Step 2: `packages/content/package.json` の `scripts` に足す**

```json
    "upload": "bun run scripts/upload-materials.ts",
    "upload:remote": "bun run scripts/upload-materials.ts --remote",
```

- [ ] **Step 3: バケット名を実物に合わせる**

```bash
grep -n "bucket_name\|r2_buckets" -A 3 apps/api/wrangler.toml apps/api/wrangler.jsonc 2>/dev/null
```

出力された実際のバケット名を `upload-materials.ts` の `BUCKET` に反映する。

- [ ] **Step 4: ローカルにアップロードする**

```bash
bun run --filter=@stella/content upload
```

Expected: `✓ SVG 68 件をアップロードしました`

- [ ] **Step 5: 受講者 UI で確認する**

`bun run dev:api` + `bun run dev` で、`1-1-2 constとletの違い`（slides レッスン）と `1-1 ドキュメント`（text レッスン）を開き、どちらも図解画像が表示されることを確認する。

- [ ] **Step 6: コミット**

```bash
git add packages/content/scripts/upload-materials.ts packages/content/package.json
git commit -m "feat(content): 教材の図解 SVG を R2 へ流すスクリプトを追加"
```

---

## Phase 6 — TypeScript 課題の実行基盤

現状 `Language = "javascript" | "sql"` で、採点ランナー（QuickJS WASM）は JS しか実行できない。TypeScript 研修の演習を載せるにはここを開ける。

### Task 12: Language に "typescript" を足し、実行前にトランスパイルする

**Files:**
- Modify: `packages/shared/src/types.ts:21`
- Modify: `packages/code-runner/src/quickjs-worker.ts`
- Modify: `packages/code-runner/package.json`
- Test: `packages/code-runner/src/transpile.test.ts`
- Create: `packages/code-runner/src/transpile.ts`

**Interfaces:**
- Produces: `transpileTypeScript(source: string): string`（Task 13 以降の課題が依存）

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { transpileTypeScript } from "./transpile.js";

describe("transpileTypeScript", () => {
  it("型注釈を落として実行可能な JS にする", () => {
    const out = transpileTypeScript("const n: number = 1;\nconsole.log(n);");
    expect(out).not.toContain(": number");
    expect(out).toContain("console.log(n)");
  });

  it("interface と type は消える", () => {
    const out = transpileTypeScript("type A = { a: string };\ninterface B { b: number }\nconsole.log(1);");
    expect(out).not.toContain("interface");
    expect(out).not.toContain("type A");
  });

  it("構文エラーは例外として投げる", () => {
    expect(() => transpileTypeScript("const = ;")).toThrow(/TS\d+/);
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test packages/code-runner/src/transpile.test.ts`
Expected: FAIL（`transpile.js` が無い）

- [ ] **Step 3: `typescript` を devDependencies から dependencies へ移す**

`packages/code-runner/package.json` の `devDependencies` にある `"typescript": "^7.0.2"` を `dependencies` へ移動する。ブラウザ（Web Worker）で実行するため。

```bash
bun install
```

- [ ] **Step 4: 実装する**

```typescript
/**
 * 学習者が書いた TypeScript を QuickJS で実行できる JS に落とす。
 *
 * 型検査はしない。構文エラーだけを例外にする。
 * ponytail: 型エラーは採点に反映されない（transpileModule は semantic diagnostics を出さない）。
 *   型エラー自体をアサートしたい課題が出てきたら ts.createProgram + lib.d.ts を worker に載せる。
 *   現状の 126 問はすべて「直したコードの実行結果」で判定できるため、そこまでは要らない。
 */

import ts from "typescript";

export function transpileTypeScript(source: string): string {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.None,
      removeComments: false,
    },
    reportDiagnostics: true,
  });

  const fatal = (result.diagnostics ?? []).filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  if (fatal.length > 0) {
    const messages = fatal
      .map((d) => `TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`)
      .join("\n");
    throw new Error(messages);
  }

  return result.outputText;
}
```

- [ ] **Step 5: テストが通ることを確認**

Run: `bun run test packages/code-runner/src/transpile.test.ts`
Expected: PASS（3件）

- [ ] **Step 6: `Language` に足す**

`packages/shared/src/types.ts:21` を変更する。

```typescript
export type Language = "javascript" | "typescript" | "sql";
```

同ファイル 17-18 行のコメント（「falcon-informal P0 では JavaScript / SQL のみ」）も実態に合わせて書き直す。

- [ ] **Step 7: worker で TS を通す**

`packages/code-runner/src/quickjs-worker.ts` で学習者コードを QuickJS に渡している直前に、言語が `typescript` ならトランスパイルする分岐を入れる。`typescript` パッケージはサイズが大きいので動的 import にする（`pdfjs` と同じ方針）。

```typescript
let code = file.content;
if (language === "typescript") {
  const { transpileTypeScript } = await import("./transpile.js");
  code = transpileTypeScript(code);
}
```

`language` の取り出しは既存の `getLanguage(assignment)` を使う。

- [ ] **Step 8: 型検査 / lint / テストを通す**

```bash
bun run typecheck && bun run lint && bun run test
```

Expected: すべて PASS

- [ ] **Step 9: コミット**

```bash
git add packages/code-runner packages/shared/src/types.ts bun.lock
git commit -m "feat(code-runner): TypeScript 課題をトランスパイルして実行できるようにする"
```

### Task 13: ChapterId に型システムとジェネリクスを足す

falcon の章立て（Ch00〜Ch16）は JS 前提で、型システム・ジェネリクスに相当する章が無い。ts-course の M5 / M6 の課題を置く先を作る。

**Files:**
- Modify: `packages/shared/src/types.ts:39-56`
- Modify: `packages/shared/src/curriculum/chapters.ts`
- Test: `packages/shared/src/curriculum/chapters.test.ts`

- [ ] **Step 1: 失敗するテストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { chapters } from "./chapters.js";

describe("chapters", () => {
  it("型システムとジェネリクスの章がある", () => {
    const ids = chapters.map((c) => c.id);
    expect(ids).toContain("Ch17");
    expect(ids).toContain("Ch18");
  });

  it("order は 0 から連番", () => {
    chapters.forEach((c, i) => expect(c.order).toBe(i));
  });
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test packages/shared/src/curriculum/chapters.test.ts`
Expected: FAIL（Ch17 が無い）

- [ ] **Step 3: `ChapterId` に足す**

`packages/shared/src/types.ts` の `ChapterId` union の末尾（`| "Ch16";`）を次に変える。

```typescript
  | "Ch16"
  | "Ch17"
  | "Ch18";
```

- [ ] **Step 4: `chapters.ts` に 2 章足す**

配列末尾（Ch16 の直後）に追加。`defaultMdnPage` はフィールド名こそ MDN だが、TypeScript 固有の題材は公式ハンドブックを指す。

```typescript
  {
    id: "Ch17",
    order: 17,
    label: "Ch17. 型システム",
    description: "型注釈、ユニオン型、型ガード、any / unknown / never。",
    defaultMdnPage: "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
    mdnPageTitle: "Everyday Types (TypeScript Handbook)",
  },
  {
    id: "Ch18",
    order: 18,
    label: "Ch18. ジェネリクス",
    description: "型引数、keyof / typeof、ユーティリティ型。",
    defaultMdnPage: "https://www.typescriptlang.org/docs/handbook/2/generics.html",
    mdnPageTitle: "Generics (TypeScript Handbook)",
  },
```

- [ ] **Step 5: テストが通ることを確認**

Run: `bun run test packages/shared/src/curriculum/chapters.test.ts`
Expected: PASS（2件）

- [ ] **Step 6: 型検査を通してコミット**

```bash
bun run typecheck
git add packages/shared/src
git commit -m "feat(shared): 型システム / ジェネリクスの章を追加"
```

---

## Phase 7 — 演習問題 126 問の Assignment 化

`practice.md` は 42 レッスン × 3 問 = **126 問**。各問は「問1(基本) / 問2(基本) / 問3(応用)」の形で、`## 解答例と解説` に `<details>` で解答例が付いている。これを `Assignment` に書き起こす。

### モジュール → 章 / ステージ の対応表

すべてのタスクがこの表に従う。

| ts モジュール | chapterId | 問1 / 問2 の stage | 問3 の stage | 既定 testKind |
| --- | --- | --- | --- | --- |
| m0-orientation | Ch00 | S0 | S1 | stdout |
| m1-values | Ch01 | S1 | S2 | stdout |
| m2-conditionals | Ch05 | S1 | S2 | stdout |
| m3-data | Ch04 | S2 | S2 | stdout |
| m4-functions | Ch07 | S2 | S3 | function |
| m5-type-system | Ch17 | S2 | S3 | function |
| m6-generics | Ch18 | S3 | S3 | function |
| m7-oop | Ch15 | S3 | S3 | function |
| m8-async | Ch16 | S3 | S3 | function |
| m9-practice | Ch12 | S3 | S3 | stdout |

### 課題 ID とファイルの規則

- `id`: `<Stage>-<ChapterId>-<モジュール番号><レッスン番号><問番号>-<英小文字ケバブ>` 例: `S1-Ch01-111-declare-three-vars`（M1 / レッスン1 / 問1）
  - 3 桁はすべて 1 桁ずつ。モジュールは `0`〜`9`、レッスンは `1`〜`6`、問は `1`〜`3`。
  - この 3 桁が Task 19 の逆引きキーになる。モジュール番号を落とすと別モジュールの同番号レッスンと衝突するので必ず 3 桁にする。
- ファイル: `packages/shared/src/problems/<章ディレクトリ>/<stage 小文字>/<連番2桁>-<ケバブ>.ts`
- 新設する章ディレクトリ: `10-types`（Ch17）、`11-generics`（Ch18）
- `starterFiles`: `singleFile(content, "main.ts")` — **第2引数の `main.ts` を必ず渡す**（既定は `main.js`）
- `language: "typescript"` を必ず書く

### 1問あたりの変換手順（全タスク共通）

1. `practice.md` の `### 問N(...)` 本文を `description` に写す（`## やること` / `## 期待する出力` / `## ポイント` の3見出しに整形。既存 `packages/shared/src/problems/01-variables/s1/03-let-reassign.ts` の書き方に合わせる）
2. `## 解答例と解説` の `<details>` にある解答例を `solution` に入れる
3. `solution` を実際に実行して得た標準出力を `tests[].expectedStdout` にする（憶測で書かない）
4. `hints` を3つ書く。3つ目は解答例のコードブロック
5. 元の問題文が禁止/必須している構文があれば `staticAnalysis.ast` に落とす（例: `var` 禁止 → `forbidden: [{ kind: "var", label: "var を使わない" }]`）
6. `badSolutions` に、その問題で実際に起きがちな誤答を1つ書く

### Task 14: M0 / M1 の課題を書き起こす（レッスン 2 + 6 = 24 問）

**Files:**
- Create: `packages/shared/src/problems/00-setup/s0/09-*.ts` 〜（M0 の 6 問）
- Create: `packages/shared/src/problems/01-variables/s1/13-*.ts` 〜（M1 の 18 問）
- Modify: `packages/shared/src/problems/00-setup/_index.ts`
- Modify: `packages/shared/src/problems/01-variables/_index.ts`
- Test: `packages/shared/src/problems/problems.test.ts`

**Interfaces:**
- Consumes: `singleFile`（`packages/shared/src/problems/_common.ts`）、`Assignment`（`packages/shared/src/types.ts`）
- Produces: 各課題の named export（`_index.ts` が集約）

- [ ] **Step 1: 全課題を検証する共通テストを書く**

```typescript
import { describe, expect, it } from "vitest";
import { assignments } from "./index.js";

/**
 * 新規に追加する TypeScript 課題の品質ゲート。
 * 既存の JavaScript 課題 279 件は対象外（hints が 3 未満のものが 87 件あり、
 * この移行では触らない）。id 重複だけは全件で見る。
 */
const tsAssignments = assignments.filter((a) => a.language === "typescript");

describe("assignments", () => {
  it("id が全件で重複しない", () => {
    const ids = assignments.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("TypeScript 課題の starterFiles は .ts", () => {
    for (const a of tsAssignments) {
      for (const f of a.starterFiles) {
        expect(f.path.endsWith(".ts")).toBe(true);
      }
    }
  });

  it("TypeScript の stdout 課題には expectedStdout がある", () => {
    for (const a of tsAssignments) {
      if (a.testKind !== "stdout") continue;
      expect(a.tests.length).toBeGreaterThan(0);
      for (const t of a.tests) expect(typeof t.expectedStdout).toBe("string");
    }
  });

  it("TypeScript 課題の hints は 3 つ以上", () => {
    for (const a of tsAssignments) {
      expect(a.hints?.length ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  it("TypeScript 課題には solution がある", () => {
    for (const a of tsAssignments) expect(a.solution).toBeTruthy();
  });

  it("TypeScript 課題の id は 3 桁のレッスンセグメントを持つ", () => {
    for (const a of tsAssignments) {
      expect(a.id.split("-")[2]).toMatch(/^\d{3}$/);
    }
  });
});
```

課題の一覧は `packages/shared/src/problems/index.ts` が `assignments` という名前で export している（`allAssignments` ではない）。

- [ ] **Step 2: テストを走らせて現状を確認する**

Run: `bun run test packages/shared/src/problems/problems.test.ts`
Expected: PASS（この時点では `tsAssignments` が空なので、実質 id 重複チェックだけが働く）

- [ ] **Step 3: M1 レッスン1-1 の 3 問を書く（先頭の 1 レッスンを完全な手本にする）**

`packages/content/modules/m1-values/l1-variables/practice.md` の問1を `packages/shared/src/problems/01-variables/s1/13-declare-three-vars.ts` に落とす。

```typescript
import type { Assignment } from "../../../types.js";
import { singleFile } from "../../_common.js";

export const s1Ch01DeclareThreeVars: Assignment = {
  id: "S1-Ch01-111-declare-three-vars",
  stage: "S1",
  chapterId: "Ch01",
  sequence: 13,
  title: "3 つの値をふさわしいキーワードで宣言する",
  newConcept: "変わらない値は const、更新される値は let",
  estimatedMinutes: 7,
  difficulty: 1,
  testKind: "stdout",
  language: "typescript",
  description: `## やること

次の 3 つの値を、それぞれふさわしいキーワード (\`let\` または \`const\`) で宣言し、\`console.log\` で順に表示してください。

- 会社名「株式会社サンプル」(今後変わらない)
- 今月の売上目標 \`500000\` (今後変わらない)
- 現在の売上 \`120000\` (日々更新される)

## 期待する出力

\`\`\`
株式会社サンプル
500000
120000
\`\`\`

## ポイント

- 変わらない値は \`const\`、更新される値は \`let\` で宣言します。
- 迷ったらまず \`const\` にして、再代入が必要になったときだけ \`let\` に変えます。
`,
  starterFiles: singleFile(
    `// 会社名（変わらない）


// 今月の売上目標（変わらない）


// 現在の売上（日々更新される）


// 3 つを console.log で順に表示する

`,
    "main.ts",
  ),
  tests: [
    {
      name: "3 行が順に出力される",
      expectedStdout: "株式会社サンプル\n500000\n120000",
    },
  ],
  hints: [
    "「今後変わらない」と書かれている値は `const` です。",
    "「日々更新される」と書かれている値だけ `let` にします。",
    "解答例:\n```ts\nconst companyName = \"株式会社サンプル\";\nconst salesTarget = 500000;\nlet currentSales = 120000;\n\nconsole.log(companyName);\nconsole.log(salesTarget);\nconsole.log(currentSales);\n```",
  ],
  staticAnalysis: {
    ast: {
      forbidden: [{ kind: "var", label: "var を使わない" }],
    },
  },
  solution: `const companyName = "株式会社サンプル";
const salesTarget = 500000;
let currentSales = 120000;

console.log(companyName);
console.log(salesTarget);
console.log(currentSales);
`,
  badSolutions: [
    {
      code: `let companyName = "株式会社サンプル";
let salesTarget = 500000;
let currentSales = 120000;

console.log(companyName);
console.log(salesTarget);
console.log(currentSales);
`,
      description: "変わらない値まで let で宣言している",
    },
  ],
  mdnSections: [{ heading: "const" }, { heading: "let" }],
};
```

- [ ] **Step 4: `solution` を実際に走らせて expectedStdout を裏取りする**

```bash
bunx tsc --target es2020 --outFile /tmp/sol.js packages/shared/src/problems/01-variables/s1/13-declare-three-vars.solution.ts 2>/dev/null || true
```

より確実なのは、solution の中身を一時ファイルに書いて実行すること。

```bash
cat > /tmp/sol.ts <<'EOF'
const companyName = "株式会社サンプル";
const salesTarget = 500000;
let currentSales = 120000;

console.log(companyName);
console.log(salesTarget);
console.log(currentSales);
EOF
bun /tmp/sol.ts
```

Expected: `株式会社サンプル` / `500000` / `120000` の 3 行。`expectedStdout` と一致すること。

- [ ] **Step 5: `_index.ts` に登録する**

`packages/shared/src/problems/01-variables/_index.ts` の import 群と export 配列に `s1Ch01DeclareThreeVars` を足す。

- [ ] **Step 6: 残り 2 問（問2 / 問3）を同じ手順で書く**

- 問2 → `s1/14-fix-const-reassign.ts`（`id: "S1-Ch01-112-fix-const-reassign"`）: const への再代入を直す問題。`solution` は `let memberCount = 5; memberCount = 6; console.log(memberCount);`、`expectedStdout: "6"`
- 問3 → `s2/11-rewrite-var.ts`（`id: "S2-Ch01-113-rewrite-var"`、`stage: "S2"`）: `var` の二度宣言を `const` に書き直す問題。`staticAnalysis.ast.forbidden` に `{ kind: "var" }`、`expectedStdout: "渋谷店"`

- [ ] **Step 7: テストを通す**

Run: `bun run test packages/shared/src/problems/problems.test.ts`
Expected: PASS

- [ ] **Step 8: 手本レッスンをコミットする**

```bash
git add packages/shared/src/problems
git commit -m "feat(shared): M1 レッスン1-1 の演習 3 問を Assignment 化"
```

- [ ] **Step 9: M0 の 2 レッスン（6 問）を同じ手順で書く**

`packages/content/modules/m0-orientation/l1-why-typescript/practice.md` と `l2-playground/practice.md` から、対応表どおり `chapterId: "Ch00"` / `stage: "S0"`（問3 は `"S1"`）で `packages/shared/src/problems/00-setup/` 配下に置く。Step 3〜7 の手順をそのまま繰り返す。

- [ ] **Step 10: M1 の残り 5 レッスン（15 問）を同じ手順で書く**

`l2-type-annotation` / `l3-number-boolean` / `l4-string` / `l5-literal-union` / `l6-null-undefined`。`l4-string` は `chapterId: "Ch03"`、`l3-number-boolean` は `chapterId: "Ch02"` を使う（章の題材に合わせる。`l1` / `l2` / `l5` / `l6` は `Ch01`）。

- [ ] **Step 11: テストと型検査を通してコミット**

```bash
bun run test && bun run typecheck && bun run lint
git add packages/shared/src/problems
git commit -m "feat(shared): M0 / M1 の演習 24 問を Assignment 化"
```

### Task 15: M2 / M3 の課題を書き起こす（レッスン 4 + 4 = 24 問）

**Files:**
- Create: `packages/shared/src/problems/05-conditionals/**`（M2 の 12 問）
- Create: `packages/shared/src/problems/04-arrays/**`、`packages/shared/src/problems/08-objects/**`（M3 の 12 問）
- Modify: 対応する `_index.ts`

- [ ] **Step 1: M2 の 4 レッスン（12 問）を書く**

Task 14 Step 3〜7 の手順に従う。`chapterId: "Ch05"`、問1/問2 は `stage: "S1"`、問3 は `"S2"`。`m2-conditionals/l1-scope` はスコープの題材なので `chapterId: "Ch01"` を使う。

- [ ] **Step 2: M2 分のテストを通してコミット**

```bash
bun run test && bun run typecheck
git add packages/shared/src/problems
git commit -m "feat(shared): M2 条件分岐の演習 12 問を Assignment 化"
```

- [ ] **Step 3: M3 の 4 レッスン（12 問）を書く**

`l1-array` / `l2-array-use` → `chapterId: "Ch04"`（`packages/shared/src/problems/04-arrays/`）。`l3-object` / `l4-type-alias` → `chapterId: "Ch08"`（`packages/shared/src/problems/08-objects/`）。stage は問1/問2 が `"S2"`、問3 が `"S2"`。

- [ ] **Step 4: M3 分のテストを通してコミット**

```bash
bun run test && bun run typecheck
git add packages/shared/src/problems
git commit -m "feat(shared): M3 配列・オブジェクトの演習 12 問を Assignment 化"
```

### Task 16: M4 の課題を書き起こす（6 レッスン = 18 問）

M4 から `testKind: "function"` が既定になる。`FunctionTestCase` は `code` に真偽を返す式を書く（`expectedStdout` は使わない）。

**Files:**
- Create: `packages/shared/src/problems/07-functions/s2/*.ts`、`packages/shared/src/problems/07-functions/s3/*.ts`
- Modify: `packages/shared/src/problems/07-functions/_index.ts`

- [ ] **Step 1: `l1-function-basics` の 3 問を書く**

`testKind: "function"` の課題では `tests` を次の形にする。

```typescript
  testKind: "function",
  entryPoints: ["addTax"],
  tests: [
    { name: "1000 円に 10% の税を足すと 1100", code: "addTax(1000) === 1100" },
    { name: "0 円なら 0", code: "addTax(0) === 0" },
    { name: "端数は切り捨てる", code: "addTax(105) === 115" },
  ],
```

`entryPoints` は lint が「未使用」と判定しないための識別子リスト。関数課題では必ず書く。

3 番目のテストのような境界値は、`solution` を実際に走らせて確かめた値だけを書く。

- [ ] **Step 2: solution を走らせて全テストの期待値を裏取りする**

```bash
cat > /tmp/sol.ts <<'EOF'
（solution の中身）
console.log(addTax(1000), addTax(0), addTax(105));
EOF
bun /tmp/sol.ts
```

出力と `tests[].code` の期待値が一致することを確認する。

- [ ] **Step 3: 残り 5 レッスン（15 問）を同じ手順で書く**

`l2-function-styles` / `l3-parameters` / `l4-return` / `l5-callbacks` / `l6-options`。`l5-callbacks` だけ `chapterId: "Ch09"`（高階関数）、他は `"Ch07"`。

- [ ] **Step 4: テストを通してコミット**

```bash
bun run test && bun run typecheck && bun run lint
git add packages/shared/src/problems
git commit -m "feat(shared): M4 関数の演習 18 問を Assignment 化"
```

### Task 17: M5 / M6 の課題を書き起こす（6 + 3 レッスン = 27 問）

型システムとジェネリクスの課題は、Task 13 で追加した `Ch17` / `Ch18` に置く。新しい章ディレクトリを作る。

**Files:**
- Create: `packages/shared/src/problems/10-types/_index.ts`、`10-types/s2/*.ts`、`10-types/s3/*.ts`
- Create: `packages/shared/src/problems/11-generics/_index.ts`、`11-generics/s3/*.ts`
- Create: `packages/shared/src/problems/10-types/README.md`、`11-generics/README.md`
- Modify: `packages/shared/src/problems/index.ts`

- [ ] **Step 1: 章ディレクトリの雛形を作る**

既存の `packages/shared/src/problems/01-variables/_index.ts` と `README.md` の構成をそのまま真似る。

```bash
cat packages/shared/src/problems/01-variables/README.md
```

読んだ構成に沿って `10-types/README.md` と `11-generics/README.md` を書く。

- [ ] **Step 2: `problems/index.ts` に 2 章を登録する**

既存の章 import に倣って `10-types/_index.js` と `11-generics/_index.js` を足す。

- [ ] **Step 3: M5 の 6 レッスン（18 問）を書く**

`chapterId: "Ch17"`。ただし `l4-exceptions` だけ `chapterId: "Ch13"`（エラー処理）。問1/問2 は `stage: "S2"`、問3 は `"S3"`。

- [ ] **Step 4: M5 分のテストを通してコミット**

```bash
bun run test && bun run typecheck
git add packages/shared/src/problems
git commit -m "feat(shared): M5 型システムの演習 18 問を Assignment 化"
```

- [ ] **Step 5: M6 の 3 レッスン（9 問）を書く**

`chapterId: "Ch18"`、全問 `stage: "S3"`、`testKind: "function"`。

- [ ] **Step 6: M6 分のテストを通してコミット**

```bash
bun run test && bun run typecheck
git add packages/shared/src/problems
git commit -m "feat(shared): M6 ジェネリクスの演習 9 問を Assignment 化"
```

### Task 18: M7 / M8 / M9 の課題を書き起こす（4 + 3 + 4 レッスン = 33 問）

**Files:**
- Create: `packages/shared/src/problems/15-class/**`（M7 の 12 問）
- Create: `packages/shared/src/problems/16-async/**`（M8 の 9 問）
- Create: `packages/shared/src/problems/12-debug/**`（M9 の 12 問）
- Modify: 対応する `_index.ts` と `problems/index.ts`

- [ ] **Step 1: 3 つの章ディレクトリを作る**

Task 17 Step 1〜2 と同じ手順で `15-class` / `16-async` / `12-debug` の `_index.ts` と `README.md` を作り、`problems/index.ts` に登録する。

- [ ] **Step 2: M7 の 4 レッスン（12 問）を書く**

`chapterId: "Ch15"`、全問 `stage: "S3"`、`testKind: "function"`。

- [ ] **Step 3: M8 の 3 レッスン（9 問）を書く**

`chapterId: "Ch16"`、全問 `stage: "S3"`。非同期課題の `tests` は `code` に await を含む式を書けないため、次の形で同期的に検証する。

```typescript
  testKind: "stdout",
  tests: [
    { name: "1 秒後にメッセージが出る", expectedStdout: "開始\n完了" },
  ],
```

`staticAnalysis.ast.required` に `{ kind: "async-fn", label: "async 関数を使う" }` を入れて、async/await を使っていることを担保する。

- [ ] **Step 4: M9 の 4 レッスン（12 問）を書く**

`chapterId: "Ch12"`（デバッグ）、全問 `stage: "S3"`、`testKind: "stdout"`。`l3-tsconfig` / `l4-tools` は実行結果で採点できない設定系の問題が含まれる。その場合は `testKind: "stdout"` で「設定を反映したコードの出力」を問う形に問題文ごと書き換え、書き換えた内容を `packages/content/modules/m9-practice/<レッスン>/practice.md` にも反映する（教材と課題を食い違わせない）。

- [ ] **Step 5: 126 問すべてが揃ったことを確認する**

```bash
bun -e 'import{assignments}from"./packages/shared/src/problems/index.ts";console.log("typescript assignments:",assignments.filter(a=>a.language==="typescript").length);'
```

Expected: `typescript assignments: 126`

- [ ] **Step 6: テストを通してコミット**

```bash
bun run test && bun run typecheck && bun run lint
git add packages/shared/src/problems
git commit -m "feat(shared): M7 / M8 / M9 の演習 33 問を Assignment 化"
```

### Task 19: manifest に code レッスンを足して課題を紐づける

**Files:**
- Modify: `packages/content/src/manifest.ts`
- Modify: `packages/content/src/manifest.test.ts`
- Create: `packages/content/src/assignment-map.ts`

**Interfaces:**
- Consumes: `assignments`（`@stella/shared` の課題一覧 export）
- Produces: `assignmentIdsForLesson(lessonKey: string): string[]`

- [ ] **Step 1: 失敗するテストを足す**

`packages/content/src/manifest.test.ts` に追加。

```typescript
it("レッスンごとに code レッスンが 3 つ付く", () => {
  const m1 = courses[0].sections?.find((s) => s.id === "m1-values");
  const codes = m1?.lessons.filter((l) => l.type === "code" && l.id.startsWith("code-1-1-"));
  expect(codes).toHaveLength(3);
  expect(codes?.[0].assignmentId).toBe("S1-Ch01-111-declare-three-vars");
});

it("全 code レッスンの assignmentId が実在する", async () => {
  const { assignments } = await import("@stella/shared");
  const known = new Set(assignments.map((a) => a.id));
  const codes = courses[0].sections?.flatMap((s) => s.lessons).filter((l) => l.type === "code") ?? [];
  expect(codes).toHaveLength(126);
  for (const l of codes) expect(known.has(l.assignmentId ?? "")).toBe(true);
});
```

- [ ] **Step 2: テストが落ちることを確認**

Run: `bun run test packages/content/src/manifest.test.ts`
Expected: FAIL（code レッスンが無い）

- [ ] **Step 3: `assignment-map.ts` を書く**

```typescript
/**
 * レッスンキー（"1-1"）から、そのレッスンの演習課題 3 件を引く。
 *
 * Assignment 側の id は `<Stage>-<ChapterId>-<モジュール><レッスン><問>-<slug>` 形式で
 * 統一してあるので、id を舐めて逆引きする。マッピング表を二重管理しない。
 */

import { assignments } from "@stella/shared";

/** "1-1" → id の 3 番目のセグメントが "11" で始まる 3 桁の課題（"111","112","113"）を返す。 */
export function assignmentIdsForLesson(lessonKey: string): string[] {
  const [moduleNo, lessonNo] = lessonKey.split("-");
  const prefix = `${moduleNo}${lessonNo}`;
  return assignments
    .filter((a) => a.language === "typescript")
    .filter((a) => {
      const seg = a.id.split("-")[2] ?? "";
      return seg.length === 3 && seg.startsWith(prefix);
    })
    .map((a) => a.id)
    .sort();
}
```

- [ ] **Step 4: manifest から呼ぶ**

`buildContentManifest` の quiz レッスンを push している直後に追加。

```typescript
const assignmentIds = assignmentIdsForLesson(key);
assignmentIds.forEach((assignmentId, i) => {
  lessons.push({
    id: `code-${key}-${i + 1}`,
    title: `${key} 演習${i + 1}`,
    type: "code",
    duration: "10分",
    status: "todo",
    assignmentId,
  });
});
```

import も足す。

```typescript
import { assignmentIdsForLesson } from "./assignment-map.js";
```

- [ ] **Step 5: テストが通ることを確認**

Run: `bun run test packages/content/src/manifest.test.ts`
Expected: PASS（9件）

- [ ] **Step 6: seed を流し直す**

```bash
bun run db:seed && bun run smoke:d1
bunx wrangler d1 execute falcon-db --local --command "select count(*) from lessons where type='code'"
```

Expected: `126`

- [ ] **Step 7: 受講者 UI で 1 問解いてみる**

`bun run dev:api` + `bun run dev` で `1-1 演習1` を開き、エディタに解答を書いて提出し、PASS になることを確認する。TypeScript のトランスパイル（Task 12）が効いているか、型注釈を書いても実行できることを確かめる。

- [ ] **Step 8: コミット**

```bash
git add packages/content/src
git commit -m "feat(content): 演習課題を code レッスンとしてコースに載せる"
```

---

## Phase 8 — 締め

### Task 20: README と AGENTS.md を更新する

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: `README.md` のモノレポ構成図に content を足す**

`├── packages/` 配下の一覧に追加。

```text
│   ├── content/              # @stella/content — 研修教材の正本（スライド / doc / 演習）
```

- [ ] **Step 2: `README.md` に教材ビルドの節を足す**

「セットアップ」の後に追加。

````markdown
## 教材のビルドと投入

教材の正本は `packages/content/modules/` 配下のファイル。D1 の内容はここから毎回作り直される
（CMS 画面での編集は次の seed で上書きされる）。

```bash
bun run --filter=@stella/content materials   # pptx + 図解 SVG/PNG を生成
bun run --filter=@stella/content upload      # 図解 SVG を R2 (local) へ
bun run db:seed                              # コース / レッスン / クイズ / 課題を D1 へ
```

本番へ流すときは `upload:remote` と `db:seed:remote` を使う。

`materials` には Node に加えて次が必要（`bun install` だけでは足りない）:

- Python 3 + `pip install python-pptx pygments playwright` + `playwright install chromium`

教材の書き方（トピックの粒度、語彙台帳、図解の規約）は `packages/content/CLAUDE.md` と
`packages/content/STYLE_GUIDE.md` にある。新しい教材を作るときは必ず先に読むこと。
````

- [ ] **Step 3: `AGENTS.md` の「Testing」節を実態に合わせる**

「No automated test framework (Jest/Vitest) is configured」は誤りになっている（`vitest.config.ts` があり `bun run test` が動く）。次に差し替える。

```markdown
### Testing

Vitest (`bun run test`). 教材まわりは `packages/content/src/*.test.ts` と
`packages/shared/src/problems/problems.test.ts` が seed の入力を守っている。
教材本文の整合性（語彙台帳・画像リンク）は `bun run content:check` が検査し、CI ゲートに入っている。
```

- [ ] **Step 4: コミット**

```bash
git add README.md AGENTS.md
git commit -m "docs: 教材のビルド・投入手順を README / AGENTS に追記"
```

### Task 21: 本番へ反映して ts-course を削除する

**Files:** なし（運用手順）

- [ ] **Step 1: 全検証を通す**

```bash
bun run lint && bun run typecheck && bun run test && bun run content:check && bun run build
```

Expected: すべて PASS

- [ ] **Step 2: PR を出してマージする**

`main` へのマージで `deploy.yml` が走り、D1 の remote migrate と deploy が実行される。

- [ ] **Step 3: 本番の R2 と D1 に教材を流す**

```bash
bun run --filter=@stella/content materials
bun run --filter=@stella/content upload:remote
bun run db:seed:remote
```

- [ ] **Step 4: 本番で受講者として通しで確認する**

`TypeScript 入門` を開き、次の 4 つを確認する。

1. `1-1-2 constとletの違い` のスライドが表示され、ページ送りで進捗が記録される
2. `1-1 ドキュメント` の本文と図解画像が表示される
3. `1-1 確認クイズ` が 4 問出題され、採点と解説が出る
4. `1-1 演習1` を提出して PASS になる

- [ ] **Step 5: 移行完了を確認してから ts-course を削除する**

Step 4 がすべて通ったことを確認してから実行する。**この操作は取り消せない**ので、実行前に必ずユーザーに確認を取ること。

```bash
# ts-course のリモートに未 push のコミットが無いことを先に確認
git -C "$TS" status --short
git -C "$TS" log --oneline origin/main..HEAD
```

未 push が無いことを確認したうえで、リポジトリ（ローカル + リモート）を削除する。

---

## 未対応として残すこと

この計画のスコープ外。着手する前に別途 spec を書くこと。

- **型エラーの採点** — Task 12 の `transpileTypeScript` は構文エラーしか見ない。`const` への再代入のような「型エラーが出ること自体」をアサートしたい課題が出てきたら、worker に `ts.createProgram` と lib.d.ts を載せる必要がある。
- **動画** — 160 本の収録は未着手。`lessons.video_path` は空のまま。収録後は `type: "video"` のレッスンを manifest に足す。
- **スクリーンショット素材** — `packages/content/IMAGE_PLAN.md` にある Playground / VS Code の実画面の挿入。
- **図解の不足** — 160 トピック中 68 にしか `assets/` が無い。
