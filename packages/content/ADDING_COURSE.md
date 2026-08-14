# 教材の導入手順

**デフォルトは、別講座を `courses/<slug>/` として新しく作ることです。** TypeScript 入門は同じ形の 1 講座です。既存講座の中にトピックを足す場合だけ [B. 既存講座に足す](#b-既存講座に足す) を見てください。

執筆ルールの正本は [CLAUDE.md](CLAUDE.md) と [STYLE_GUIDE.md](STYLE_GUIDE.md) です。

## 配信の流れ

```text
packages/content/courses/<slug>/
        │
        ├─ course.json
        ├─ modules/**/slides.md / doc.md / practice.md
        │         └── seed (export-seed-sql) ──► D1: courses / sections / lessons / quizzes
        │
        └─ modules/**/assets/*.svg
                  └── upload-materials ──► R2
```

- 本文は `bun run db:seed`（本番は `db:seed:remote:content`）で D1 に入る
- 図解 SVG は `bun run --filter=@falcon/content upload`（本番は `upload:remote`）。デプロイには含まれない
- 受講者が見るには講師 / 管理者が enrollment する。本番 seed は Google ログインした本人を自動登録しない
- `practice.md` の確認クイズだけが LMS の quiz になる。ハンズオン本文は Assignment 化されていない

| ファイル | LMS |
| --- | --- |
| `course.json` | コース（タイトル・説明） |
| モジュールディレクトリ | セクション |
| トピックの `slides.md` | レッスン（slides） |
| `doc.md` | レッスン（text、まとめ） |
| `practice.md` の「確認クイズ」 | レッスン（quiz） |

---

## A. 新しい講座を作る（既定）

### 1. slug を決める

| 項目 | 例 | 使われる場所 |
| --- | --- | --- |
| ディレクトリ名 = slug | `python-basics` | D1 `courses.slug`、安定 UUID、R2 パス |
| 表示名 | Python 入門研修 | `course.json` の `title` |
| header | `Python入門研修` | 各 `slides.md` の front-matter |

slug は後から変えない。変えるとコース UUID が変わり、進捗が切れる。既存の `typescript-basics` と並べて置く。

### 2. ディレクトリを作る

```text
packages/content/courses/<slug>/
├── course.json
├── CURRICULUM.md          # 任意。構成の正本
└── modules/
    └── <モジュールID>/<レッスンID>/
        ├── <トピックID>/
        │   ├── slides.md
        │   └── assets/
        ├── doc.md
        └── practice.md
```

```bash
mkdir -p packages/content/courses/<slug>/modules
cp packages/content/templates/course.json packages/content/courses/<slug>/course.json
```

`course.json` を埋める。`modules` はディレクトリ名 → セクション表示名。未登録のモジュールはディレクトリ名のまま出る。

```json
{
  "title": "Python 入門研修",
  "category": "プログラミング",
  "color": "indigo",
  "description": "未経験からの Python 研修。",
  "header": "Python入門研修",
  "tenantId": "ses",
  "modules": {
    "m0-orientation": "M0. オリエンテーション"
  }
}
```

`color` は `indigo` / `green` / `amber` / `slate`。`tenantId` はいま seed が `ses` に載せる前提です。

### 3. カリキュラムを書いてから教材を置く

講座ごとの `CURRICULUM.md` にモジュール / レッスン / トピックを列す。

- トピック分割の判定は **takeaway が 1 文で書けること**
- 語彙台帳は **講座ごとに** 検査する。別講座の語は前提にならない
- トピック `id` はその講座の中で一意（別講座なら `0-1-1` を再利用してよい）

雛形:

```bash
cp packages/content/templates/topic-slides-template.md \
   packages/content/courses/<slug>/modules/<モジュール>/<レッスン>/<トピック>/slides.md
cp packages/content/templates/doc-template.md \
   packages/content/courses/<slug>/modules/<モジュール>/<レッスン>/doc.md
cp packages/content/templates/practice-template.md \
   packages/content/courses/<slug>/modules/<モジュール>/<レッスン>/practice.md
```

`slides.md` の front-matter は必須。`header` は `course.json` の講座名に合わせる。

```yaml
---
id: 0-1-1
title: 【トピックタイトル】
takeaway: "【覚えることを1文で】"
introduces: [新しい語]
requires: []
header: "【講座名】"
---
```

確認クイズは `## 確認クイズ` の下に、雛形どおり `### Q1.` / `- A.` / `<details>` / `**B** — 解説` で書く。書式が違うと seed が throw する。

図解は `.claude/skills/diagram-design/` に従い、正本は `assets/<名前>.html`、コミットするのは `.svg`。

### 3.5 コード演習を配線する（任意）

VS Code 拡張で解くコード演習は、`course.json` の `exercises` にレッスンキー（トピック id の先頭 2 節。`1-1-1` → `1-1`）で書く。id は `@falcon/shared` の `Assignment.id`。

```json
{
  "exercises": {
    "1-1": [{ "id": "S0-Sql-Ch00-04-select-columns", "title": "演習: 列を選んで取り出す" }]
  }
}
```

manifest がクイズの後ろに `type: "code"` のレッスン（`code-<AssignmentId>` 形式の安定 id）を生やし、seed が assignment 本体を D1 へ upsert する。対応するレッスンが無いキーはビルドで落ちる。SQL 入門（`courses/sql-basics/`）が実例。

### 4. 検査する

```bash
bun run --filter=@falcon/content check:ci
bun run --filter=@falcon/content materials -- courses/<slug>/modules
```

### 5. ローカル LMS に載せる

```bash
bun run db:seed
bun run --filter=@falcon/content upload    # 図解を足したとき
```

manifest が `courses/` を全部読むので、`course.json` を置いた講座は seed に載る。コードの COURSE_SLUG 固定は不要。ローカル seed は各講座に `seed-learner` を登録する。本番では受講者を LMS 上で割り当てる。

図解を本番 R2 に出すときは `upload:remote` を別途実行する。

### 6. ドキュメント

- このファイルと [CLAUDE.md](CLAUDE.md) の「現在の状態」
- リポジトリの `AGENTS.md`（seed されるコースの説明）

---

## B. 既存講座に足す

対象は `packages/content/courses/<slug>/modules/`（TypeScript 入門なら `typescript-basics`）。

1. その講座の `CURRICULUM.md` に追記する
2. レッスン / トピックディレクトリを作り、節 A と同じ雛形で書く
3. モジュールを新設したら `course.json` の `modules` に表示名を足す
4. `check:ci` → `db:seed` → 図解があれば `upload`

パスの例（TypeScript 入門）:

`packages/content/courses/typescript-basics/modules/m1-values/l1-variables/t2-const-and-let/slides.md`

---

## 確認チェックリスト

- [ ] `courses/<slug>/course.json` がある
- [ ] コース一覧に新講座と既存の TypeScript 入門の両方出る
- [ ] セクション順がディレクトリ順と一致する
- [ ] 各レッスンがスライド → まとめ → 確認クイズの順
- [ ] 図解があるトピックで画像が切れていない
- [ ] 確認クイズが解け、合格点が 80 点
- [ ] 講師ロールで受講者を新講座に登録できる
- [ ] CMS で作った別 ID のコースが消えていない

## やってはいけないこと

- 新講座のモジュールを `courses/typescript-basics/modules/` や、廃止した `packages/content/modules/` 直下へ置く
- `course.json` を書かずに modules だけ置く（seed が落ちる）
- 教材本文を CMS だけに書く（次の seed で消える）
- **同じ講座内** でトピック ID を使い回す
- 同じ講座内で同じトピック DIR 名 + 同じ SVG ファイル名を使う（R2 キーが衝突する）
- 生成物の `slides.pptx` / `*.diagram.png` / `dist/` をコミットする（`.svg` はコミットする）
- スライドや `doc.md` に原典名を書く
