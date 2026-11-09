# 課題の設計

形式の正本は `packages/content/src/task-schema.ts` (`parseTaskDefinition`)、読み込みは `src/task-content.ts`、書き方の一覧は `ADDING_STAGE.md` の「新カリキュラムの format 2」。種別ごとのヒントと解答の解放は `packages/shared/src/tasks/help.ts` の `TASK_HELP_POLICIES`。ここは、どの種別を選ぶか、既存の問題集をどこで切るか、下書きに何を埋めるかです。

## 種別

考え方は `docs/curriculum/03-repeated-practice-and-assessment.md` です。1 つの実装パターンを繰り返し、前に習ったものとつなぎ、手順を自分で選び、壊れたコードを直し、最後に未見の問題で確かめます。支援した問題は練習です。自力の確認には別の問題を使います。

`task.json` の `kind` は次のどれかです。

| kind | 使うとき | ヒント | 取り組み中の解答 | 提出 |
| --- | --- | --- | --- | --- |
| `basic` | 同じ書き方を、値・条件・境界・組合せ・利用場面を変えて繰り返す | 開ける。既定は 2 段、`after-hints` | ヒントを最後まで開いた次 | 説明は不要 |
| `connection` | 前に習った処理や部品を、今の課題へ 1 つ以上つなぐ | basic と同じ | basic と同じ | 説明は不要 |
| `independent` | 処理の選び方を自分で決める。別の題材にする | 開ける。`attempts-or-passed` か `passed` | 決まった回数の挑戦のあとか、合格後。回数を書くときは `support.attempts` (省略すると 5) | `submit.explanation: true` |
| `debug` | 誤りのあるコードを直す。誤りは starter に置く | independent と同じ | independent と同じ | `submit.debuggingRecord: true` |
| `integration` | パックの節目で、既存の画面や機能へ組み込む | 0 段。取り組み中は仕様と参照元だけ | `passed` のみ | 説明が必要 |
| `assessment-a` | 未見の確認。公式ドキュメントと文法の参照はしてよい | 0 段 | `passed` のみ。合格後に解答例 | 説明が必要 |
| `assessment-b` | A の合格から 7 日後の、別問題での定着確認 | 0 段 | `passed` のみ。確認 B の解答例は受講者に出さない | 説明が必要 |

確認 A・B にヒントは置けません。`solutionUnlock` は `passed` だけです。統合もヒントは 0 段です。

基礎・接続の `solutionUnlock` は `after-hints` か `passed`。自力・修正は `attempts-or-passed` か `passed`。表に無い組み合わせは `content:check` が落とします。

確認 B を、練習した同じ問題の再提出にしないでください。A で自力、B で時間を空けた別問題、です。

## 既存の教材を分割する

1 つの課題は、受講者が 1 回の確認と提出でまとめて見てもらえる量にします。目安は 30〜60 分です。同じ書き方の問題なら 5〜10 問を 1 課題にまとめます。

問題集の「Q01〜Q10 は同じ書き方」なら 1 課題です。書き方 (別のパターン、別の部品、別の runner) が変わるところで分けます。★ (最初に確認する問題) は、その課題の最初に置きます。

確認問題は 1 問 1 課題です。A、B、予備の C を 1 つの課題にまとめないでください。予備は親の課題の `private/variants/<類題>/` に置き、未出題のまま配らないでください。類題の形、`kind` の使い分け、`private/mutants/` が必須なことは `ADDING_STAGE.md` の「予備の類題」です。

講師用の解答は `private/solution/` に置きます。講師の追加ケースは、次のどちらかです。

- 配布する `tests/` に入れる。受講者にも見える。手元のランナーがこれを実行するので、ここで落とした不合格は提出前に分かります。
- `private/review.md` に書き、AI と講師のレビューの材料にする。サーバーは受講者のコードを実行しません。配布していないテストでは合否を付けられません。

修正演習の典型的な誤りは、starter に置くと同時に、類題では `private/mutants/<誤答>/` にもします。課題本体の mutants は任意です。類題では、手元で確かめられる runner なら 1 つ以上が必要で、解答例に重ねると不合格になることを検査が確かめます。

ヒントは `hints.md` の段に書きます。段の順は「方針 → 手がかりのコード」で、解答そのものは書きません。支援の記録 (自力、ヒントあり、解答参照) は STELLA が開いた事実から取ります。教材に自己申告の欄を足さないでください。

## 問題つきの課題

同じ書き方の問題を 1 つの課題にまとめ、1 問ずつ確認・提出するときに `problems` を書きます。課題は配布・修了の単位のまま、問題が確認と提出の単位です。確認 A・B は今までどおり 1 問 1 課題にし、`problems` で 1 つの課題にまとめないでください。

`task.json` に次を書きます。パスは書きません。`id` からファイルが決まります。

```json
{
  "problems": [
    { "id": "q01-add-tax", "title": "税込価格を返す" },
    { "id": "q02-split-bill", "title": "割り勘" }
  ]
}
```

- `id` は英小文字・数字で始め、英小文字・数字・ハイフンだけ。課題の中で重複しない
- `title` は空でない文字列
- 書ける runner は vitest・typescript・dotnet だけ (`node-test`・`ts-test`・`dotnet-test` など、その手順のもの)
- vitest・typescript のファイルは `src/<id>.ts` と `tests/<id>.test.ts`
- dotnet のファイルは `src/<id>.cs` と `tests/<id>.test.cs`。書き方は `references/csharp.md`
- `review` は書かなくてよい。`submit.explanation` と `submit.debuggingRecord` は `false`
- AI の一次レビューは通さない。問題が全部そろった提出を、テストの合否として合格にする。合否は手元の申告で、サーバーはコードを実行しない

## 1 課題のファイル

```text
tasks/<task>/
  task.json
  README.md              # 課題文。入力と出力、制約、例。OS 差は :::os
  starter/               # 受講者に配る。テンプレートの実装は「直した後」なので、穴を空ける
  tests/                 # 配布するテスト。protected
  hints.md
  private/solution/      # starter に重ねるとランナーが合格する
  private/explanation.md
  private/review.md      # 受講者には返さない
  private/variants/      # 空なら .gitkeep。類題は 1 問 1 フォルダー
  private/mutants/       # 任意。類題では必須
```

名前を変える・ファイルを消す課題は、`private/solution/.stella-solution.json` に `{ "remove": ["memo.txt"] }` のように元のファイルの相対パスを書きます。
解答例を重ねたあとに削除され、この指定は配布・解答表示には入りません。誤答でも `private/mutants/<名前>/` の直下に同じ形式で置けます。

`fixed-start/` と `fixedStart.covers` は、前の課題の実装が壊れて先へ進めない受講者へ配るときだけです。確認 A・B には置けません。条件は `ADDING_STAGE.md` の fixed-start の節です。

### task.json の項目

必須と任意は `parseTaskDefinition` が見ます。scaffold が埋める仮の値 (pattern、skills、sources、ルーブリック、30〜60 分の `estimatedMinutes`) は、課題に合わせて直します。

| 項目 | 意味 |
| --- | --- |
| `id` | `<ステージ>/<単元>/<課題フォルダー>`。3 つともフォルダー名と一致させる |
| `title` | 課題の題。画面に出る |
| `kind` | 上の表 |
| `pattern` | `patterns.json` の id。同じパターンの基礎課題と類題で揃える。類題は親と同じ。確認 B の `pattern` を同じ単元の対応する確認 A と同じ値にしないと、A の合格から 7 学習日後に予定する処理と定着の判定が働きません。 |
| `skills.uses` / `skills.assesses` | `skills.json` の id。使うスキルと、この課題で見るスキル |
| `runner` | `templates/runners/<runner>/task-fields.json` の値。自分でコマンドを書かない |
| `environment` | `environments/<id>.json` の id。テンプレートの `task-fields.json` を写す。単元の `references.json` の `environmentRef` の id と揃える |
| `submit.files` | 受講者が編集し、提出する相対パス。`env-diagnose` 以外は 1 つ以上 |
| `submit.explanation` | 自力・統合・確認は `true` |
| `submit.debuggingRecord` | 修正は `true` |
| `review.rubric` | `{ id, criterion, required }`。`criterion` は当否を決められる文。尺度 (1〜5) や疑問文にしない。必須項目は rubric と rules を合わせて 1 つ以上 |
| `review.rules` | 任意。`coding-rules.md` とステージの `coding-rules.md` の id。導入より前の課題では必須にできない |
| `review.escalateWhen` | `optional-unmet` か `major-finding`。無ければ空配列 |
| `support.hintLevels` | `hints.md` の段数と一致。確認と統合は 0 |
| `support.solutionUnlock` | 種別の表のどれか |
| `support.attempts` | `attempts-or-passed` のときだけ。省略すると 5 |
| `support.aiChat` | 任意。AI に相談させない課題だけ `false`。省略すると使える |
| `sources` | 単元の `references.json` に、この README の使用箇所として書いた参照元 ID と同じ配列 |
| `estimatedMinutes` | 正の数。同じ書き方のまとまりなら 30〜60 を目安にする |
| `protected` | 配布し、改変を照合する設定とテスト。テンプレートの一覧を空にしない |
| `checks.lint` / `checks.format` | テンプレートの値。C# は両方 `false`。lint をしない課題だけ `false` にする |
| `static` | `static-preview` だけ。`checks` が 1 つ以上 |
| `ci.workflow` | `ci-deploy` だけ。`.github/workflows/` の下の yml。`submit.files` か `protected` に当たるパス |
| `fixedStart.covers` | `fixed-start/` がある課題だけ。同じステージで、この課題より前の課題 ID |

`schemaVersion` は教材の `task.json` には書きません。読み込みが 1 を足します。

`hints.md` の見出しは `## ヒント1 方針` のように、1 から順の番号と題です。最初の見出しより前に本文を置かないでください。0 段の課題は空か、コメントだけにします。段の中の見出しは `###` 以下です。

`README.md` に教材内の画像は使えません。配布されないので、受講者には壊れた画像になります。

## フォルダー名

id の各部分は英小文字・数字で始め、続けて英小文字・数字・`.`・`_`・`-` です (`task-schema` が使う形)。ステージの課題は英小文字、数字、ハイフンに寄せ、番号は自然順で並ぶようにゼロ埋めします (`q01`、`q02`、`q10`)。

種別の頭文字は、03 の記号に合わせると後から追いやすいです。基礎 `q`、接続 `c`、自力 `s`、修正 `r`、統合 `t`、確認 A `a`、確認 B `b`。見本の `q01-first-page` がこの形です。

フォルダー名を `-fixed-start` で終わらせないでください。学習フォルダーが、固定した開始点のフォルダーにその接尾辞を使います。

ファイル名は英数字にします。macOS の濁点の正規化で、提出の glob から外れるのを避けます。

## runner

選び方の表の正本は `templates/runners/README.md` です。C# は `dotnet-test` です。テンプレートの無い `static-preview` (HTML の確認) と `env-diagnose` (環境診断) は、見本から写します。

| フォルダー | runner | 主な道具 |
| --- | --- | --- |
| `node-test/` | `node-test` | Vitest |
| `ts-test/` | `ts-test` | TypeScript の型の確認 (tsc) + Vitest + typescript-eslint |
| `dom-test/` | `dom-test` | Vitest + jsdom + Testing Library |
| `http-mock/` | `http-mock` | Vitest + MSW |
| `react-test/` | `react-test` | Vitest + React Testing Library |
| `storybook/` | `storybook` | Storybook の状態見本を Vitest で確認 |
| `api-test/` | `api-test` | Vitest + Hono |
| `db/` | `db` | Vitest + PGlite |
| `e2e/` | `e2e` | Playwright + Vite |
| `next-app/` | `next-app` | Next.js + Playwright |
| `ci-deploy/` | `ci-deploy` | 受講者の GitHub Actions。手元ではテストを動かさない |
| `dotnet-test/` | `dotnet-test` | .NET SDK 10 + xUnit。書き方は `references/csharp.md` |

Node.js は 22.13 以上の 22 系と 24 系だけ、です。版の上げ方はランナー README の「道具の版を上げる」にあります。課題の中で道具の版だけを上げないでください。環境台帳の ID を新しくし、テンプレートと見本を一緒に更新します。
