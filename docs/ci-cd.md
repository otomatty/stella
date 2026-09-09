# CI / CD

GitHub Actions を単一基盤とする。CI は認証不要、CD は `main` push のみ。

## ワークフロー

| ファイル | トリガ | 内容 |
|---------|--------|------|
| `.github/workflows/ci.yml` | `pull_request`（全ブランチ） + `workflow_call` | **検証ゲートの正本**。`verify` ジョブ（typecheck → test → lint → content:check → 図解 lint → build）と `core-loop` ジョブ（E2E スモーク）の 2 本 |
| `.github/workflows/deploy.yml` | `main` への push | `ci.yml` を呼ぶ（`verify` + `core-loop`）→ 教材の変更判定 →〔教材が変わっていれば R2 教材画像 upload(remote) → 教材 PDF sync(remote)〕→ D1 migrate(remote) → deploy:api →〔教材が変わっていれば D1 seed(remote) → 指紋の記録〕→ deploy:web |
| `.github/workflows/release-vscode.yml` | `main` への push（`apps/vscode/**` 変更時） | `ci.yml` を `scope: code` で呼ぶ → `.vsix` をビルドして GitHub Releases（タグ `vscode-v<version>`）に添付 |

検証ゲートの定義は `ci.yml` の 1 か所だけに置き、`deploy.yml` / `release-vscode.yml` は
`uses: ./.github/workflows/ci.yml` で呼ぶ。3 つのワークフローに同じ手順を書き写すと、
片方だけ直したときに黙って乖離するため（実際、`content:check` の追加がこの表から漏れていた）。
`ci.yml` 自体は `main` push を起動しない（`deploy.yml` からの呼び出しで走る）。

`scope` 入力は呼び出し側がゲートの範囲を選ぶためのもの。

| `scope` | 走るもの | 使う場所 |
|---------|----------|---------|
| `full`（既定） | verify の全ステップ + core-loop | `pull_request`、`deploy.yml` |
| `code` | typecheck + test のみ | `release-vscode.yml`（`.vsix` を出す前の最小確認） |

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
| `packages/content` | 教材の正本・PDF 変換スクリプト・skin・サムネイル |
| `packages/shared/src` | 講座マニフェスト / クイズ / 面談質問 / 演習課題 |
| `packages/shared/scripts` | `export-seed-sql.ts` そのもの |
| `apps/web/src/data` | `export-seed-sql` が読む `TENANTS` と型 |
| `apps/api/scripts` | `seed-d1.ts` と分割・適用のロジック |
| `apps/api/drizzle` | migration。新しい列を seed が埋める形の変更があるので、スキーマが動いた push では教材が同じでも seed を流す |
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
| `verify` | typecheck / test / lint / content:check / 図解 lint / build |
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

**Secrets（Repository secrets）**

| 名前 | 用途 |
|------|------|
| `CLOUDFLARE_API_TOKEN` | Wrangler デプロイ/マイグレーション認証。権限は Workers Scripts Edit / D1 Edit / Account 読み取り（最小権限） |
| `CLOUDFLARE_ACCOUNT_ID` | 対象アカウント ID |

**Variables（Repository variables）**

| 名前 | 用途 |
|------|------|
| `VITE_SERVER_URL` | Web ビルド時に焼き込む API のベース URL |
| `VITE_MATERIALS_BASE_URL` | Web ビルド時に焼き込む教材配信ベース URL |

## Phase C の初回切替とデプロイ前処理

初回のマージは [インフラ移行手順](stella-infrastructure-migration.md) に従い、
メンテナンス告知・旧環境の書き込み停止・D1/R2 の復元・新 Worker の secrets 設定を済ませてから行う。
この変更で既存 JWT は全失効する。通常運用の途中にマージしない。

`deploy:prepare` は最初のリモート処理として `stella-db` を Cloudflare API で検索し、
checkout 内の `apps/api/wrangler.toml` の `database_id` を実 ID に置換する。
教材指紋・seed・migration・API デプロイはすべてこの実 ID を使う。
Git に記録したゼロ UUID はローカル開発専用。実 ID の自動作成・旧 DB へのフォールバックは行わない。
DB が無い、アカウントが違う、`VITE_SERVER_URL` が新 API URL と一致しない、
教材 URL が未設定の場合は、教材アップロード前にジョブを停止する。
この処理は DB の復元完了や R2 コピーの内容までは保証しない。移行担当者が手順書で照合する。

Google Cloud Console の OAuth 2.0 クライアントには次を登録する。

- **Authorized JavaScript origins**: `https://stella-web.saedgewell.workers.dev`
- **Authorized redirect URIs**: `https://stella-api.saedgewell.workers.dev/api/auth/google/callback`

Google のコールバック先は API。Web の `/auth/callback` は API が JWT を返す宛先であり、
Google に登録する URI ではない。切替後は旧オリジンと旧 API callback を削除する。

## 失敗時の再デプロイ（自動ロールバックなし）

デプロイは直列（教材の変更判定 → 画像 → PDF → migrate → api → seed → 指紋の記録 → web）で、api 成功・web 失敗などの部分失敗時に自動ロールバックはしない。

- **web だけ失敗**: 修正 push、または Actions で該当 `deploy.yml` を Re-run。
- **migrate 失敗**: スキーマ側を修正して再 push（api/web は動かない）。
- **seed 失敗**: 教材 seed SQL を修正して再 push（migrate は済んでいる。api/web は動かない）。
- **教材画像 upload 失敗**: 画像か R2 認証 (API トークンの R2 権限) を直して再 push（seed 以降は動かない）。
- **教材パイプラインを飛ばした回**: 指紋が前回デプロイと一致した回は画像 / PDF / seed のステップが skipped になる。意図に反して飛んでいたら `bun run content:state:reset:remote` してから Re-run する。
- **手動再デプロイ**: ローカルから
  - API: `bun run deploy:api`
  - Web: `bun run deploy:web`
  - migrate: `bun run db:migrate:remote`
  - seed: `bun run db:seed:remote:content`
  - 教材画像: `bun run content:upload:remote`（サムネイルだけなら `content:upload:thumbnails:remote`）
  - 教材の指紋を消す: `bun run content:state:reset:remote`（次のデプロイが教材パイプラインをフルで流す）
  （復旧時のみ。`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `VITE_*` を用意し、最初に `bun run deploy:prepare` が必要。通常は GitHub Actions を使う）

## 検査の内訳（`verify` ジョブ）

| 検査 | コマンド | 見ているもの |
|------|---------|-------------|
| 型 | `bun run typecheck` | 6 ワークスペースの `tsc --noEmit`。strict + `noUnusedLocals` / `noUnusedParameters` など。**テストと scripts も対象**（`exclude` を持つ tsconfig は無い） |
| テスト | `bun run test:coverage` | Vitest 127 ファイル / 1534 件（`packages/**` と `apps/**/src`・`apps/**/scripts` の `*.test.ts`）。カバレッジは**閾値なし**で数字をジョブサマリに出すだけ |
| lint | `bun run lint` | `biome ci .`（lint + フォーマットの両方）。`noExplicitAny` / `noNonNullAssertion` / `noConsole` / a11y などを error |
| 教材 | `bun run content:check` | 画像リンクの実在・スライド枚数 4〜6・語彙台帳の学習順序・サムネイル規格（16:9 / 800px 以上 / 400KB 以内）・前提グラフ（未知 slug / 自己参照 / 循環） |
| 図解 | `lint-skin.py` | スライド図解 SVG のトークン検査。`content:check` は Node だけで走る検査で打ち切るため、これは別ステップで呼ぶ |
| バンドル | `bun run build` | 成果物を出す web（Vite）と vscode（esbuild）だけ。型は typecheck が見るので、ここで `tsc --noEmit` を重ねない |

`verify` の dist は deploy では使い回せない。`VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL` はビルド時に焼き込む値で、それを持たない `verify` 側の成果物は本番向けではないため。deploy の `deploy:web` は web だけを建て直す（vscode 拡張は web のデプロイに要らない）。

カバレッジに閾値を置いていないのは意図的。落とすためではなく手薄な場所を見えるように
するためで、数字を見ないまま閾値だけ入れると「通すためのテスト」が書かれる。
