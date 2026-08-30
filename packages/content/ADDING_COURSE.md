# 教材の導入手順

**デフォルトは、別講座を `courses/<slug>/` として新しく作ることです。** TypeScript 入門は同じ形の 1 講座です。既存講座の中にトピックを足す場合だけ [B. 既存講座に足す](#b-既存講座に足す) を見てください。

執筆ルールの正本は [CLAUDE.md](CLAUDE.md) と [STYLE_GUIDE.md](STYLE_GUIDE.md) です。
**そもそも何を教材にするか**（外部で見つけたテーマの適格性判定と、目標・範囲・規模・評価の決め方）は
[THEME_TO_COURSE.md](THEME_TO_COURSE.md) にあります。このファイルは、それが決まった後の手順です。

## 配信の流れ

```text
packages/content/courses/<slug>/
        │
        ├─ course.json
        ├─ modules/**/slides.md / doc.md / practice.md
        │         └── seed (export-seed-sql) ──► D1: courses / sections / lessons / quizzes
        │
        ├─ thumbnail.webp                （任意。一覧カードのサムネイル）
        │         └── upload-materials ──► R2 ＋ seed ──► D1: courses.thumbnail_path
        │
        ├─ icon.svg                      （任意。スキルツリーの星に出す単色アイコン）
        │         └── upload-materials ──► R2 ＋ seed ──► D1: stages.icon_path
        │
        └─ modules/**/assets/*.svg
                  └── upload-materials ──► R2
```

- 本文は `bun run db:seed`（本番は `db:seed:remote:content`）で D1 に入る
- 図解 SVG とサムネイルは `main` への push で自動反映（デプロイが seed の前に R2 へ流す）
- ローカルに入れるときだけ `bun run --filter=@falcon/content upload` を手で叩く
- 受講者が見るには講師 / 管理者が enrollment する。本番 seed は Google ログインした本人を自動登録しない
- `practice.md` の確認クイズだけが LMS の quiz になる。ハンズオン本文は Assignment 化されていない

| ファイル | LMS |
| --- | --- |
| `course.json` | コース（タイトル・説明） |
| `thumbnail.webp` / `.png` / `.jpg` | 一覧カードのサムネイル（任意） |
| `icon.svg` | スキルツリーの星に出す講座アイコン（任意） |
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
| 表示名 | Python 入門 | `course.json` の `title` |
| header | `Python入門` | 各 `slides.md` の front-matter |

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
  "title": "Python 入門",
  "category": "プログラミング",
  "color": "indigo",
  "description": "未経験からの Python 研修。",
  "header": "Python入門",
  "tenantId": "ses",
  "modules": {
    "m0-orientation": "M0. オリエンテーション"
  }
}
```

`color` は `indigo` / `green` / `amber` / `slate`。`tenantId` はいま seed が `ses` に載せる前提です。

#### スキルツリー用の任意フィールド

ホームのステージマップ（スキルツリー）は、講座をスキルとして並べます。スキルの解放と見え方は `course.json` の任意フィールドが決めます。どこまで見えるか（0〜1 歩 = 名前と解放条件／2 歩 = ぼかした名前だけ／3 歩 = 線だけ／4 歩以上 = 出さない）は `docs/superpowers/specs/2026-08-30-skill-tree-fog-display-design.md`。値は manifest → seed 経由で D1 `stages.prerequisites` / `parent` / `can_do` / `theme` に入り、評価器（`@falcon/shared/skill-map`）が読みます。

| フィールド | 型 | 何になるか |
| --- | --- | --- |
| `prerequisites` | slug の配列 | **ハードロック（解放条件）**。挙げた講座を全部クリアするまで、この講座は開けない。見た目の複製 (`appearances`) で扇ごとに前提を分けるときは和集合を書き、組は `appearancePrerequisites` へ |
| `parent` | slug | **線を引く親**。`prerequisites` のうちの 1 つ。ツリーの線・配置・霧の距離はこの 1 本で決まる（1 つの星に線は 1 本しか入らない）。前提が 2 つ以上なら**必須**、1 つなら省略可（その 1 つが親）、0 なら書けない。線の無い前提も解放条件としては効き、ロック中の星の「解放条件」に名前で出る |
| `canDo` | 1 文 | ホバーの到達説明「このスキルを身につけた人は◯◯ができる」 |
| `theme` | 短い語 | まだ見えていないスキルに、タイトルの代わりに見せるテーマ名。手前の星の「解放条件」に、この講座名の代わりとして並ぶのもこの語 |

- `prerequisites` に書けるのは、その講座の `CURRICULUM.md` に**前提講座として散文で明記されているもの**だけです。「推奨」「任意」「想定する受講順」はゲートではないので書きません。書いた瞬間に、前提を終えていない受講者は講座を開けなくなります
- `parent` は「この講座はどの講座の続きとして描くか」です。前提を後から足しても線は動きません（並び順に意味を持たせない）。複製 (`appearances`) を持つ講座は `parent` を書けず、`appearancePrerequisites.<扇>` にちょうど 1 つ書いた slug がその扇の親になります
- **1 つの星から出る枝は最大 2 本**です（スキルツリーの見た目）。3 本以上になるなら直列化する。島（資格 / AI）への橋は線を引かないのでこの上限に入れない
- 存在しない slug・自己参照・循環・`parent` の不整合は `bun run content:check`（manifest ビルド）で落ちます
- `canDo` は「〜できる」で終える 1 文。誇張しない（資格講座で合格を保証しない）
- `theme` はカテゴリ単位でそろえます（講座ごとに凝った名前を付けない）。まだ見えない範囲では同じテーマのスキルが同じ名前で並ぶのが正です。省略するとまだ見えない範囲では `？？？` と表示されます（名前の無いスキルにはしない）
- 前提に挙げられた講座は、依存側が公開中のあいだ **非公開にも削除もできません**（CMS が 409 で止めます）。順序を変えるときは依存側の `prerequisites` を先に外します
- 全部省略できます。省略した講座は「前提なし・到達説明なし・テーマなし」として扱われます

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
bun run --filter=@falcon/content upload    # 図解・サムネイルをローカル R2 に入れる
```

manifest が `courses/` を全部読むので、`course.json` を置いた講座は seed に載る。コードの COURSE_SLUG 固定は不要。ローカル seed は各講座に `seed-learner` を登録する。本番では受講者を LMS 上で割り当てる。

本番 R2 への反映は `main` への push だけでよい（`.github/workflows/deploy.yml` の「Upload course materials」が図解・サムネイルの両方を seed の前に流す）。手元から本番へ直接出したいときだけ `upload:remote`。

### 6. サムネイル（任意）

講座ディレクトリ直下に `thumbnail.webp`（または `.png` / `.jpg`）を置くと、受講者・講師・管理の一覧カードがその画像になる。置かなければ `course.json` の `color` のストライプ表示のまま。

```text
packages/content/courses/<slug>/thumbnail.webp
```

既存 20 講座のサムネイルは `scripts/build_thumbnails.py` が生成している。**新しい講座もここに 1 件足して生成する**（画像を手で描かない）。20 枚が 1 つのシリーズに見えることが一覧カードの前提で、レイアウト・書体・トークンはスクリプトが共有している。

```bash
pip install pillow playwright && playwright install chromium   # 初回だけ
python packages/content/scripts/build_thumbnails.py <slug>     # 引数なしで全講座
```

- 講座ごとに書くのは `SPECS` の 4 つ（`title` / `title_size` / `subtitle` / `motif`）だけ。eyebrow は `course.json` の `category`、配色は `color` から引く
- モチーフは講座の中身を 1 つだけ図にする（SQL なら「表から行を取り出す」、科目Aなら「9 分野を 1 つずつ」）。色・線幅・角丸は図解 skin（`.claude/skills/diagram-design/references/style-guide.md`）のトークンに合わせる
- **外部ロゴは使わない。** 技術名は普通名称としての文字表記だけにして、公式ロゴ・ロゴフォント・シンボルマークは持ち込まない。TypeScript（Microsoft）・Python（PSF）・情報処理技術者試験（IPA）などのロゴは、加工や商用利用に許諾が要るうえ、公認教材だという誤認を生む
- 左カラムの文字がモチーフに重なるとスクリプトが落ちる。長いタイトルは `title_size` を下げる
- 書体は Google Fonts から**使う文字だけ**を切り出して埋め込むので、生成時だけ通信する（描画はオフライン）

| 項目 | 規格 |
| --- | --- |
| 縦横比 | 16:9（±2% まで許容） |
| 推奨サイズ | 1600×900 |
| 最低幅 | 800px |
| 上限容量 | 400KB |
| 形式 | `.webp`（推奨） / `.png` / `.jpg` |

- 規格外は `bun run content:check` が落とす（`scripts/check_thumbnails.mjs`）
- 別名にしたいときは `course.json` の `thumbnail` に講座ディレクトリからの相対パスを書く
- R2 のキーは内容ハッシュ入り（`tenant/<tenantId>/courses/<slug>/thumbnail-<hash>.webp`）。差し替えれば URL ごと変わるので、CDN / ブラウザのキャッシュに阻まれない
- 古い世代のオブジェクトは `bun run r2:orphans` の棚卸しに出る（参照されるのは最新の 1 件だけ）
- 反映は `main` への push だけでよい。デプロイが R2 へ流してから seed が D1 を更新する

#### スキルツリーのアイコン（任意）

講座ディレクトリ直下に `icon.svg` を置くと、スキルツリーの星（解放済み・進行中・クリア）の中がその講座のアイコンになる。置かなければ状態グリフ（★/▶/✨）のまま。ロックの星は 🔒 のまま、霧の星にはサーバが `has_icon` を出さず一括アイコン API にも載せない（アイコンの形は講座の正体を語るため、slug と同じ秘匿ルール）。

```text
packages/content/courses/<slug>/icon.svg
```

- **単色シルエットで描く。** 画面は公開 R2 を `<img>` にせず、認可付き API から取った SVG を CSS `mask-image` + `currentColor` で塗る。SVG 側の色は捨てられ**アルファだけ**が使われる。色をハードコードしない（`fill="currentColor"` / `stroke="currentColor"`）。ライト / ダークは星の文字色差し替えだけで追従する
- **白抜きは効かない。** 黒丸の中に白いチェックを描いても、マスクでは塗りつぶしの円 1 つになる。中の記号は輪郭線で描くか、`fill-rule="evenodd"` で穴を開ける
- `viewBox="0 0 24 24"`、線幅 1.5〜2.2。星の中で 16px（中心の星は 22px）に縮むので、図形は 1〜3 個に絞る
- モチーフはサムネイル（`build_thumbnails.py` の `motif_*`）の「核」を 1 図形に単純化したもの（Git = ブランチ合流、SQL = 行が抜き出る表、科目A = 3×3 の格子）。サムネイルと同じ発想を継承してシリーズ感を保つ。外部ロゴは使わない
- R2 のキーはサムネイルと同じく内容ハッシュ入り（`tenant/<tenantId>/courses/<slug>/icon-<hash>.svg`）で、`upload-materials.ts` がサムネイルと一緒に流す。反映は `main` への push だけでよい

### 7. ドキュメント

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
