# CI / CD

GitHub Actions を単一基盤とする。CI は認証不要、CD は `main` push のみ。

## ワークフロー

| ファイル | トリガ | 内容 |
|---------|--------|------|
| `.github/workflows/ci.yml` | `pull_request`（全ブランチ） + `workflow_call` | **検証ゲートの正本**。`verify` ジョブ（deploy:config:check → typecheck → test → lint → content:check → 図解 lint → build）と `core-loop` ジョブ（E2E スモーク）の 2 本 |
| `.github/workflows/deploy.yml` | `main` への push | `ci.yml` を呼ぶ（`verify` + `core-loop`）→ deploy:prepare → 教材の変更判定 →〔教材が変わっていれば R2 教材画像 upload(remote) → 教材 PDF sync(remote)〕→ D1 migrate(remote) → 非公開 R2 の確認 → `ANTHROPIC_API_KEY` の同期 → deploy:api →〔教材が変わっていれば D1 seed(remote) → 指紋の記録〕→ deploy:web → deploy:narrator → deploy:health:check |
| `.github/workflows/release-vscode.yml` | `main` への push（`apps/vscode/**` 変更時） | `ci.yml` を `scope: code` で呼ぶ → `.vsix` をビルドして GitHub Releases（タグ `vscode-v<version>`）に添付 |

検証ゲートの定義は `ci.yml` の 1 か所だけに置き、`deploy.yml` / `release-vscode.yml` は
`uses: ./.github/workflows/ci.yml` で呼ぶ。3 つのワークフローに同じ手順を書き写すと、
片方だけ直したときに黙って乖離するため（実際、`content:check` の追加がこの表から漏れていた）。
`ci.yml` 自体は `main` push を起動しない（`deploy.yml` からの呼び出しで走る）。

`scope` 入力は呼び出し側がゲートの範囲を選ぶためのもの。

| `scope` | 走るもの | 使う場所 |
|---------|----------|---------|
| `full`（既定） | verify の全ステップ + core-loop | `pull_request`、`deploy.yml` |
| `code` | deploy:config:check + typecheck + test | `release-vscode.yml`（`.vsix` を出す前の最小確認） |

**E2E（`core-loop`）は `deploy.yml` の経路にも入っている。** PR で通っていても、
マージ後の main の組み合わせで一度も E2E を通さずにデプロイする、という穴を塞ぐため。
そのぶんデプロイ完了までの時間は core-loop ジョブ 1 本ぶん（数分）伸びる。

## 教材が変わっていない push は教材パイプラインを飛ばす

`main` への push は毎回 R2 画像 126 件の put・Playwright 導入・PDF 差分・D1 seed をフルで
流していた。UI だけの変更でもそこに 11 分使うので、**seed に入るものが 1 バイトも
変わっていない push では画像 upload / Playwright / PDF sync / D1 seed を丸ごと飛ばす**
（Issue #266）。検証ゲート・migrate・deploy:api・deploy:web は毎回走る。

判定は git の diff ではなく**内容指紋**（`packages/content/scripts/lib/content-fingerprint.ts`）。
下の範囲を `git ls-files -s`（= 内容ハッシュ）で並べて SHA-256 を取り、前回 **seed まで
通ったとき**に R2 へ書いた `deploy/content-state.json` の値と比べる。

| 見ている範囲 | 理由 |
|---|---|
| `packages/content/courses` と規則・スキル・パターン・環境・参照元の台帳 | 教材の正本。seed SQL と PDF・図解の中身 |
| 生成コードが値として import しているファイル (`SEED_INPUT_PATHS`) | `export-seed-sql.ts`、PDF / 画像の変換、旧演習の課題定義 (`packages/shared/src/problems`。README とテストは除く)、面談の質問、seed の適用 (`seed-d1.ts`)、`packages/content/package.json` の依存の版 (playwright / remark など)。型だけの import は見ない。`bun.lock` 全体は見ない。値 import を足したのに一覧に無いと `content-fingerprint.test.ts` が落とす |
| `apps/api/drizzle` | migration。新しい列を seed が埋める形の変更があるので、スキーマが動いた push では教材が同じでも seed を流す |
| 見ないもの | API の実装、レビュー画面、課題ランナーの実行時コード、`apps/api/scripts` の seed 以外、`wrangler.toml` の vars。ここをディレクトリごと広げると、教材が変わっていない push でもパイプラインが走る |
| `PDF_KEY_SALT`（リポジトリ外） | PDF の R2 キーに入る塩。替えると全キーが変わるので、教材が同じでも PDF 生成と seed が要る。指紋には塩の要約だけを混ぜ、記録に塩そのものは出さない |
| seed の宛先 D1（`wrangler.toml` の `database_id`） | 記録は「この内容を**この DB へ**入れ終えた」という意味。DB を作り直す / 差し替える変更で指紋が一致すると、migration と API だけ新 DB に入り、教材の無い DB を指したまま成功扱いになる。`wrangler.toml` を丸ごと対象にはしない（`ALLOWED_ORIGINS` やモデル名など seed と無関係な vars のたびに流し直すことになるため） |

指紋は「前回のコミット」ではなく「前回デプロイが成功したときの内容」と比べる。前回が
seed の手前で落ちていた回・Re-run・force push のあとでも、**まだ D1 に入っていない教材を
飛ばす**ことが起きない（記録は R2 → PDF → seed が全部通ったあとにだけ更新するため）。
記録が読めないときは「変わった」に倒す（冪等なパイプラインをもう一度流す方が安い）。書き込みに失敗したときもデプロイは止めない（本番の状態は正しく、起きるのは次のデプロイがもう一度流すことだけなので、それで Web デプロイを止める方が損）。

R2 のオブジェクトを手で消した / 別経路で壊したときは、指紋が一致する限りスキップされる
（実体の存在確認はしない）。`bun run content:state:reset:remote` で記録を消してから
デプロイを Re-run すること。

教材画像 (図解 SVG + 講座サムネイル) は seed の**前**に R2 へ流す。D1 が指す先が先に存在している必要があるため、順序を入れ替えないこと。put は冪等なので、走るときは毎回全件流す（差分台帳は持たない — 図解 SVG のキーは内容ハッシュではないので、台帳が唯一の真実になると `r2:orphans` で消したオブジェクトを「put 済み」として飛ばしてしまう）。remote の put は Cloudflare API 直叩き（`packages/content/scripts/lib/r2.ts`）で、同時 8 本・失敗は 3 回まで再試行して 126 件が十数秒。`wrangler r2 object put` を 1 ファイルにつき 1 プロセス起こしていた頃は、ここだけで 2 分半かかっていた。local (`--local`) はバケットの実体が miniflare の永続ディレクトリなので wrangler のまま。サムネイルの R2 キーは内容ハッシュ入り (`tenant/<tenantId>/courses/<slug>/thumbnail-<hash>.webp`) で、旧世代は `bun run r2:orphans` の棚卸しで掃除する。

このステップは `CLOUDFLARE_API_TOKEN` に **Workers R2 Storage: Edit** 権限を要求する。権限が無いとここで落ち、seed 以降は動かない（D1 が存在しない画像を指すことはない）。

seed は SQL を D1 の 100KB/query に収まるチャンクへ割って**直列に**適用する（FK 順と upsert 順があるので並列にしないこと）。remote は 1 プロセスから D1 の HTTP API (`/query`) を叩く（`apps/api/scripts/lib/d1-remote.ts`）。チャンクごとに `bunx wrangler d1 execute` を起こしていた頃は、D1 上の実行時間が合計 4 秒なのに壁時計が 8 分半で、差はすべて CLI の起動と通信だった。途中で落ちたら何チャンク目かを出して失敗させる（「成功したことにしない」）。HTTP 側で問題が出たときは `cd apps/api && bun run scripts/seed-d1.ts --remote --content-only --wrangler` で旧経路（チャンクごとに `wrangler d1 execute`）に戻せる。local (`--local`) は miniflare の実体に書く必要があるので wrangler のまま。

seed は `packages/content/courses/<slug>/` を正本として各講座を D1 に upsert し、GitHub から消えたトピック / セクションは prune する。旧デモ講座 (`web-fundamentals` 等) は安定 UUID で削除する。デプロイ時は `db:seed:remote:content`（検証用 `seed-*` ユーザー / 提出は含めない）。CMS で作った別 ID のコースのレッスンツリーは触らない。

**seed は内容の変わった行だけを書く**（upsert の `do update ... where 列 is not excluded.列 or ...`。`export-seed-sql.ts` の `doUpdate`）。D1 は内容が同じでも書き直した行を書き込み行数に数え、**無料枠は 1 日 10 万行の書き込み**で止まる（2026-10-06 に全行を書き直す seed でデプロイが止まった）。remote の seed はログの最後に D1 が返した `rows_written` の合計を出す。upsert を足すときも `doUpdate` を通し、`export-seed-sql-writes.test.ts`（2 回目の seed は 0 行）を通すこと。

## VS Code 拡張のリリース

`apps/vscode/**` を含む PR が `main` にマージされると `release-vscode.yml` が `.vsix` をパッケージし、
`apps/vscode/package.json` の `version` から作ったタグ `vscode-v<version>` の Release に添付する。
バージョンは手動採番（自動 bump はしない）。同じバージョンのまま再度マージした場合は既存 Release の `.vsix` と本文を上書きする（本文の commit がビルド元。タグは初回リリース時のコミットを指したままなので、タグと実体を一致させたいならバージョンを上げる）。
トリガは `main` への push のみ（`workflow_dispatch` は付けない。任意の ref から未マージのコードでリリースを作れてしまうため）。やり直しは Actions の Re-run で行う。
`.vsix` を出す前に `ci.yml` を `scope: code`（typecheck / test）で呼んで通す（`deploy.yml` の検証ゲートは同じ push で並走するだけで、このジョブを止められないため）。
Marketplace への publish はしない（`.vsix` を落として「Extensions: Install from VSIX...」でインストールする配布形態）。

## 必須ステータスチェック設定

GitHub リポジトリの Settings → Branches → Branch protection rule（`main`）で、
`ci.yml` の 2 つのジョブを **どちらも** **Require status checks to pass** に追加する。

| チェック名 | 内容 |
|-----------|------|
| `verify` | deploy:config:check / typecheck / test / lint / content:check / 図解 lint / build |
| `core-loop` | コア学習ループの E2E スモーク |

`core-loop` を入れ忘れると **E2E が赤のままマージできてしまう**。2 つとも必須にすること。

チェック名は `ci.yml` の **job ID をそのまま**使う（ジョブに `name:` を付けていない）。
表示名を足すとチェック名がそちらに変わり、保護ルールが「存在しないチェック待ち」で
固まるため、ジョブ ID もジョブ名も安易に変えないこと。

※ このチェック名は `ci.yml` が一度でも実行された後でないと候補に現れない。ブランチ保護ルールの設定画面で手入力せず、`ci.yml` を一度実行してから表示されるドロップダウンの候補から選択すること。

> ⚠️ 以前のチェック名は `lint / typecheck / test / build`（`ci.yml` の job 表示名）だった。
> ジョブ ID ベースに変えたので、**既存のブランチ保護ルールは旧名のまま残っていると
> 永久に満たされない**。上の 2 つへ差し替えること。

## Secrets / Variables

Settings → Secrets and variables → Actions で設定する。

設定名の一覧と本番で期待する状態の正本は [`apps/api/deployment.json`](../apps/api/deployment.json)。
`github.variables` を Repository variables、`github.secrets` を Repository secrets に登録する。
`github.optionalSecrets` だけは省略できる。値や API キーはこのファイルに書かない。

`CLOUDFLARE_ACCOUNT_ID` は正本の `accountId` と同じアカウントにする。
`CLOUDFLARE_API_TOKEN` には Workers Scripts Edit / D1 Edit / Account 読み取り / Workers R2 Storage Edit が必要。
`VITE_SERVER_URL` は受講者用の Web のオリジン (`https://stella-web.saedgewell.workers.dev`) で、正本の `healthOrigin` と揃える。
Web の Worker (`apps/web/worker`) が `/api/*` を API へ中継するので、画面と API は同じオリジンになる (ログインの Cookie のため)。
教材の配信 URL は `VITE_MATERIALS_BASE_URL` に入れる。

`BETTER_AUTH_SECRET` (ログインの署名鍵。`openssl rand -base64 32` で作る。変えると全員のセッションが切れる) と
`ANTHROPIC_API_KEY` は deploy が `stella-api` Worker の Secret に同期する。
Google のクライアント (`GOOGLE_CLIENT_ID` は `wrangler.toml`、`GOOGLE_CLIENT_SECRET` は `stella-api` の Secret) は GitHub に置かない。
AI 一次レビューは本番で必須なので、`ANTHROPIC_API_KEY` の未登録・空白はリモート処理前に失敗する。
Cloudflare にだけキーが入っていても、次の deploy に備えて GitHub の Repository secret に同名で登録する。
ローカル開発のキーは `apps/api/.dev.vars` に置く。Git にコミットしない。

`workerSecrets` は機能に必要な Worker 側の Secret 名を記す。
narrator の `GEMINI_API_KEY` は Cloudflare の `stella-narrator` の Settings → Variables and Secrets で Secret として設定する。
GitHub の設定には同期しない。手元から設定する場合は `apps/narrator` で `bunx wrangler secret put GEMINI_API_KEY` を使う。

## Phase C の初回切替とデプロイ前処理

初回のマージは [インフラ移行手順](stella-infrastructure-migration.md) に従い、
メンテナンス告知・旧環境の書き込み停止・D1/R2 の復元・新 Worker の secrets 設定を済ませてから行う。
この変更で既存 JWT は全失効する。通常運用の途中にマージしない。

`deploy:prepare` は最初のリモート処理として `stella-db` を Cloudflare API で検索し、
checkout 内の `apps/api/wrangler.toml` の `database_id` を実 ID に置換する。
教材指紋・seed・migration・API デプロイはすべてこの実 ID を使う。
Git に記録したゼロ UUID はローカル開発専用。実 ID の自動作成・旧 DB へのフォールバックは行わない。
DB が無い、アカウントが違う、`VITE_SERVER_URL` が受講者用の Web のオリジンと一致しない、
教材 URL が未設定の場合は、教材アップロード前にジョブを停止する。
この処理は DB の復元完了や R2 コピーの内容までは保証しない。移行担当者が手順書で照合する。

Google Cloud Console の OAuth 2.0 クライアントには次を登録する (ログインは Better Auth。Issue #117)。

- **Authorized JavaScript origins**: `https://stella-web.saedgewell.workers.dev`
- **Authorized redirect URIs**: `https://stella-web.saedgewell.workers.dev/api/auth/callback/google`

Google が戻るのは Web のオリジンの `/api/auth/callback/google` (Web の Worker が API へ中継する)。
Better Auth がセッションを作って Web の `/auth/callback` へ戻す。旧 URI (`https://stella-api.saedgewell.workers.dev/api/auth/google/callback`) は切り替えを確かめてから消す。

## 失敗時の再デプロイ（自動ロールバックなし）

デプロイは直列で、deploy:prepare → 教材の変更判定 → 画像 → PDF → migrate → 非公開 R2 の確認 → `ANTHROPIC_API_KEY` の同期 → api → seed → 指紋の記録 → web → narrator → deploy:health:check の順で進む。画像・PDF・seed・指紋の記録は教材が変わった場合だけ実行する。api 成功・web 失敗などの部分失敗時に自動ロールバックはしない。

- **web だけ失敗**: 修正 push、または Actions で該当 `deploy.yml` を Re-run。
- **migrate 失敗**: スキーマ側を修正して再 push（api/web は動かない）。
- **seed 失敗**: 教材 seed SQL を修正して再 push（migrate と api/web のデプロイは済んでいる。narrator とヘルスチェックは動かない）。
- **教材画像 upload 失敗**: 画像か R2 認証 (API トークンの R2 権限) を直して再 push（seed 以降は動かない）。
- **教材パイプラインを飛ばした回**: 指紋が前回デプロイと一致した回は画像 / PDF / seed のステップが skipped になる。意図に反して飛んでいたら `bun run content:state:reset:remote` してから Re-run する。
- **手動再デプロイ**: ローカルから
  - API: `bun run deploy:api`
  - Web: `bun run deploy:web`
  - migrate: `bun run db:migrate:remote`
  - seed: `bun run db:seed:remote:content`
  - 教材画像: `bun run content:upload:remote`（サムネイルだけなら `content:upload:thumbnails:remote`）
  - 教材の指紋を消す: `bun run content:state:reset:remote`（次のデプロイが教材パイプラインをフルで流す）
  （復旧時のみ。`deployment.json` の必須入力を用意し、最初に `bun run deploy:prepare` が必要。通常は GitHub Actions を使う）

## PR とデプロイ直後の設定検査

CI の `verify` は `bun run deploy:config:check` で、`deploy.yml` が読む Variables / Secrets の名前を正本と照合する。
追加・削除・綴り違い・動的な名前指定は失敗する。PR では GitHub / Cloudflare の設定値を取得しないので fork でも走る。
GitHub 上で設定が削除されたことまではこの検査で分からない。実際の未登録は `deploy:prepare` がリモート処理前に止める。
すべての `wrangler.*` のアカウントと環境ごとの上書き、API のランタイム用アカウントを `accountId` と照合し、
デプロイではさらに `CLOUDFLARE_ACCOUNT_ID` と照合する。
API / narrator の D1 は binding 名・DB 名・ID を共有する。R2 は正本に記した `LIBRARY_BUCKET` / `BUCKET` という
別名の binding で同じ非公開バケットを指す。narrator の service / entrypoint も検査する。

最後の narrator デプロイ直後に `bun run deploy:health:check` が受講者用 Web の `/api/healthz` (Web の Worker 経由で API) を取り、
正本の `health` の真偽値と照合する。ログイン (Better Auth と Google)・本棚・narrator の疎通・書籍処理・AI 一次レビューは有効、
開発者モードは無効が本番の期待値。欠けた項目や文字列の `"true"` も失敗する。
設定の反映待ちは最大8回、リクエストは1回5秒、間隔は2秒。最後まで食い違えば Actions を失敗にする。
ヘルスチェックは設定の有無だけを返し、キー・設定値・書籍の内容は返さない。AI / OCR / TTS も呼び出さない。
`processingAvailable` は本棚画面と同じ判定で、narrator の応答待ちは3秒で打ち切る。
本番は `narratorGeminiConfigured: true` も必須にする。これは narrator が返す provider が Gemini であることの真偽値で、
キーや provider 名そのものは返さない。`FAKE_PROVIDERS=1` が混入して処理可能になっていても、この項目が `false` なので
デプロイを失敗にする。fake providers はローカルのテストだけに使う。

本棚の機能を意図して無効にする PR では、フラグと `health` の期待値を同じ PR で変更する。
接続障害を「処理無効」と取り違えないよう、処理を止めても `narratorAvailable` は `true` を維持する。
Gemini の設定も維持するため、`narratorGeminiConfigured` の期待値は `true` のままにする。

## 設定検査が失敗したときの復旧

Actions のエラーに出る設定名と真偽値を確認し、GitHub の未登録設定・Worker の Secret・フラグを直して Re-run する。
ヘルスチェック失敗はデプロイ済みの Worker を自動で戻さない。seed や D1 migration もすでに適用済みの場合がある。

直前のコードと設定へ戻す場合は Cloudflare の各 Worker の Deployments で正常だった Version ID を確認し、
復旧担当者が対象を明示して実行する。通常のリリースは引き続き GitHub Actions を使う。

```bash
# リポジトリのルートで実行。ID は対象 Worker の正常だった版に置き換える。
bunx wrangler rollback <api-version-id> --config apps/api/wrangler.toml
bunx wrangler rollback <web-version-id> --config apps/web/wrangler.toml
bunx wrangler rollback <narrator-version-id> --config apps/narrator/wrangler.jsonc
```

ロールバックは D1/R2 のデータを復元しない。削除済みの binding の参照先や Secret の変更によっては戻せないので、
データの復旧は [インフラ移行手順](stella-infrastructure-migration.md) と
[Cloudflare のロールバック仕様](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) を確認する。

書籍の外部処理だけを止めるなら `apps/narrator/wrangler.jsonc` の `LIBRARY_PROCESSING_ENABLED` を `"0"` にし、
正本の `health.processingAvailable` を `false` にして push する。本棚自体を閉じる場合は API の `[vars]` に
`LIBRARY_ENABLED = "0"` を加え、`health.libraryEnabled` と `health.processingAvailable` を `false` にする。
その PR も CI と本番のヘルスチェックを通す。処理の停止では `GEMINI_API_KEY` を削除しない。
緊急に Cloudflare 側でフラグを変更した場合も、次の deploy で戻らないよう Git 側と期待値に同じ変更を入れる。

## 検査の内訳（`verify` ジョブ）

| 検査 | コマンド | 見ているもの |
|------|---------|-------------|
| 設定 | `bun run deploy:config:check` | デプロイの設定名、全 Wrangler のアカウント、API / narrator の共有 binding |
| 型 | `bun run typecheck` | 6 ワークスペースの `tsc --noEmit`。strict + `noUnusedLocals` / `noUnusedParameters` など。**テストと scripts も対象**（`exclude` を持つ tsconfig は無い） |
| テスト | `bun run test:coverage` | Vitest 127 ファイル / 1534 件（`packages/**` と `apps/**/src`・`apps/**/scripts` の `*.test.ts`）。カバレッジは**閾値なし**で数字をジョブサマリに出すだけ |
| lint | `bun run lint` | `biome ci .`（lint + フォーマットの両方）。`noExplicitAny` / `noNonNullAssertion` / `noConsole` / a11y などを error |
| 教材 | `bun run content:check` | 画像リンクの実在・スライド枚数 4〜6・語彙台帳の学習順序・サムネイル規格（16:9 / 800px 以上 / 400KB 以内）・前提グラフ（未知 slug / 自己参照 / 循環） |
| 図解 | `lint-skin.py` | スライド図解 SVG のトークン検査。`content:check` は Node だけで走る検査で打ち切るため、これは別ステップで呼ぶ |
| バンドル | `bun run build` | 成果物を出す web（Vite）と vscode（esbuild）だけ。型は typecheck が見るので、ここで `tsc --noEmit` を重ねない |

`verify` の dist は deploy では使い回せない。`VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL` はビルド時に焼き込む値で、それを持たない `verify` 側の成果物は本番向けではないため。deploy の `deploy:web` は web だけを建て直す（vscode 拡張は web のデプロイに要らない）。

カバレッジに閾値を置いていないのは意図的。落とすためではなく手薄な場所を見えるように
するためで、数字を見ないまま閾値だけ入れると「通すためのテスト」が書かれる。
