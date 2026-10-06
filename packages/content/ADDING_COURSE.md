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
- ローカルに入れるときだけ `bun run --filter=@stella/content upload` を手で叩く
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

## 新カリキュラムの format 2

参照元の作成・講師承認・旧形式への段階的な適用は [SOURCE_GUIDE.md](SOURCE_GUIDE.md) を参照してください。共通台帳は `sources/registry.json`、使用箇所は単元の `references.json` です。

単元は **モジュール** に対応します。`course.json` に `"format": 2`・`plannedHours`（正の時間数）・`environment`（環境台帳の ID）を書きます。見本は `courses/dev-env-basics/` です。format を省略した講座は従来の読み込み・seed・PDFのままです。

```text
modules/<unit>/
  unit.json              # plannedHours、skills.uses / assesses、reuses（学習フォルダー内の成果物パス）
  references.json        # sourceRefs と教材の使用箇所・環境・レビュー状態・確認した版の内容指紋
  <lesson>/
    <topic>/slides.md    # 従来どおり1 Takeaway、語彙台帳、4〜6枚
    doc.md              # 公開する解説
    knowledge.md        # アプリで解く知識問題
  tasks/<task>/
    task.json
    README.md           # 課題文と参照リンク
    starter/            # 内容を作業フォルダー直下へ配布
    tests/              # tests/ として配布
    fixed-start/        # 任意。前の実装が壊れていて進めない受講者向けの「固定した開始点」
    hints.md
    private/
      solution/         # starter を上書きした状態で手元のランナーに合格する解答例
      explanation.md
      review.md
      variants/         # 予備の類題 (1 問 1 フォルダー)。空の場合は .gitkeep を置く
        <variant>/      # 中身は課題と同じ形 (task.json・README.md・hints.md・starter/・tests/・private/)
```

`unit.json` は `{"plannedHours": 3, "skills": {"uses": [], "assesses": ["html-document"]}, "reuses": []}` の形です。スキルとパターンは `packages/content/skills.json`・`patterns.json` に `{ id, title }` で登録します。実行環境は `environments/<id>.json` に `id`・`version`・`requirements` を書きます。requirements は拡張の環境検査と同じ Node.js・npm・Git の版指定 (`min`・`maxMajor`・`majors`) です。Node.js は奇数版 (23 など) に対応しない道具が多いので、`"majors": [22, 24]` のように使える版を並べます。OS・ブラウザー・ライブラリの版もこの台帳に記録します。版を更新する際は ID を新しくし、過去の環境を残してください。

`task.json` の必須項目は `id`（`<講座>/<単元>/<課題>`）・`title`・`kind`・`pattern`・`skills`・`runner`・`environment`・`submit`・`review`・`support`・`sources`・`estimatedMinutes` です。

- `submit`: `files`（相対glob）、`explanation`、`debuggingRecord`。自力・統合・確認は説明必須、修正は修正記録必須です。
- `review`: `rules` に適用するコーディング規則 `{ id, required }`、`rubric` に課題固有の項目 `{ id, criterion, required }`、`escalateWhen` に人に回す追加条件 (`optional-unmet`・`major-finding`) を書きます。必須の項目は `rules` と `rubric` を合わせて1つ以上要ります。`criterion` は「関数名が戻り値の意味を表している」のようにコードを見て当否を決められる文にし、「1〜5で採点」のような尺度や問いにしません。
- コーディング規則の正本は [coding-rules.md](coding-rules.md) (プログラム共通) と `courses/<slug>/coding-rules.md` (講座の追加分) です。課題が指せるのは共通の規則と自分の講座の規則だけで、導入より前の課題では必須にできません。後の講座でも使う規則は共通の規則に書きます。書式は coding-rules.md の冒頭を参照してください。
- `support`: `hintLevels`（ヒントの段数）と `solutionUnlock`（取り組み中に解答例を開ける条件）。解答を「隠す」より「出す順番」を決める項目で、種別ごとに書ける値が決まっています（07 §8。判定は `@stella/shared/tasks/help` の `TASK_HELP_POLICIES`）。

  | 種別 | `solutionUnlock` | ヒント | 合格後 |
  | --- | --- | --- | --- |
  | 基礎・接続 | `after-hints`（ヒントを最後まで開いた次の段で解答例）か `passed` | 開ける | 解答例と解説を自動で開く |
  | 自力・修正 | `attempts-or-passed`（決まった回数の挑戦のあとか合格後）か `passed` | 開ける | 解答例と解説（別解・選び方の理由） |
  | 統合 | `passed` | 0段（取り組み中は仕様・状態見本・API 契約だけ） | 解答例（とレビューの所見） |
  | 確認A・B | `passed` | 0段（公式ドキュメントと文法の参照だけ） | 確認Aだけ解答例。確認Bは出さない |

  `attempts` は `attempts-or-passed` の回数で、省略すると5回（`SOLUTION_UNLOCK_ATTEMPTS`）です。1回の挑戦は、手元の確認で失敗した1回（環境のエラーは数えない）と、提出1回（相談を含む）です。ほかの条件には書けません。
- `hints.md`: ヒントの段を `## ヒント<番号> <題>` の見出しで分けます。番号は1から順に振り、段の数を `support.hintLevels` とそろえます。段の順は「方針 → 手がかりのコード」で、解答例は書きません（`private/solution/` が最後の段として出ます）。段の中では `###` 以下の見出しとコードブロックを使えます。最初の見出しより前に本文は置けません。ヒント0段の課題は空（かコメントだけ）にします。題は段を開いたときに見出しとして出ます（開く前は「ヒント2」のように番号だけ）。`content:check` が形と段の数を検査します。

  ````markdown
  ## ヒント1 方針

  見出しは `h1` 要素の中の文字です。…

  ## ヒント2 手がかりのコード

  ```html
  <h1>（ここに指定の見出しを書きます）</h1>
  ```
  ````

- `protected`・`checks`・`static` は拡張用manifestと同じ形です。`.stella/task.json` は生成時に環境要件を解決し、実行に必要な項目だけを取り出します。任意コマンドは定義できません。
- CI と公開の課題 (`"runner": "ci-deploy"`) は、確かめる GitHub Actions のワークフローを `"ci": { "workflow": ".github/workflows/deploy.yml" }` と書きます (必須。ほかの runner には書けません)。パスは受講者のリポジトリの一番上からで、`.github/workflows/` の下の `.yml`・`.yaml` に限り、`submit.files` か `protected` に当たるようにします (提出してレビューで読むか、配布して改変を照合する)。受講者は自分の公開リポジトリに push し、Actions の実行が成功したら拡張に実行の URL と公開先の URL を入力して提出します。提出を受けた API が GitHub の公開 API で、実行が成功で終わったこと・手元と同じコミットの実行であること・このワークフローの実行であることを確かめ、確かめられない・食い違う提出は講師の確認待ちにします (07 §5.5)。課題文には、公開リポジトリにすること・課題フォルダーをリポジトリの一番上にすること・Pages などの公開の設定を書きます。ひな形は `templates/runners/ci-deploy/` です。`content:check` は CI を動かさず、解答例を重ねた配布ファイルにワークフローがそろうことだけを確かめます。

知識問題は各設問の見出しを `### Q1. 設問文` とし、直後に `<!-- kind: single; skills: html-document -->` を書きます。種別は `single` / `multiple` / `boolean`、スキルはカンマ区切りです。選択肢と `<details>` の解答は旧クイズと同じ形で、複数選択の正解は `**A, C** — 解説` と書きます。正誤は `A. 正しい` / `B. 誤り` の2択です。新形式のSRSカードはこの知識問題だけから作り、設問のスキルIDを返します。

`bun run content:check` はスキーマ・台帳の参照・配布ファイルを検査し、解答例を一時フォルダーに組み立てて **拡張と同じ固定ランナー** で実行します。Node系の課題は starter に package.json・package-lock.json と固定版の道具を含めてください。runner ごとのひな形 (道具の版・lockfile・テストと lint・整形の設定・`task.json` に写す項目) は `templates/runners/<runner>/` にあり、使い方は同じフォルダーの README です。`private/`・リンクファイル・依存パッケージの生成物は配布できません。

課題は D1 の `tasks`、非公開の素材は `task_private` (最新) と素材の内容ハッシュごとの `task_private_versions` (追記だけ)、状態は `task_progress`、コーディング規則は `coding_rules` に投入します。解答例・`private/review.md` (観点とよくある違反)・規則・ルーブリックは AI の一次レビューの入力になり、AI は提出を受け付けた時点の素材の版を読みます。公開APIは一覧の必要項目と許可した bundle だけを返します。ヒント・解答例 (`private/solution/`)・解説 (`private/explanation.md`) は、解放条件を満たした受講者が拡張の課題パネルで開いたときだけ `/api/tasks/help` が返し、開いたことを記録します (提出は「支援付き」になります。罰ではなく記録です)。`private/review.md` はどの条件でも受講者へ返しません。予備の類題 (`private/variants/`) は親の課題の素材に入れず、類題ごとに別の課題として入り、出題した受講者にだけ配ります (下の「予備の類題」)。非公開の素材 (`private/` と `hints.md`) は合わせて配布一式と同じ大きさまでです (D1 の 1 行に収めるため)。

LMS は7状態と「VS Code で開く」を表示します。課題文のレッスンにも同じボタンが出ます (seed が `tasks.lesson_id` で結ぶ)。拡張は学習フォルダー (既定は `~/web-training`。受講者が初回に選ぶ) の `<講座>/<単元>/<課題>/` へ準備し、既存のファイルを上書きしません。

`fixed-start/` は任意です。前の課題で作った成果物を使う課題で、その実装が壊れていて先へ進めない受講者に配る一式を置きます。starter の代わりに作業フォルダー直下へ置かれ、tests・README・`.stella/task.json` は通常の配布と同じです。`protected` に当たるファイルは変えられず、この課題の解答例 (`private/solution/`) と同じファイルは置けません。確認A・Bには置けません。課題のフォルダー名を `-fixed-start` で終わらせることもできません (学習フォルダーで開始点のフォルダー名に使うため)。`content:check` は開始点に解答例を重ねて手元のランナーに通ることも確かめます。通常の配布一式と開始点は、それぞれ 1 ファイル 1MiB・合計 1.2MB までです (D1 の 1 行に収めるため。`TASK_BUNDLE_LIMITS`)。開始点を置く課題は `task.json` に `"fixedStart": { "covers": ["<講座>/<単元>/<課題>"] }` を書き、開始点が動く実装を含む前の課題を示します。順序から推測しないので必須で、同じ講座でこの課題より前の課題だけを書けます (自分自身・重複は不可。開始点の無い課題には書けません)。開始点は bundle に混ぜず D1 `task_fixed_starts` に入り、受講者が拡張のコマンドで求めたときだけ API が返して、使ったことを `covers` と一緒に記録します (その課題と `covers` の課題の、受け取ったあとの提出は「支援付き」になります。開始点を写せば前の課題も出せるためで、受け取る前の提出は変わりません)。手元の合格は修了の判定と分けて記録します。課題文は資料用のテキストレッスンにも載ります。format 2 の配布PDFは課題文・単元の参照元・公開解説のみで、知識問題・解答編・スライドPDFは生成しません。旧形式のPDFは変わりません。

WindowsとmacOSで手順が違うところは、`doc.md` と課題文の `README.md` に OS 別のブロック（`:::os windows` / `:::os macos` … `:::`）を書きます。書き方と画像の置き方（`<名前>.windows.png` / `<名前>.macos.png`）は [STYLE_GUIDE.md の OS 別の手順](STYLE_GUIDE.md#os別の手順osのルール) です。Web と VS Code は OS のタブで出し、既定は受講者の OS です。OS の差が大きい講座は `course.json` に `"pdfByOs": true` を書くと、OS 別のブロックを含むまとめ・課題文の配布PDFを Windows 版と macOS 版に分けます（資料タブに「… (Windows).pdf」「… (macOS).pdf」が並びます）。書かない講座は1つのPDFに両方の OS を見出し付きで並べます。`dev-env-basics` は分けます。

### 予備の類題 (コードの復習)

コードの復習は、同じ問題を解き直させず、同じ実装パターンの別の問題 (類題) を時間を空けて出します (07 §7.2・§7.3)。パターンは `patterns.json` に `{ id, title }` で登録し、単元の基礎課題 (値・条件・境界・組合せ・利用場面を変えた同じパターンの問題群、03 §2) の `task.json` に同じ `pattern` を書きます。台帳に無いパターンと台帳の ID の重複は `content:check` が落とします。

類題は、親にする課題の `private/variants/<類題>/` に 1 問 1 フォルダーで置きます。リポジトリは公開ですが、アプリは出題した受講者にだけ配ります。

```text
tasks/q01-first-page/private/variants/
  v01-profile-page/
    task.json           # id は "<講座>/<単元>/v01-profile-page"。pattern は親と同じ
    README.md           # 類題の課題文
    hints.md            # ヒント (段の数は support.hintLevels とそろえる。0 段なら空)
    starter/
    tests/
    private/
      solution/         # starter に重ねて手元のランナーに合格する解答例
      explanation.md
      review.md
```

- `task.json` は課題と同じ項目を書きます。`id` は `<講座>/<単元>/<類題のフォルダー名>` で、単元の課題・ほかの類題と同じ名前は使えません (学習フォルダーの `<講座>/<単元>/<類題>/` に置かれるため)。`pattern` は親の課題と同じにします
- `kind` で使い道が決まります。基礎・接続 (`basic` / `connection`) は**補習の小問題** (支援付きでしか解けなかったパターンに、翌日から 1 日 1 問・3 問出す)、自力・修正・確認A・確認B (`independent` / `debug` / `assessment-a` / `assessment-b`) は**時間を空けた類題と未見の問題** (約 3 日後・約 1 週間後・約 3 週間後、補習のあとの未見の問題) に使います。約 1 週間後は確認Bの代わりなので `assessment-b` を、未見の問題は `assessment-a` を先に選びます。統合 (`integration`) は類題にできません
- ヒント・解答例・解説の解放の条件は、類題の `kind` の方針 (上の表) に従います。説明欄・修正記録の要否も課題と同じです
- 固定した開始点 (`fixed-start/`)・`fixedStart`・入れ子の `private/variants/` は置けません。課題文に教材内の画像は使えません。参照元は親の課題文の参照元が課題文の末尾に付きます (`sources` は単元の `references.json` にある ID を書きます)
- `private/variants/` の直下には類題のフォルダーと `.gitkeep` だけを置けます
- `content:check` は類題も課題と同じく検査し、解答例を拡張と同じ固定ランナーで実行します。類題のパターンが親と違う・`kind` が使えない・必須のファイルが無い・ID が重複している類題は落とします
- 類題は単元の内容指紋 (`references.json` の `contentHash`) に含まれます。類題を足す・直したら、課題を直したときと同じく `unitId` の版を上げ、参照元を確かめ直してから `contentHash` を更新します (`bun run --filter=@stella/content hash:unit -- <講座>/<単元>`)
- seed は類題を課題 (`tasks`) として入れ、`tasks.variant_of` に親の課題 ID を書きます。課題文のレッスンは作らず、講座の課題一覧・学習ペース・修了の判定には数えません。教材から消した類題は、出題中でも取り下げて別の類題を出し直します
- 在庫が尽きたパターンは、講師・管理者が `GET /api/variant-reviews/stock` で見られます (在庫の数と待っている受講者)。補習の小問題は 3 問ずつ消費されるので、多めに置いてください

### ログインなしで読める単元

VS Code を入れる前に読む単元 (`dev-env-basics` の U00〜U01) は、`unit.json` に `"public": true` を書くと、ログインなしの Web (`/start`) で読めるようになります。単元ごとに付け、レッスンごとには付けません (U00〜U01 は単元全体が導入前に読む内容のため)。

```json
{ "plannedHours": 1, "skills": { "uses": [], "assesses": [] }, "reuses": [], "public": true }
```

- 公開されるのは、その単元のスライドとまとめ (`doc.md`) だけです。知識問題 (`knowledge.md`) はログイン後に解きます。図解は公開の R2 から読めるので、未ログインでも出ます
- 課題 (`tasks/`) は置けません。課題の配布と提出はログイン後の拡張が行うためです。課題の無い単元は `tasks/` を置かなくて構いません
- 置けるのは、前提 (`prerequisites`) が無く、`audience` が `catalog` の講座だけです (いまは `dev-env-basics` だけ)。前提のある講座の本文は、スキルツリーの霧やロックの向こうにあるので公開しません
- 違反は `bun run content:check` が落とします。`"public"` は `true` / `false` だけを受け付けます
- 印は seed が D1 `lessons.public` に書き、公開 API (`GET /api/public/units`・`GET /api/public/lessons/:id`) だけが読みます。外せば次の seed で公開が止まります。`unit.json` は単元の内容指紋 (`references.json` の `contentHash`) に含まれないので、印を付け外ししても指紋は変わりません
- 公開するテナントは API の `PUBLIC_CONTENT_TENANT_ID` (`apps/api/wrangler.toml` の `[vars]`、`ses`) です

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

ホームのステージマップ（スキルツリー）は、講座をスキルとして並べます。スキルの解放と見え方は `course.json` の任意フィールドが決めます。どこまで見えるか（0〜1 歩 = 名前と解放条件／2 歩 = ぼかした名前だけ／3 歩 = 線だけ／4 歩以上 = 出さない）。値は manifest → seed 経由で D1 `stages.prerequisites` / `parent` / `can_do` / `theme` に入り、評価器（`@stella/shared/skill-map`）が読みます。

| フィールド | 型 | 何になるか |
| --- | --- | --- |
| `prerequisites` | slug の配列 | **ハードロック（解放条件）**。挙げた講座を全部クリアするまで、この講座は開けない。見た目の複製 (`appearances`) で扇ごとに前提を分けるときは和集合を書き、組は `appearancePrerequisites` へ |
| `parent` | slug | **線を引く親**。`prerequisites` のうちの 1 つ。ツリーの線・配置・霧の距離はこの 1 本で決まる（1 つの星に線は 1 本しか入らない）。前提が 2 つ以上なら**必須**、1 つなら省略可（その 1 つが親）、0 なら書けない。線の無い前提も解放条件としては効き、ロック中の星の「解放条件」に名前で出る |
| `canDo` | 1 文 | ホバーの到達説明「このスキルを身につけた人は◯◯ができる」 |
| `theme` | 短い語 | まだ見えていないスキルに、タイトルの代わりに見せるテーマ名。手前の星の「解放条件」に、この講座名の代わりとして並ぶのもこの語 |
| `audience` | `"catalog"` / `"granted"` | スキルツリーの掲載範囲。省略 = `catalog`（全受講者）。`granted` = 講師・管理者が「専用教材」画面で割り当てた受講者だけに星が出る（親は catalog 講座を 1 つ以上必須） |

- `prerequisites` に書けるのは、その講座の `CURRICULUM.md` に**前提講座として散文で明記されているもの**だけです。「推奨」「任意」「想定する受講順」はゲートではないので書きません。書いた瞬間に、前提を終えていない受講者は講座を開けなくなります
- `parent` は「この講座はどの講座の続きとして描くか」です。前提を後から足しても線は動きません（並び順に意味を持たせない）。複製 (`appearances`) を持つ講座は `parent` を書けず、`appearancePrerequisites.<扇>` にちょうど 1 つ書いた slug がその扇の親になります
- **1 つの星から出る枝は最大 2 本**です（スキルツリーの見た目）。3 本以上になるなら直列化する。島（資格 / AI）への橋は線を引かないのでこの上限に入れない
- 存在しない slug・自己参照・循環・`parent` の不整合は `bun run content:check`（manifest ビルド）で落ちます
- `canDo` は「〜できる」で終える 1 文。誇張しない（資格講座で合格を保証しない）
- `theme` はカテゴリ単位でそろえます（講座ごとに凝った名前を付けない）。まだ見えない範囲では同じテーマのスキルが同じ名前で並ぶのが正です。省略するとまだ見えない範囲では `？？？` と表示されます（名前の無いスキルにはしない）
- 前提に挙げられた講座は、依存側が公開中のあいだ **非公開にも削除もできません**（CMS が 409 で止めます）。順序を変えるときは依存側の `prerequisites` を先に外します
- 全部省略できます。省略した講座は「前提なし・到達説明なし・テーマなし・catalog 掲載」として扱われます
- **`audience: granted`** の講座は seed 後も全員のツリーには出ません。講師 / 管理者の「専用教材」で受講者を選んで初めて、その人のスキルツリーに親の子として現れます。受講開始は従来どおり自己開始です

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

VS Code 拡張で解くコード演習は、`course.json` の `exercises` にレッスンキー（トピック id の先頭 2 節。`1-1-1` → `1-1`）で書く。id は `@stella/shared` の `Assignment.id`。

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
bun run --filter=@stella/content check:ci
bun run --filter=@stella/content materials -- courses/<slug>/modules
```

### 5. ローカル LMS に載せる

```bash
bun run db:seed
bun run --filter=@stella/content upload    # 図解・OS 別の画像・サムネイルをローカル R2 に入れる
```

manifest が `courses/` を全部読むので、`course.json` を置いた講座は seed に載る。コードの COURSE_SLUG 固定は不要。ローカル seed は各講座に `seed-learner` を登録する。本番では受講者を LMS 上で割り当てる。

本番 R2 への反映は `main` への push だけでよい（`.github/workflows/deploy.yml` の「Upload course materials」が図解・サムネイルの両方を seed の前に流す）。手元から本番へ直接出したいときだけ `upload:remote`。

### 6. サムネイル（任意）

講座ディレクトリ直下に `thumbnail.webp`（または `.png` / `.jpg`）を置くと、受講者・講師・管理の一覧カードがその画像になる。置かなければ `course.json` の `color` のストライプ表示のまま。

```text
packages/content/courses/<slug>/thumbnail.webp
```

既存 21 講座のサムネイルは `scripts/build_thumbnails.py` が生成している。**新しい講座もここに 1 件足して生成する**（画像を手で描かない）。21 枚が 1 つのシリーズに見えることが一覧カードの前提で、レイアウト・書体・トークンはスクリプトが共有している。

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
