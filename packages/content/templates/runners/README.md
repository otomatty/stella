# runner ごとの課題テンプレート

Node.js の道具を使う課題 (`task.json` の `runner`) を作るときのひな形。VS Code 拡張が runner ごとに実行する固定の手順 (`apps/vscode/src/runner/steps.ts`) に合わせて、`package.json`・`package-lock.json`・テストと lint・整形の設定をそろえてある。

| フォルダー | runner | 主な道具 | 環境台帳 | 使う講座 (07 §5.2) |
| --- | --- | --- | --- | --- |
| `node-test/` | `node-test` | Vitest | `node-test-01` | javascript-basics, javascript-data-basics, node-api-basics |
| `dom-test/` | `dom-test` | Vitest + jsdom + Testing Library | `dom-test-01` | dom-basics, ui-components-basics |
| `http-mock/` | `http-mock` | Vitest + MSW (疑似応答) | `http-mock-01` | http-async-basics |
| `react-test/` | `react-test` | Vitest + jsdom + React Testing Library、Vite | `react-test-01` | react-basics, react-ui-basics, ui-integration-basics |
| `storybook/` | `storybook` | Storybook の状態見本を Vitest (jsdom) で表示・確認 | `storybook-01` | react-basics, react-ui-basics, ui-integration-basics |
| `api-test/` | `api-test` | Vitest + Hono (`app.request()`) | `api-test-01` | node-api-basics, auth-basics |
| `db/` | `db` | Vitest + PGlite (PostgreSQL) | `db-01` | sql-basics, auth-basics |
| `e2e/` | `e2e` | Playwright + Vite | `e2e-01` | ui-integration-basics, nextjs-basics, deploy-ops-basics |
| `next-app/` | `next-app` | Next.js (`next build`) + Playwright | `next-app-01` | nextjs-basics |
| `ci-deploy/` | `ci-deploy` | GitHub Actions (`node --test`) + GitHub Pages | `ci-deploy-01` | deploy-ops-basics |

`static-preview`・`env-diagnose` は Node.js の道具を使わないので、テンプレートは無い。`ci-deploy` はテストを手元では動かさず、受講者の GitHub Actions が動かす (下の「CI と公開」、07 §5.5)。

## 中身

- `starter/` — 課題の `starter/` に写す。`package.json` は道具の版を固定し、`package-lock.json` は Windows・macOS・Linux のネイティブ部品をすべて含む。テストの設定 (`vitest.config.js` / `vite.config.js` / `playwright.config.js`)・`eslint.config.js`・`.prettierrc.json`・`.prettierignore` もここ。例の実装 (`src/` など) は、テストが通る「直した後」の形。
- `tests/` — 課題の `tests/` に写す。テストは `tests/` に置いたものだけを実行する。
- `task-fields.json` — 課題の `task.json` に写す項目 (`runner`・`environment`・`submit`・`protected`・`checks`)。`protected` には道具の版・設定・テストを入れ、書き換えて通したことに提出時に気づけるようにしてある。

## 課題を作る

1. `starter/` を課題の `starter/` に、`tests/` を課題の `tests/` に写し、例の実装とテストを課題の内容に書き換える。
2. `task-fields.json` の項目を課題の `task.json` に写す。提出ファイル (`submit.files`) と配布ファイル (`protected`) は課題に合わせて直す。lint・整形をしない課題は `checks` を `false` にする。
3. `private/solution/` に解答例を置き、`bun run content:check` で手元のランナーに通ることを確かめる。Node 系の課題では、この検査が実際に `npm ci` (e2e・next-app はブラウザーの準備も) をする。

## 決めごと

- **Node.js は 22.13 以上の 22 系と 24 系だけ。** 環境台帳の `requirements.node` は `{ "min": "22.13.0", "majors": [22, 24] }`。道具の多くが `^22.13.0 || >=24` のように奇数版 (23) を外しているので、`majors` で偶数の版だけを並べる (`maxMajor` だけでは 23 を通してしまう)。この要件で通る版が lockfile の全依存の `engines` を満たすことは `templates.test.ts` が確かめる。
- **結果の形式はテンプレートで決めない。** 拡張が `--reporter=json` と出力先を引数で渡す。設定に `reporters`・`outputFile` を書くと結果を読めなくなる。
- **整形の改行は `endOfLine: "auto"`。** Windows で作ったファイル (CRLF) を「整形が必要」と誤って判定しない。`.prettierignore` で `package-lock.json` と `.stella/` を外し、`npm run format` で配布ファイルの内容ハッシュを変えない。
- **画面を開く道具は npm を通さずに起動する。** Playwright の `webServer` は `node node_modules/<道具>/...` で起動する (Windows でも同じ書き方で動く)。待ち受けは `127.0.0.1` に限り、Windows のファイアウォールの確認を出さない。
- **ファイル名は英数字にする。** macOS で濁点の正規化が食い違い、提出の glob に当たらなくなるのを避ける。
- **API は Hono。** `app.request()` でポートを開かずにテストでき、ポートの衝突や Windows のファイアウォールの確認が起きない。Express の版は要るときに足す。
- **DB は PGlite。** Docker を入れずに PostgreSQL を動かす (07 §5.2)。1 つで約 0.8GB のメモリを使い、作るのに数秒かかるので、空の DB を 1 回作って `clone()` で複製し、テストのファイルは 1 つずつ実行する。
- **Storybook はブラウザーを使わずに確かめる。** 状態見本 (`*.stories.jsx`) を `composeStories` で読み込み、jsdom で表示して `play` の確認を通す。`npm run storybook` で受講者が画面でも見られる。

## CI と公開 (`ci-deploy/`)

受講者は自分の GitHub の公開リポジトリに push し、GitHub Actions の実行が成功したら、拡張に実行の URL と公開先の URL を入力して提出する。拡張は URL の形と、ファイルがコミット済みかだけを確かめる。提出を受けた API が GitHub の公開 API で、実行が成功で終わったこと・同じコミットの実行であること・課題のワークフローの実行であることを確かめる (07 §5.5)。

- `task-fields.json` の `ci.workflow` (確かめるワークフローのパス) を課題の `task.json` に写す。`ci-deploy` の課題に必須で、`.github/workflows/` の下の `.yml`・`.yaml` にし、`submit.files` か `protected` に当たるようにする (`content:check` が止める)。
- `starter/.github/workflows/deploy.yml` は、`main` への push でテスト (`npm test` = `node --test`) を実行し、通ったら `site/` を GitHub Pages に公開する。外部の action はコミットで固定し、版をコメントと環境台帳の `ci.actions` に残す。権限は既定で `contents: read`、公開の権限 (`pages: write`・`id-token: write`) は `deploy` のジョブだけに渡し、チェックアウトの認証情報は残さない (`persist-credentials: false`)。
- 依存パッケージを持たない (Node.js のテストランナーだけを使う) ので、CI に lockfile と `npm ci` が要らない。依存を足す課題は、ほかのテンプレートと同じく版を固定し、lockfile を置き、ワークフローに `npm ci` を足す。
- 受講者のリポジトリでは、課題フォルダーがリポジトリの一番上になる (Actions は一番上の `.github/workflows/` だけを読む)。課題文に、公開リポジトリにすること・Pages の公開元を「GitHub Actions」にすることを書く。
- 拡張は「課題を確認する」で、課題フォルダーがリポジトリの一番上であることと、提出・配布のファイルとワークフローがコミット済みであることを確かめる (CI が動かしたコミットと、レビューするファイルを同じにするため。決定、07 §5.5)。学習フォルダー全体を 1 つのリポジトリにしていると通らないので、課題文に次の手順を入れる。
  1. 課題フォルダーで `git init` し、変更をコミットする (学習フォルダーや単元のフォルダーではなく、課題フォルダーをリポジトリにする)。
  2. GitHub に公開リポジトリを作って push し、リポジトリの設定で Pages の公開元を「GitHub Actions」にする。
  3. Actions の実行が成功したら、その実行の画面の URL (`…/actions/runs/<番号>`) と公開先の URL を控える。
  4. 「課題を確認する」で 2 つの URL を入力する。push のあとに手元を直したら、もう一度コミット・push し、新しい実行の URL を入力する。
- `bun run content:check` は、解答例を重ねた配布ファイルにワークフローがそろうことだけを確かめる (CI は GitHub で動く)。テンプレートのテストが通ることは `templates.test.ts` が `node --test` で確かめる。

## 道具の版を上げる

1. `starter/package.json` の版を書き換え、`starter/` で `npm install --package-lock-only` を実行して lockfile を作り直す。
2. 環境台帳に新しい ID (例 `node-test-02`) を作り、`libraries` を新しい版にする。新しい道具が求める Node.js の版 (`engines`) に合わせて `requirements.node` も見直す。古い台帳は残す (過去の課題の記録が参照する)。`task-fields.json` の `environment` を新しい ID にする。
3. `apps/vscode/samples/<runner>/` の見本も同じファイルに更新し、`bun run test` でテンプレートの検査 (`apps/vscode/src/runner/templates.test.ts`・`samples.test.ts`) を通す。
4. 見本を Extension Development Host で開き、「課題を確認する」で最後まで通ることを確かめる (`apps/vscode/samples/README.md`)。

テンプレートと見本は受講者向けの道具の設定 (ESLint・Prettier) に従うので、リポジトリの Biome の対象から外してある。
