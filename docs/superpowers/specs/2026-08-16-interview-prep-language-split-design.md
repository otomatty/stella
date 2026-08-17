# 面談対策の案件種別を言語・FW粒度へ分割する 設計書

日付: 2026-08-16
ステータス: 実装済み
関連: [2026-08-14-interview-prep-design.md](./2026-08-14-interview-prep-design.md)

## 目的

面談対策の割当カテゴリ `PHP/JS` を `PHP` / `JS` へ分割し、さらに `PHP/Laravel` のような FW 粒度まで割当できるようにする。あわせて、現状 `全案件共通` に混入している言語依存の質問を正しいカテゴリへ移す。

## 背景 — 現状の課題

現状のデータモデルは **1問につきカテゴリ1つ**(`interview_questions.category` が text 単一値)。割当は `interview_prep_assignments.categories` (配列) で、表示は [filter.ts](../../../packages/shared/src/interview/filter.ts) が `全案件共通` + 割当カテゴリで絞り込む。カテゴリ内訳は `PHP/JS` 45 (no 2–46) / `SQL` 46 (no 47–92) / `テスト` 47 (no 93–139) / `全案件共通` 50 (no 140–189) の計188問。

このモデルには2つの問題がある。

### ① `PHP/JS` 45問のうち言語専用は半分以下

| 区分 | 問No | 数 |
|---|---|---|
| PHP専用 | 5–14 | 10 |
| JS/フロント専用(HTML/CSS含む) | 15–24 | 10 |
| PHP・JS 両方に必要(REST設計・ORM・N+1・トランザクション・脆弱性・詳細設計・PHPUnit/Jest・レビュー) | 25–34 | 10 |
| 案件種別を問わない(自己紹介・Git/Docker/Linux・コミュ・トラブル・マインド・逆質問) | 2–4, 35–46 | 15 |

単純に `PHP` / `JS` へ2分割すると、後半25問の置き場がない。`全案件共通` へ落とすと SQL案件・テスト案件の受講者にも「N+1問題」「PHPUnit」が表示されてしまう。

### ② `全案件共通` が既に言語依存で汚染されている

`全案件共通` 50問のうち、`バックエンド（PHP）`6 / `フロントエンド（JS）`3 / `フロントエンド（CSS）`2 / `データベース（SQL）`4 の **計15問が言語依存**。現状、テスト案件のみを割り当てた受講者に Laravel のリポジトリパターン(#151)が表示されている。

さらに `PHP/JS` と `全案件共通` で **意図がほぼ同一の質問が13組重複**している(下表)。これは「1問1カテゴリ」しか表現できないモデルを回避するためにデータ側でコピーが発生した跡であり、**モデル側を直すべき根拠**である。

## 決定事項

1. **`category: string` → `categories: string[]` に変更**する。1問が複数の案件種別に属せるようにする。
2. **タグはスラッシュ区切りの階層値**とし、言語軸と FW 軸を分けない(軸を2本に増やさない)。マッチはプレフィックス照合。
3. **`全案件共通` は特別扱いを廃止せず、タグ値の1つとして残す**(新概念を増やさない)。
4. **FW粒度は PHP系・JS系のみ導入**。SQL・テストは言語粒度のままとする。
5. **FW別問題の執筆は本設計のスコープ外**(後続タスク)。

### 決定4の根拠

FW言及の実測。`PHP/Laravel` 以外は専用問題が存在しない。

| FW | 言及数 | 専用問題 |
|---|---|---|
| Laravel | 9 | **5** (#6, #26, #150, #151, #152) |
| CakePHP / Symfony / その他PHP FW | 0 | 0 |
| React / Vue | 各2 | **0** (いずれも #16, #155 で他FWと併記) |
| jQuery | 3 | **0** (すべて他FWと併記) |

SQL 46問はほぼ方言非依存(Oracle/MySQL固有は #49 の1問のみ)、テスト47問も手動テスト前提でほぼ統一(自動化系は #115, #169 の2問のみ)。よって `SQL/Oracle` や `テスト/自動化` を今作っても中身がない。階層タグは後からタグ文字列を足すだけで拡張できるため、必要になった時点で追加する。

### 階層マッチにより「0問のFWタグ」は無害

`JS/React` を割り当てた受講者には、React専用問題が0問でも `JS` タグの共通問題が正しく表示される。したがってタグ体系を先に決め切ってよく、コストは執筆側にのみ発生する。

### 素の `PHP` / `JS` 割当の意味 — 「FW不問」であって「FWなし」ではない

`tagMatches` は対称なので、素の `PHP` を割り当てると `PHP/*` の問題もすべて入る。**素の `PHP` / `JS` は「FWが未確定・不問」を意味する**と定義する。「FWを使わない案件」は `PHP/スクラッチ` で表す。

現状は `PHP/Laravel` の5問しか無いので差は小さいが、後続タスクで FW別問題を20〜24問書くと、素の `JS` を割り当てた受講者に React・Vue・jQuery の問題が同時に出ることになる。**これは意図した挙動である。** FW が決まっている案件では素の `JS` ではなく `JS/React` のように FW まで指定すること。

### 受講者画面のチップは「排他的な分類」ではない

チップは受講者の**割当バケット**を表す。`tagMatches` が対称なので同じ問題が複数のチップに現れ、どのチップの組み合わせでも互いに素な部分集合にはならない (例: `["PHP","JS"]` の7問は `PHP` チップにも `JS` チップにも出る)。これは仕様であり、完全一致に変えると「`PHP/Laravel` だけ割り当てられた受講者のチップが5問しか返さないのに、絞り込み無しでは66問見える」というより悪い状態になる。

## 割当カテゴリ(初期リリース)

```
全案件共通                                    ← 割当対象外・常時表示
PHP  /  PHP/Laravel  /  PHP/CakePHP  /  PHP/スクラッチ
JS   /  JS/React     /  JS/Vue       /  JS/jQuery
SQL
テスト
```

講師は案件票どおり `PHP/Laravel` + `JS/jQuery` のように選ぶ。

`PHP/スクラッチ` は「FWなし・独自FW」案件を指す。Symfony / FuelPHP / CodeIgniter / Next.js / Nuxt / Angular は案件数が細るため初期には含めない(必要時にタグ文字列を追加するのみ、スキーマ変更不要)。

## データモデル

### packages/shared/src/interview/types.ts

```ts
export interface InterviewQuestion {
  no: number;
  /** 案件種別タグ (階層値)。 COMMON_CATEGORY を含む場合は全員へ表示 */
  categories: string[];
  subcategory: string;
  // 以降は変更なし
}

export const ASSIGNABLE_CATEGORIES = [
  "PHP", "PHP/Laravel", "PHP/CakePHP", "PHP/スクラッチ",
  "JS", "JS/React", "JS/Vue", "JS/jQuery",
  "SQL",
  "テスト",
] as const;

export const COMMON_CATEGORY = "全案件共通";
```

`isAssignableCategory()` は上記フラットリストに対する includes 判定のまま(実装変更なし、値のみ増える)。

### packages/shared/src/interview/filter.ts

双方向のプレフィックス照合。割当 `PHP/Laravel` は `PHP` の問題も拾い、割当 `PHP` は `PHP/Laravel` の問題も拾う。

```ts
import { COMMON_CATEGORY } from "./types.js";

/** タグ同士の階層照合。 "/" 区切りで上位・下位ともにマッチさせる。 */
export function tagMatches(tag: string, selected: string): boolean {
  return tag === selected || tag.startsWith(`${selected}/`) || selected.startsWith(`${tag}/`);
}

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

`tagMatches` を export し、web 側のカテゴリチップ絞り込みでも再利用する(照合ロジックを二重に持たない)。`COMMON_CATEGORY` の常時通過は `visibleQuestions` 側だけの責務とし、`tagMatches` には持たせない — チップで `PHP` を選んだときに共通問題まで出てしまうのを避けるため。

### apps/api/src/db/schema.ts

`interviewQuestions.category` (text) を廃止し、`categories` (json 配列) を追加する。

```ts
categories: json<string[]>("categories", []),
```

`interviewPrepAssignments.categories` は既に `json<string[]>` のため変更なし。

### マイグレーション

`bun run db:generate` で生成した SQL に、割当行の変換 UPDATE を追記する。

```sql
-- drizzle-kit 生成分: interview_questions.category を categories(json) へ置換

-- 既存の割当行 ["PHP/JS"] → ["PHP","JS"] (複数割当の行も replace で一括対応)
update interview_prep_assignments
set categories = replace(categories, '"PHP/JS"', '"PHP","JS"');
```

`interview_questions` 側は seed が全行 upsert / prune するため、既存行のデータ変換は不要。デプロイは `D1 migrate remote → D1 seed remote` の順で実行される([ci-cd.md](../../ci-cd.md))ため、この順序は保証されている。

### packages/shared/scripts/export-seed-sql.ts

`emitInterviewQuestions()` の insert / on conflict update を `category, subcategory` → `categories, subcategory` に変更し、値は `JSON.stringify(q.categories)` を文字列リテラルとして出力する。安定UUID は `interview-q:${tenantId}:${q.no}` のままで変更しない。

## 質問データの再タグ付け

`packages/shared/src/interview/questions.json` を書き換える。

### ルール

1. **言語専用**の問題 → その言語タグ1つ (`["PHP"]` / `["JS"]`)
2. **PHP・JS 両方に必要**な Web開発共通の問題 → `["PHP", "JS"]`
3. **案件種別を問わない**問題 → `["全案件共通"]`
4. **FW専用**の問題 → FWタグ1つ (`["PHP/Laravel"]`)
5. SQL / テストの問題は現行カテゴリを1要素配列にするのみ (`["SQL"]` / `["テスト"]`)

再タグ付けは **後述の重複統合を先に適用してから** 行う。以下の表の問題番号は統合前のものなので、統合対象の番号(#146, #148, #156, #157, #158, #163, #164, #166, #167, #170, #172, #187, #188)については統合後に残った側の問題へタグを付ける。

### `全案件共通` からの救出(15問)

| subcategory | 問No | 移動先 |
|---|---|---|
| バックエンド（PHP） | 148, 149, 153 | `["PHP"]` |
| バックエンド（PHP） | 150, 151, 152 | `["PHP/Laravel"]` |
| フロントエンド（JS） | 154, 155, 156 | `["JS"]` |
| フロントエンド（CSS） | 157, 158 | `["JS"]` |
| データベース（SQL） | 159, 160, 161, 162 | `["SQL"]` |

`PHP/JS` 側の FW専用問題 #6 (MVC の役割分担)・#26 (Eloquent と Raw SQL の使い分け) も `["PHP/Laravel"]` へ移す。

### 重複の統合(13組・13問削減)

質問意図がほぼ同一の以下13組を1問に統合する。

**残す側の判定**: `answer_template` / `deep1` / `deep2` / `deep3` / `ng` / `criteria` のうち非 null のフィールド数が多い方。同数なら `no` が小さい方(判定を一意にするため)。下表の「残す」列はこの基準で実測済みの結果である。削除される `no` は seed の prune で D1 から消える。`no` に欠番が生じるが、`no` は一意キーであり連番である必要はない。

**統合後のタグ**: 両者のタグの和集合を取り、**`全案件共通` が含まれる場合はそれ単独にする**。`全案件共通` 側の問題を `["PHP","JS"]` に狭めると、これまで全員に出ていた問題が SQL案件・テスト案件の受講者から消えるデグレになるため。ただし相手が救出対象15問(#148 / #156 / #157 / #158)の場合は、救出後のタグ(`PHP` または `JS`)を使う。

| 統合する組 | 残す | 内容 | 統合後のタグ |
|---|---|---|---|
| #5 / #148 | **#5** | PHPバージョンと FW 経験 | `["PHP"]` |
| #17 / #156 | **#17** | Ajax・非同期通信 | `["JS"]` |
| #20 / #157 | **#20** | レスポンシブ対応 | `["JS"]` |
| #22 / #158 | **#22** | クロスブラウザ対応 | `["JS"]` |
| #25 / #163 | **#25** | RESTful API 設計 | `["全案件共通"]` |
| #30 / #166 | **#166** | 詳細設計書の作成経験 | `["全案件共通"]` |
| #33 / #167 | **#167** | テスト仕様書・エビデンス取得 | `["全案件共通"]` |
| #34 / #172 | **#172** | コードレビュー | `["全案件共通"]` |
| #35 / #146 | **#35** | Git のブランチ運用・PR | `["全案件共通"]` |
| #37 / #164 | **#37** | Linux 基本コマンド | `["全案件共通"]` |
| #39 / #170 | **#39** | スタックした際の相談 | `["全案件共通"]` |
| #45 / #187 | **#45** | 逆質問: 参画初期の担当範囲 | `["全案件共通"]` |
| #46 / #188 | **#46** | 逆質問: コミュニケーションツール・レビュー体制 | `["全案件共通"]` |

削除される `no`: 30, 33, 34, 146, 148, 156, 157, 158, 163, 164, 170, 187, 188

**統合しない組**(観点が異なるため両方残す):

- #15 (ES6構文全般) / #154 (ライブラリなしのバニラJS)
- #43 (未知の技術のキャッチアップ) / #175 (日常の学習方法)
- #44 (バックエンド／フロントエンドどちらを伸ばすか) / #176 (キャリア全般)

結果、質問数は 188 → **175問**。

## UI

### 受講者 — InterviewPrep.tsx

- カテゴリチップ: `[...assigned, COMMON_CATEGORY]` のうち、該当問題が1問以上あるものを表示(現行ロジックと同じ)。判定を `rows.some((r) => r.category === c)` から `matches` ベースへ差し替える。割当は通常2〜3個のため、チップは `PHP/Laravel` のような階層値をそのまま表示して問題ない。
- チップによる絞り込み(`cat !== "ALL" && d.category !== cat`)も `matches(tag, [cat])` へ差し替える。
- カード見出しの `{d.category} ・ {d.subcategory}` → `{d.categories.join(" / ")} ・ {d.subcategory}` (一覧・ランダム出題の2箇所)。
- デモ(fixtures)モードの `setAssigned([...ASSIGNABLE_CATEGORIES])` は変更不要(全件表示のまま)。

### 講師 — InterviewPrepAssignments.tsx

現行は「受講者行 × カテゴリ列」のテーブルで、列がカテゴリ数ぶん存在する。タグが10個になると横に潰れるため、**カテゴリ列をやめて「割当」1列に集約**し、セル内にトグル可能なチップを `flex-wrap` で並べる。受講者行の構造・API 呼び出しは変更しない。

## API

[interview-prep.ts](../../../apps/api/src/routes/interview-prep.ts) の変更は `Q_SELECT` の `category: interviewQuestions.category` → `categories: interviewQuestions.categories` のみ。認可・割当の read/write ロジックは変更しない。

`PUT /api/interview-prep/assignments/:profileId` のバリデーションは `isAssignableCategory` のままで、新しい10値を受け付ける。

## テスト

- `filter.test.ts`: 既存の「全カテゴリが既知の値である」検証を `categories` 配列ベースへ更新。加えて階層マッチの単体テストを追加する。
  - 割当 `["PHP"]` → `["PHP"]` の問題と `["PHP/Laravel"]` の問題の両方が出る
  - 割当 `["PHP/Laravel"]` → `["PHP"]` の問題と `["PHP/Laravel"]` の問題の両方が出る
  - 割当 `["JS/React"]` → `["PHP"]` の問題は出ない
  - 割当 `[]` → `["全案件共通"]` の問題のみ出る
  - 割当 `["テスト"]` → `["PHP", "JS"]` の問題は出ない(課題①の回帰防止)
- `questions.json` の全問について `categories` が空でなく、全要素が `ASSIGNABLE_CATEGORIES` または `COMMON_CATEGORY` に含まれることを検証するテストを追加する。
- `bun run lint` / `bun run typecheck` / `bun run test` を通す。
- 手動確認: `db:migrate` → `db:seed` → `dev:api` + `dev` で、`seed-learner` に `PHP/Laravel` のみを割り当てた状態で JS専用問題が出ないこと、`seed-instructor` の割当画面でチップが折り返し表示されることを確認する。

## スコープ外(後続タスク)

FW別問題の執筆。現状 `PHP/Laravel` 以外は0問。

| タグ | 必要問題数(目安) |
|---|---|
| `PHP/CakePHP` | 4–5 |
| `PHP/スクラッチ` | 3 |
| `JS/React` | 5–6 |
| `JS/Vue` | 5–6 |
| `JS/jQuery` | 3–4 |

計 20–24問。本設計の実装だけでも「PHP と JS の分離」「`全案件共通` の汚染解消」「重複13組の統合」は即日有効になる。

### 移行期間に旧 category を生かし続ける仕組み

本 PR は `interview_questions.category` を残したまま `categories` を追加する expand リリース。デプロイ順 `migrate → seed → deploy:api → deploy:web` の各段でどうなるかを整理すると:

**原則: マイグレーションは既存データに一切触らない (純粋に追加のみ)。** 旧コードが読む値をマイグレーションで書き換えると、新 API が立つまでの間どこかが必ず壊れる。旧表現の解釈は新 API 側の `expandLegacyCategories()` が引き受ける。

| 窓 | 旧コードが困ること | 対策 |
|---|---|---|
| migrate 後 〜 deploy:api 前 | 旧 Worker の `Q_SELECT` が `category` を参照する。列を drop すると 500 | `DROP COLUMN` を行わない |
| migrate 後 〜 deploy:api 前 (読み取り) | 旧 Worker は `category` を完全一致で照合し、割当は `["PHP/JS"]` のまま。`category` を新タグへ書き換えると該当者に共通問題しか出ない | `category` を書き換えない。seed の dual-write も**分割前の旧カテゴリ**を書く (`["PHP/Laravel"]` も `["JS"]` も `'PHP/JS'`) |
| migrate 後 〜 deploy:api 前 (書き込み) | 割当を `["PHP","JS"]` へ書き換えると、旧 API の `isAssignableCategory` が旧リストで検証して 400。旧割当画面からの編集が一切できなくなる (seed か deploy:api が失敗すると解消しない) | 割当行を書き換えない。`["PHP/JS"]` のまま残す |
| deploy:api 後 〜 deploy:web 前 (読み取り) | 旧 web バンドル (開いたままのタブ含む) が `category` を読む | `Q_SELECT` が `category` も返す |
| deploy:api 後 〜 deploy:web 前 (書き込み) | 旧割当画面は `PHP/JS` のチェックボックスを送る。新 API が 400 で弾くと講師が保存できない | `expandLegacyCategories()` で `["PHP","JS"]` へ展開してから検証する |
| 恒常 | 新 API は `["PHP/JS"]` のまま残った割当行を読む | `expandLegacyCategories()` を読み取り側 (受講者の質問取得・講師の割当一覧) にも適用する |

この設計なら **seed または deploy:api が失敗しても、既存データは一切変わっていないため旧環境がそのまま動き続ける**。残った `["PHP/JS"]` 割当は、講師が新 UI で保存し直すか contract リリースのマイグレーションで解消する。

移行中に旧クライアントで唯一変わるのは、`全案件共通` から言語タグへ移した11問 (#148–158 系) が旧カテゴリ上は `PHP/JS` になるため、SQL / テストのみ割当の受講者には表示されなくなる点。これは移行後の正しい挙動が先に現れるだけで、deploy:web で解消する。

### 旧 category 列の削除 (contract リリース)

全環境が `categories` ベースのコードへ移行した後、別 PR で以下を行う contract リリースが必要:

- `apps/api/src/db/schema.ts` から `category` 列を削除
- `apps/api/drizzle/` に `category` 列を drop する新規マイグレーションを追加
- `packages/shared/scripts/export-seed-sql.ts` の `emitInterviewQuestions()` から `category` の dual-write を削除
- `apps/api/src/routes/interview-prep.ts` の `Q_SELECT` から `category` を削除
- `packages/shared/scripts/export-seed-sql.test.ts` の dual-write を検証する2つの `it` を削除
- `packages/shared/scripts/export-seed-sql.ts` の `LEGACY_CATEGORY_BY_TOP_TAG` / `topTag()` / `COMMON` を削除
- **残った旧割当を書き換えるマイグレーションを追加する** (expand リリースでは意図的に行っていない):
  ```sql
  UPDATE interview_prep_assignments SET categories = replace(categories, '"PHP/JS"', '"PHP","JS"');
  ```
- 上記の後に `packages/shared/src/interview/filter.ts` の `expandLegacyCategories()` と `LEGACY_PHP_JS` を削除 (`apps/api/src/routes/interview-prep.ts` の3箇所の呼び出しと `filter.test.ts` の `describe` も)
- 削除前に残存を確認すること (`select count(*) from interview_prep_assignments where categories like '%PHP/JS%'`)。**順序が重要** — 先に `expandLegacyCategories()` を消すと、書き換え前の行が `["PHP/JS"]` のまま解釈不能になる
