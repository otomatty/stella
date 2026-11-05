---
name: stella-course
description: "STELLA の講座・課題・知識問題を作るスキル。format 2 の講座を新しく書く、単元や課題を足す・直す、既存の研修教材 (Markdown の問題集、PDF、コード) を STELLA の課題に移す・分割する、課題 (task.json、README、starter、tests、解答例、誤答、ヒント、類題) を足す・直す、C# の課題を作る、特定の受講者向けの Extra 講座を作る、外部の非公開リポジトリで STELLA の教材を書く、といった依頼で使う。本棚に入れる本の zip は stella-book を使う。このスキルは講座と課題の方。"
---

# STELLA の講座と課題 (format 2) を作る

講座、単元、課題、知識問題を作る、直す、既存の研修教材から移すときの手順です。
形式の細かい規則は STELLA の文書が正本です。ここに規則の文を写して二重に持たないでください。このスキルは作業の順、判断、どの文書のどこを読むか、よくある誤りを持ちます。

見本の講座は `stages/dev-env-basics/` (format 2) です。課題の定義は `src/task-schema.ts` と `src/task-content.ts`、導入手順は `ADDING_STAGE.md` の「新カリキュラムの format 2」です。

## 0. どこで動いているか

最初にどちらのリポジトリかを決め、以降のパスの先頭をそれに合わせます。

- **STELLA 本体**。`packages/content/stages/` がある。文書は `packages/content/...`、講座は `packages/content/stages/<slug>/`、検査は `bun run content:check`。
- **外部リポジトリ**。`stella-extra.json` がある。STELLA の写しは `.stella/`。文書は `.stella/packages/content/...`、講座はリポジトリ直下の `stages/<slug>/`。写しが無ければ、先に `node scripts/stella.mjs setup`。検査は `node scripts/stella.mjs check`。外部での作業は `references/extra-repo.md`。

以下、本体のパスで書きます。外部では文書の先頭に `.stella/` を付け、講座の置き場所だけ `stages/` に読み替えます。

Extra 講座 (`audience: granted`。講師が割り当てた受講者にだけ出る) のうち、公開リポジトリに置きたくないものは外部の非公開リポジトリに置きます。公開リポジトリの STELLA 本体には置きません。

`.stella/` の中は写しです。そこを編集して直したことにしないでください。直すのは外部リポジトリの `stages/` と、足す台帳です。

## 1. 講座の要件を決める

本文の前に `THEME_TO_STAGE.md` で要件を埋めます。到達目標は観測できる動詞で書きます (書ける、直せる、選べる、説明できる)。規模はトピック数で見ます。カリキュラム (takeaway の一覧) が固まる前にスライドを書き始めないでください。

評価は format 2 では課題 (`tasks/`) と知識問題 (`knowledge.md`) です。`THEME_TO_STAGE.md` の「コード演習は javascript / typescript / sql だけ」は、旧形式の QuickJS 演習の話です。format 2 の実行は runner ごとに固定の手順で、テンプレートは `templates/runners/` にあります。

- **Basic**。公開リポジトリのカタログに載る講座。`audience` は書かないか `catalog`。slug、前提、線の親、カテゴリの正本は `docs/curriculum/07-stella-adoption-redesign.md` の §3.1 と §3.4。前提の無い根は `dev-env-basics` だけです。ここへ前提を足さないでください。
- **Extra**。`stage.json` の `audience` は `granted`。`category` は `packages/shared/src/skill-map/islands.ts` の島のどれか。`prerequisites` は 1 つ以上、実在する STELLA の講座の slug。外部リポジトリの `name` は `packages/content/extra-repositories.json` に登録した名前で、講座の slug は `<name>-` で始めます。退役した slug は使えません。新しい島が要るときは `references/extra-repo.md`。

slug、講座名、ファイル名に受講者の名前を入れないでください。R2 のキーと D1 に残ります。

## 2. カリキュラムを先に書く

`packages/content/CLAUDE.md` の 3 層に合わせます。モジュールが単元、レッスンが 1 回分、トピックがショート動画 1 本です。

トピックを割る基準は Takeaway が 1 文で書けることです。書けなければ 2 つに割ります。タイトルに「と」が入ったら、分割を検討します。1 トピックは 4〜6 枚のスライドです。

単元の中の課題は、同じ書き方を繰り返す、前のものとつなぐ、自力、修正、総合、未見の確認、の順に置きます。考え方は `docs/curriculum/03-repeated-practice-and-assessment.md`。課題の切り方は `references/task-design.md`。

## 3. 単元を作る

`ADDING_STAGE.md` の format 2 の木に合わせます。

```text
modules/<unit>/
  unit.json
  references.json
  <lesson>/<topic>/slides.md
  <lesson>/doc.md
  <lesson>/knowledge.md
  tasks/<task>/
```

- `unit.json` は `plannedHours`、`skills.uses` / `skills.assesses`、`reuses`。スキル ID は `skills.json` に `{ id, title }` で足してから指します。ログインなしで読める単元 (`public: true`) には課題を置けません。
- `references.json` は参照元の使用箇所です。新形式は初回公開から必須です。台帳の作り方、`unitId` の版、`contentHash` は `SOURCE_GUIDE.md`。課題や本文を足したら、版を上げ、参照元を確かめ直し、`bun run --filter=@stella/content hash:unit -- <講座>/<単元>` の指紋を `contentHash` に書きます。外部では、写しの中の同じコマンドを、そのリポジトリの手順で実行します。資料の `review` と使用箇所の `reviewStatus` は `draft` までです。`approved` は講師が資料と本文の対応を確かめてから付けます。
- 参照元の ID 自体は `sources/registry.json` (外部では足す分だけをリポジトリの `sources/registry.json` に置く)。技術のトップページだけを根拠にしないでください。
- 語彙台帳 (`slides.md` の `introduces` / `requires`) は学習順に検査されます。未導入の語が要るなら、語を足すよりトピックの順を直します。

## 4. 課題を作る

種別、既存教材の分割、`task.json` の項目、フォルダー名は `references/task-design.md`。C# は `references/csharp.md`。

runner を選び、テンプレートから始めます。`static-preview` と `env-diagnose` にテンプレートは無いので、見本の課題から写します。それ以外は次です。`$SKILL` はこの SKILL.md があるフォルダーです。

```bash
SKILL=.claude/skills/stella-course   # ユーザー全体に入れたものなら ~/.claude/skills/stella-course
node "$SKILL/scripts/scaffold.mjs" task \
  --content packages/content \
  --stages packages/content/stages \
  --stage <slug> --unit <単元フォルダー> --task <課題フォルダー> \
  --runner <runner> --kind <kind> --title "<題>"
```

外部では `--content .stella/packages/content`、`--stages stages`。旧い `courses/` も overlay は受け付けます。`SKILL` は、`node scripts/stella.mjs skill` で取り込んだあとなら `.claude/skills/stella-course` のままで動きます。取り込む前なら `SKILL=.stella/.claude/skills/stella-course` にします。

scaffold は `templates/runners/<runner>/` の `starter/` と `tests/` を課題へ写し、`task-fields.json` から `task.json` の下書きを書きます。`pattern`、`skills`、`sources` は、同じ単元の既存の課題があればその値、無ければ台帳の先頭です。課題の内容に合わせて直します。`README.md`、`hints.md`、`private/solution/` (テンプレートの、テストが通る実装)、`private/explanation.md`、`private/review.md`、`private/variants/.gitkeep` も置きます。既存の課題フォルダーがあるときは何も書きません。

書いたあとにやること。

1. 例の実装とテストを、その課題の入出力に書き換える。解答例は `private/solution/` に置き、starter に重ねるとテストが通る状態にする。
2. `submit.files` を、受講者が編集するファイルに合わせる。`protected` はテンプレートの設定とテストを残す。
3. ルーブリックの `criterion` は、コードを見て当否を決められる文にする。
4. `hints.md` の段数を `support.hintLevels` とそろえる。確認 A・B と統合は 0 段。
5. 単元の `references.json` に、この課題の `tasks/<課題>/README.md` を足す。`sources` とその `sourceRefs` を同じ ID にする。

`task.json` に任意のコマンドは書けません。拡張が runner ごとの固定手順で実行します。

## 5. 知識問題とまとめ

- 公開する解説は `doc.md`。解答の解説をここに混在させないでください。解答の解説は `private/explanation.md`。
- 知識問題はレッスンの `knowledge.md`。設問の見出しは `### Q1. 設問文`、直後に `<!-- kind: single; skills: <スキルID> -->`。種別は `single` / `multiple` / `boolean`。選択肢と `<details>` の解答は `ADDING_STAGE.md` の見本に合わせます。正誤は `A. 正しい` / `B. 誤り` の 2 択、複数選択の正解は `**A, C** — 解説`。
- format 2 では `practice.md` を配信しません。実装は課題、知識は `knowledge.md` に分けます。
- Windows と macOS で手順が違う説明は、`doc.md` と課題文の `README.md` だけに `:::os` で書きます。スライド、動画、知識問題、ヒントは OS に依存しない文にします。記法は `STYLE_GUIDE.md` の「OS別の手順」。
- 図解は `.claude/skills/diagram-design/` の手順で作ります。人に見せたくない内容は図に入れないでください。図解とサムネイルは公開の R2 に置かれ、slug とファイル名から URL を組み立てられます。

## 6. 検査する

本体は `bun run content:check`。外部は `node scripts/stella.mjs check`。

落ちたら、エラーが指す文書の規則に戻って教材を直します。検査を通すために、テストの期待値を緩める、`protected` からテストや設定を外す、誤答を消す、ということはしないでください。

解答例は、拡張と同じランナーで実行されます。Node 系は `npm ci` をします。C# は .NET SDK 10 の `dotnet test` です。類題の `private/mutants/` は、解答例に重ねると不合格になることまで検査します。

## 7. 受講者に出す

- **Basic**。main への merge で、変わった教材だけが seed されます。
- **Extra**。外部リポジトリの main への merge で Actions が写しに重ねて seed します。そのあと、講師か管理者が「Extra 講座」画面 (`/stage-grants`) で受講者に割り当てます。割り当てはツリーに出すだけで、受講開始は本人の自己開始です。

## やってはいけないこと

- 解答例、講師用の追加ケース、未出題の確認問題を `private/` の外に置かない。予備の確認は `private/variants/` の類題にし、未出題のまま配らない。
- 受講者の提出物や、個人の学習記録を教材に入れない。
- 人に見せたくない内容を、図解、サムネイル、課題文の画像に入れない。
- `.stella/` の中を編集しない。
- 検査を通すために tests や protected を弱めない。
- slug と講座名に個人名を入れない。
- 既存のスキル `stella-book` と `diagram-design` の手順を、講座の作業で書き換えない。
- 参照元 (`sources/registry.json` の `review`・単元の `references.json` の `reviewStatus`) を `approved` にしない。Claude が書くのは `draft` まで。講師が資料と本文の対応を確かめてから承認する (SOURCE_GUIDE.md の 5。AI の調査・照合を講師の承認として記録しない)。検査が承認の無いことで落ちたら、承認を付けずに、講師に確認を頼むと報告する。

## よくある誤り

- 旧形式の `practice.md` と `exercises` のまま format 2 の課題を書こうとする。format 2 の実装課題は `tasks/<課題>/`。
- `hints.md` の段数と `support.hintLevels` が違う。確認 A・B にヒントを書く。
- 解答例を starter の中に残す。starter は受講者に配られます。通る実装は `private/solution/`。
- 隠したテストで合否を付けようとする。サーバーはコードを実行しません。落とす条件は、配布する `tests/` に書くか、`private/review.md` に書いて AI と講師の材料にします。
- 課題を足したのに `references.json` と `contentHash` を更新しない。
- C# をトップレベルのステートメントで書かせる。テンプレートはクラスの static メソッドです。詳細は `references/csharp.md`。
