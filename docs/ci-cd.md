# CI / CD

GitHub Actions を単一基盤とする。CI は認証不要、CD は `main` push のみ。

## ワークフロー

| ファイル | トリガ | 内容 |
|---------|--------|------|
| `.github/workflows/ci.yml` | `pull_request`（全ブランチ） + `workflow_call` | **検証ゲートの正本**。`verify`（deploy:config:check → typecheck → test → lint → content:check → 図解 lint → build）、`core-loop`（API スモーク）、`e2e`（PR のブラウザー E2E とリリースのお知らせ用スクリーンショットの撮影） |
| `.github/workflows/deploy.yml` | `main` への push | `ci.yml` を呼ぶ（`verify` + `core-loop`）→ deploy:prepare → 教材の変更判定 →〔教材が変わっていれば R2 教材画像 upload(remote) → 教材 PDF sync(remote)〕→ D1 migrate(remote) → 教材 R2 の CORS → `BETTER_AUTH_SECRET`・`ANTHROPIC_API_KEY`・任意の `OPENAI_API_KEY` の同期 → deploy:api →〔教材が変わっていれば D1 seed(remote) → 指紋の記録〕→ deploy:web → deploy:health:check → 本棚 R2 の片付け (失敗してもデプロイは成功) → Web の新しい版のスクリーンショットを撮影・公開し、GitHub Release に更新の要点を添付 |
| `.github/workflows/videos.yml` | 手動 (`workflow_dispatch`、main のみ) | 教材動画。既定は台帳に今の内容ハッシュが無いトピック。`stage` / `topics` / `force` / `dry_run`。作る前に Gemini TTS の回数を数え、`VIDEO_TTS_DAILY_LIMIT` (既定 100) の残りを超えるなら作らない。manifest があれば、本番の教材指紋が一致するときだけ D1 の既存レッスンの動画列を更新する。`concurrency` は `lesson-videos` (`cancel-in-progress: false`)。deploy の `deploy-main` とは分ける |
| `.github/workflows/release-vscode.yml` | `main` への push（`apps/vscode/**` 変更時） | `ci.yml` を `scope: code` で呼ぶ → 新しい版のスクリーンショットを撮影・公開 → `.vsix` を GitHub Release（タグ `vscode-v<版>`）に添付 → 未掲載の版を Visual Studio Marketplace へ Trusted Publishing（`vsce publish --oidc`）で公開 → 公開できた版の Release に更新の要点を添付 |
| `.github/workflows/release-announce.yml` | 毎日 7:50（日本時間）または手動（main のみ） | 送信待ちの版をまとめて Google Chat に投稿（任意） |

検証ゲートの定義は `ci.yml` の 1 か所だけに置き、`deploy.yml` / `release-vscode.yml` は
`uses: ./.github/workflows/ci.yml` で呼ぶ。3 つのワークフローに同じ手順を書き写すと、
片方だけ直したときに黙って乖離するため（実際、`content:check` の追加がこの表から漏れていた）。
`ci.yml` 自体は `main` push を起動しない（`deploy.yml` からの呼び出しで走る）。

`scope` 入力は呼び出し側がゲートの範囲を選ぶためのもの。

| `scope` | 走るもの | 使う場所 |
|---------|----------|---------|
| `full`（既定） | verify の全ステップ + core-loop、PR では e2e も実行 | `pull_request`、`deploy.yml` |
| `code` | deploy:config:check + typecheck + test | `release-vscode.yml`（`.vsix` を出す前の最小確認） |

**E2E（`core-loop`）は `deploy.yml` の経路にも入っている。** PR で通っていても、
マージ後の main の組み合わせで一度も E2E を通さずにデプロイする、という穴を塞ぐため。
そのぶんデプロイ完了までの時間は core-loop ジョブ 1 本ぶん（数分）伸びる。

## ブラウザー E2E（`e2e` ジョブ）

PR ごとにローカル D1 を migration・seed し、`wrangler dev` の API と本番と同じ方法でビルドした Web を Playwright で動かす。受講者のホーム（受講中・未着手）とレッスンのまとめ、管理者のレビューとステージ管理、確認ダイアログの表示・取り消しを確認する。PC 幅・スマホ幅のライト・ダークで実行し、ホーム・まとめ・レビュー・確認ダイアログの画像を比較する。ブランチ保護の必須チェックには設定していない。

基準画像がない場合、CI が画像を書き出す。PR の Actions 成果物 `e2e-screenshots` を展開し、画像を確認して、ディレクトリ構造を保ったまま `apps/web/e2e/__screenshots__/` にコミットする。画面を意図して変更した場合は該当の基準画像を削除して PR を更新し、CI が書き出した画像を確認してコミットする。比較に失敗した場合は `e2e-failure` に差分画像と HTML レポートが出る。失敗したテストのトレース・スクリーンショット・動画もここで確認できる。

手元では `apps/api/.dev.vars` を用意し、`ALLOWED_ORIGINS` に `http://127.0.0.1:4173,http://localhost:4173` を追加する。ローカル D1 に `bun run db:migrate` と `bun run db:seed` を適用し、別のターミナルで `bun run dev:api` を起動してから次を実行する。

```bash
E2E_CHROMIUM_PATH=/path/to/chromium bun run --filter=@stella/web e2e
```

Playwright がインストールした Chromium を使う場合は `E2E_CHROMIUM_PATH` を省ける。手元で書き出した画像は CI の Ubuntu とフォールバックフォントの字形が異なるため、CI が書き出した画像を基準にする。

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
| `packages/content/stages` と規則・スキル・パターン・環境・参照元の台帳 | 教材の正本。seed SQL と PDF・図解の中身 |
| 生成コードが値として import しているファイル (`SEED_INPUT_PATHS`) | `export-seed-sql.ts`、PDF / 画像の変換、旧演習の課題定義 (`packages/shared/src/problems`。README とテストは除く)、seed の適用 (`seed-d1.ts`)、`packages/content/package.json` の依存の版 (playwright / remark など)。型だけの import は見ない。`bun.lock` 全体は見ない。値 import を足したのに一覧に無いと `content-fingerprint.test.ts` が落とす |
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

教材画像 (図解 SVG + ステージサムネイル) は seed の**前**に R2 へ流す。D1 が指す先が先に存在している必要があるため、順序を入れ替えないこと。put は冪等なので、走るときは毎回全件流す（差分台帳は持たない — 図解 SVG のキーは内容ハッシュではないので、台帳が唯一の真実になると `r2:orphans` で消したオブジェクトを「put 済み」として飛ばしてしまう）。remote の put は Cloudflare API 直叩き（`packages/content/scripts/lib/r2.ts`）で、同時 8 本・失敗は 3 回まで再試行して 126 件が十数秒。`wrangler r2 object put` を 1 ファイルにつき 1 プロセス起こしていた頃は、ここだけで 2 分半かかっていた。local (`--local`) はバケットの実体が miniflare の永続ディレクトリなので wrangler のまま。サムネイルの R2 キーは内容ハッシュ入り (`tenant/<tenantId>/courses/<slug>/thumbnail-<hash>.webp`) で、旧世代は `bun run r2:orphans` の棚卸しで掃除する。

このステップは `CLOUDFLARE_API_TOKEN` に **Workers R2 Storage: Edit** 権限を要求する。権限が無いとここで落ち、seed 以降は動かない（D1 が存在しない画像を指すことはない）。

教材動画は deploy では作らない。`.github/workflows/videos.yml` を main で手動実行する。入力は `stage` (任意の slug。空なら全ステージ)、`topics` (任意。トピック ID のカンマ区切り。例 `1-1-9,1-2-3`。`stage` が必須)、`force` (既定 false。`topics` を指定したときだけ、台帳にあっても別の R2 キーへ作り直す)、`dry_run` (既定 false。対象のトピックと必要な TTS の回数・残りを出すだけで、何も作らず R2 と D1 に書かない)。既定の対象は、公開 R2 の台帳 `lesson-video/state.json` に今の内容ハッシュの動画が無いトピックである。

作る前に Gemini TTS の呼び出し回数を数える。新方式 (`video.json`) は場面ごとに 1 回、旧方式 (`narration.json`) はトピックごとに 1 回で、`dist/video-cache` に同じ音声があれば数えない。残りの下限は 0 回。必要な回数が残りを超えるときは、生成と書き込みを始める前に失敗する。台帳からの再登録や収録版など、必要回数が 0 の処理は続ける。トピックごとの回数と合計・残りをジョブのサマリに出し、`topics` で絞るよう案内する。`dry_run` は同じ表を出して終える。上限は `VIDEO_TTS_DAILY_LIMIT` (既定 100)。リポジトリの Variables にあれば workflow が渡す。`apps/api/deployment.json` には載せない (deploy.yml が読まないため)。使った回数 (失敗した呼び出しを含む) は台帳の `ttsUsage` に、呼び出した時点の太平洋時間の日付 (`YYYY-MM-DD`) ごとに足す。合成の計測開始後は、途中で失敗した場合も台帳を一度保存する。台帳がまだ存在しないときは空から始め、取得エラーや不正な台帳が見つかったときは生成前に失敗する。この回数は `video:sync` の呼び出しだけを数える。手元の `--tts gemini` や、同じ API キーの別用途は数えない。実行中に 429 で 1 日の上限に当たったら、その場で止める。

`GEMINI_API_KEY` は videos.yml だけが読む Repository Secret で、API Worker には同期しない。`deployment.json` の対象外である。manifest ができると `packages/shared/scripts/register-lesson-videos.ts` に `VIDEO_MANIFEST` を渡す。成功したトピックは既存行の `video_path` と `video_scenes` を更新し、`video_issue` を解除する。失敗したトピックは配信中の動画を保持し、`video_issue` に理由を記録する (管理者の画面に表示)。レッスンの UUID は seed と同じ方法で求める。ffmpeg は Ubuntu ランナーのものを使い、無ければ apt で導入する。

`concurrency` は `lesson-videos` (`cancel-in-progress: false`) で、deploy の `deploy-main` とは分ける。GitHub Actions は `cancel-in-progress: false` でも、同じグループの待機中の実行を 1 つしか残さず、あとから来た実行が待機中の実行を取り消す。グループを共有すると、デプロイの実行中に動画を始めると待機中のデプロイが取り消される (またはその逆)。

登録の直前に、deploy と同じ方法 (D1 の ID と `PDF_KEY_SALT` を含む) で計算した教材指紋を、R2 の `deploy/content-state.json` と照合する。教材が変わるデプロイは、処理の開始時に前回の指紋を消し、seed が成功したあとに指紋を記録する。指紋が無い、読めない、または一致しないときは動画を登録せずジョブが失敗する。デプロイ完了後、同じ内容で `force` を外して再実行すれば、作成済みの動画は台帳から読み上げを使わずに登録できる。

公開 R2 の `lesson-video/ses/<slug>/<lessonId>/<hash>.mp4` と同名の `.vtt`・`.jpg` を、`lesson-video/state.json` の台帳と照合して不足分を生成・アップロードする。強制作成では内容ハッシュに版の接尾辞を付け、台帳と manifest に新しい版を記録する。旧版は残る。manifest のキーは `<slug>/<トピックID>` とする。deploy の seed は動画の manifest を渡さず、台本が残るトピックの既存動画を保持する。台本が消えたトピックは seed が参照を外す。字幕・ポスターは Web が拡張子を置き換えて参照する。

デプロイは毎回、教材の公開バケット `stella-materials-public` に CORS (本番の Web とローカルの 5173 から GET/HEAD) を設定する。無いと動画・字幕・表紙をブラウザーが読み込まない。

手元は ffmpeg と Playwright Chromium (`bunx --bun playwright install chromium`) を用意し、`bun run content:video -- dev-env-basics --tts fake` で生成だけを確認できる。台本を置いてから実行する。配信まで確認する場合は `bun run --filter=@stella/content video:sync dev-env-basics --tts fake` (local R2) → `VIDEO_MANIFEST=$PWD/packages/content/dist/video-manifest.json bun run db:seed`。R2 の認証とバケットは PDF と共通。スライドのレッスンと公開 `/start` は「動画」「スライド」を切り替えられ、字幕は既定でオン。受講者のレッスン画面では動画を 9 割まで見るとレッスンが完了になる。`/start` は進捗を記録しない。

動画の方式はトピックごとに `video.json` → 収録版 (`screen.*`) → スライド版 (`narration.json`) の順で選ぶ。新方式は音声合成・ブラウザ起動の前に内容ハッシュを計算し、台帳に動画・字幕・ポスターがあれば生成を省く。ハッシュは正規化した `boards`・`scenes`・イラストの領域、実際の読み上げ文 (読み辞書適用後)、音声のモデル・声・話し方、間の定数、使うショット・クリップ・イラストの中身、描画・配置・時刻・書き出しのコードとフォントを含む。`brief`・`polish`・イラストの `prompt` は含めない。公開用の `video:sync` は `--tts-model`・`VIDEO_TTS_MODEL` を受け付けず、`narration/voice.json` のモデルを使う。

新方式の Gemini 合成は場面ごとに 1 回 (分割の検査で失敗した場合は再試行。再試行は事前の回数に含めず、呼んだあとに台帳へ足す) で、場面の音声と映像は `dist/video-cache` に内容ハッシュで置く。videos.yml は `actions/cache/restore` で復元し、生成を始めた実行は失敗時も `actions/cache/save` で保存する。生成の失敗はジョブに反映する。キャッシュが無い・壊れている場合は作り直す。`video:sync` の終了時に使用したファイルの更新時刻を更新し、今回使わず最終更新から30日を超えたクリップ・音声を削除する。上限超えと `dry_run` ではキャッシュを消さない。

seed は SQL を D1 の 100KB/query に収まるチャンクへ割って**直列に**適用する（FK 順と upsert 順があるので並列にしないこと）。remote は 1 プロセスから D1 の HTTP API (`/query`) を叩く（`apps/api/scripts/lib/d1-remote.ts`）。チャンクごとに `bunx wrangler d1 execute` を起こしていた頃は、D1 上の実行時間が合計 4 秒なのに壁時計が 8 分半で、差はすべて CLI の起動と通信だった。途中で落ちたら何チャンク目かを出して失敗させる（「成功したことにしない」）。HTTP 側で問題が出たときは `cd apps/api && bun run scripts/seed-d1.ts --remote --content-only --wrangler` で旧経路（チャンクごとに `wrangler d1 execute`）に戻せる。local (`--local`) は miniflare の実体に書く必要があるので wrangler のままで、チャンクに割らず全文を 1 回で流す（起動だけで 1 回 3〜4 秒かかるので、チャンクごとに起こすと 20 分を超える）。

seed は `packages/content/stages/<slug>/` を正本として各ステージを D1 に upsert し、GitHub から消えたトピック / セクションは prune する。旧デモのステージ (`web-fundamentals` 等) は安定 UUID で削除する。デプロイ時は `db:seed:remote:content` を使い、remote の seed は常に教材だけを適用する。検証用の `seed-*` ユーザー・提出・受講登録は local の `db:seed` だけが作る。CMS で作った別 ID のコースのレッスンツリーは触らない。

**seed は内容の変わった行だけを書く**（upsert の `do update ... where 列 is not excluded.列 or ...`。`export-seed-sql.ts` の `doUpdate`）。D1 は内容が同じでも書き直した行を書き込み行数に数え、**無料枠は 1 日 10 万行の書き込み**で止まる（2026-10-06 に全行を書き直す seed でデプロイが止まった）。remote の seed はログの最後に D1 が返した `rows_written` の合計を出す。upsert を足すときも `doUpdate` を通し、`export-seed-sql-writes.test.ts`（2 回目の seed は 0 行）を通すこと。

本棚の廃止 (2026-11) に伴い、D1 の本棚の表は `0080_integration_events` の後の `0081_drop_personal_library` で削除する。最後に `retire-library-storage.ts` が非公開 R2 `stella-library-private` を削除する。空でなければ、全オブジェクトの削除と未完了のマルチパートアップロードの中止を作成から 1 日で行うライフサイクルを設定し、次のデプロイで削除を再試行する。この step は `continue-on-error: true` で、失敗してもアプリのデプロイは成功のまま。バケットが消えたら step とスクリプトを削除してよい。

## リリースと更新のお知らせ

新しい版を出すときは、対象の `package.json`（`apps/vscode` または `apps/web`）の `version` を手で上げ、同じ PR で同じディレクトリの `CHANGELOG.md` の一番上に `## [版] - YYYY-MM-DD` の節を足す。受講者・管理者から見える変化を箇条書きで書く。現在の版に空でない節があることを `verify` のテストで確かめる。

- **VS Code 拡張**は `apps/vscode/**` の変更が `main` に入ると、`release-vscode.yml` が `ci.yml` を `scope: code` で呼んでから `.vsix` をビルドし、タグ `vscode-v<版>` の Release に添付する。同じ版の再 push では初回のタグと Release 本文を保持し、`.vsix` を差し替える。添付した `.vsix` の表示ラベルには、そのファイルのビルド元のコミットを付ける。
- **Web 本体**は `main` への push で本番反映と health check が通ったあと、`deploy.yml` の `release-web` がタグ `web-v<版>` の Release を作る。同じ版の再デプロイでは既存の Release をそのまま使う。Release の作成と同時にタグを切るので、作成に失敗した版は次のデプロイで再試行される。

Release の本文は CHANGELOG の該当節を AI で要約し、全文も折りたたみに残す。既定のモデルは `claude-opus-5-5` で、`prepare` を実行する環境の `RELEASE_NOTES_MODEL` で変更できる。要約用の `ANTHROPIC_API_KEY` が空か、要約に失敗した場合は、該当節をそのまま本文に使う。

Google Chat のお知らせは毎日 7:50（日本時間）に起動する。GitHub の定時実行は遅れることがある。送信待ちの版を 1 つのスレッドにまとめ、親メッセージには更新のお知らせと製品ごとの最新版を載せる。CHANGELOG の項目は書いた文章のままカードで 1 通ずつ返信し、公開 URL があるスクリーンショットはカードに添える。項目の文章は AI 要約を使わない。最後に製品ごとの反映方法と Release へのリンクを返信する。スレッドは合計 30 通までとし、省略した項目があれば最後の案内の直前に残りの件数を載せる。送る版が無い日は投稿しない。VS Code 拡張は Marketplace に公開できた版だけを載せる。

VS Code 拡張の Release を作るときは `release-summary.pending.json` を添付し、Marketplace に公開できたら同じ要点を `release-summary.json` として添付する。公開や添付に失敗しても、再実行時に Release の添付を確認して続きから進める。

Release に `release-summary.json` があり、`release-announced.json` が無い版を送信待ちとする。送信待ちのタグの組み合わせから `threadKey` を作り、各メッセージの `messageId` はそのハッシュと通し番号で決める。途中で送信に失敗したら印を付けずに止める。同じタグの組み合わせで再実行すると同じ ID で送り直し、HTTP 409 は送信済みとして次の投稿へ進む。全通を送れたら、対象の各 Release に `release-announced.json` を添付する。印の添付が一部だけ失敗した場合など、再実行時に送信待ちの版が変わると、新しいスレッドに重ねて載ることがある。今すぐ送るには、Actions の「Release announcement」で **Run workflow** を選ぶ（main のみ）。

Chat のスペースの「アプリと統合」→「Webhook」で作った URL を Repository secret `GOOGLE_CHAT_WEBHOOK_URL` に登録する。未設定の場合は送信待ちのまま残る。

リリースのトリガは `main` への push のみ。やり直しは Actions の Re-run で行う。

受講者への配布は Visual Studio Marketplace に寄せる（Web の「VS Code で開く」で VS Code がインストールを尋ねる。受講者に `.vsix` を配らない）。Marketplace への公開もこのワークフローが行う。Release に付けた `.vsix` を `vsce publish --oidc --packagePath` で出し、同じ版は `--skip-duplicate` で飛ばす。認証は GitHub Actions の OIDC で、PAT は置かない。初回だけ、publisher `saedgewell` の Trusted Publishing に owner `otomatty`、repository `stella`、workflow `release-vscode.yml`、environment なしを登録する（手順は `apps/vscode/README.md` の「Marketplace 公開」）。Release の `.vsix` は控え。

### スクリーンショットの撮影

お知らせに画面を添えるときは、CHANGELOG の該当項目に `![説明](shot:名前)` を単独の行で書く。場面の登録簿は [Web](../apps/web/release-shots/scenarios.ts) と [VS Code 拡張](../apps/vscode/scripts/release-shots/scenarios.ts) にある。新しい場面を使うときは、同じ PR で製品の登録簿にも追加する。

PR では `e2e` ジョブが、両製品の現在の版の CHANGELOG に指定された場面をブラウザー E2E の後で撮る。画像は Actions の成果物 `release-shots` で確認できる。新しい版のリリースでは撮り直して公開 R2 にアップロードし、画像の URL を Release 本文と Google Chat のお知らせに使う。撮影の準備・撮影・アップロードに失敗した場合は画像なしでリリースを続ける。同じ版の再 push で Release が作成済みなら撮影を省く。

Web は 1280×800、VS Code 拡張は WebView の場面ごとの幅と高さで撮る。共通の設定はライトテーマ、倍率 2、日本語（`ja-JP`）、日本時間（`Asia/Tokyo`）。アニメーションを止め、入力欄のキャレットを隠す。撮影対象を指定した場合は四辺に 24 px の余白を付け、ページ内に収める。強調箇所にはオレンジ色の枠を付ける。

手元で撮るには Playwright の Chromium と日本語フォント（Noto Sans CJK JP など）を用意する。Web は `apps/api/.dev.vars.example` を `apps/api/.dev.vars` にコピーし、`AUTH_JWT_SECRET` と `ALLOWED_ORIGINS` を確認する。`ALLOWED_ORIGINS` には `http://127.0.0.1:4173` を追加する。リポジトリのルートで `bun run db:migrate` と `bun run db:seed` を実行し、別の端末で `bun run dev:api` を起動してから撮影する。

```sh
RELEASE_SHOTS=learner-home RELEASE_SHOTS_OUT=/tmp/shots bun run --filter=@stella/web release:shots
RELEASE_SHOTS=submission-form RELEASE_SHOTS_OUT=/tmp/shots bun run --filter=stella-lms release:shots
```

両方の製品を撮るときは、アップロード時に画像が混ざらないよう撮影先を分ける。

`bun run release:shots list --changelog <path> --version <版>` は撮影する名前をカンマ区切りで出す。撮影後は `bun run release:shots upload --product <web|vscode> --version <版> --dir <撮影先> --out <images.json>` で教材と同じ公開バケット `stella-materials-public` にアップロードする。R2 のキーは `release-notes/<product>/<版>/<名前>-<内容の SHA-256 の先頭 16 文字>.png`。公開 URL は HTTPS の `MATERIALS_BASE_URL` の末尾のスラッシュを除いた値に `/` とキーをつないだもの。アップロードは `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を使い、`release:notes prepare --images` に渡す JSON を出力する。

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
`CLOUDFLARE_API_TOKEN` には Workers Scripts Edit / D1 Edit / Account 読み取り / Workers R2 Storage Edit / Workers KV Storage Edit が必要。KV は `OAUTH_KV`（`stella-oauth`）を API の Worker にバインドするため。
`VITE_SERVER_URL` は受講者用の Web のオリジン (`https://stella.saedgewell.workers.dev`) で、正本の `healthOrigin` と揃える。
Web の Worker (`apps/web/worker`) が `/api/*` を API へ中継するので、画面と API は同じオリジンになる (ログインの Cookie のため)。旧ホスト `stella-web` は同じ `deploy:web` で新しいオリジンへ 308 する (`apps/web/wrangler.legacy.toml`)。
教材の配信 URL は `VITE_MATERIALS_BASE_URL` に入れる。
Web と VS Code 拡張のリリースワークフローも、スクリーンショットを公開 R2 にアップロードするときに `CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`・`VITE_MATERIALS_BASE_URL` を読む。

`BETTER_AUTH_SECRET` (ログインの署名鍵。`openssl rand -base64 32` で作る。変えると全員のセッションが切れる) と
`ANTHROPIC_API_KEY` は deploy が `stella-api` Worker の Secret に同期する。
Google のクライアント (`GOOGLE_CLIENT_ID` は `wrangler.toml`、`GOOGLE_CLIENT_SECRET` は `stella-api` の Secret) は GitHub に置かない。
`ANTHROPIC_API_KEY` は既存のチャット・下書き・育成メモにも使うため、未登録・空白はリモート処理前に失敗する。
`OPENAI_API_KEY` は任意の Repository secret として同期する。一次レビューに `AI_REVIEW_PROVIDER = "openai"` を選んだ場合は `AI_REVIEW_MODEL` とこのキーもリモート処理前に検査する。設定は `apps/api/wrangler.toml`、比較と切り替えは [AI 一次レビューのプロバイダー](ai-review-providers.md) を参照。
`GOOGLE_CHAT_WEBHOOK_URL` はリリース通知用の任意の Repository secret。未設定なら Google Chat への投稿を省略する。
`release-announce.yml` が読む。`apps/api/deployment.json` は `deploy.yml` が読む設定だけを管理するため、この Secret は掲載対象外。
`GEMINI_API_KEY` と `VIDEO_TTS_DAILY_LIMIT` も同様に掲載対象外である。前者は Lesson videos の Secret、後者は任意の Variable (未設定なら 100) で、deploy.yml はどちらも読まない。
Cloudflare にだけキーが入っていても、次の deploy に備えて GitHub の Repository secret に同名で登録する。
ローカル開発のキーは `apps/api/.dev.vars` に置く。Git にコミットしない。

`workerSecrets` は機能に必要な Worker 側の Secret 名を記す。

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

- **Authorized JavaScript origins**: `https://stella.saedgewell.workers.dev`
- **Authorized redirect URIs**: `https://stella.saedgewell.workers.dev/api/auth/callback/google`

Google が戻るのは Web のオリジンの `/api/auth/callback/google` (Web の Worker が API へ中継する)。
Better Auth がセッションを作って Web の `/auth/callback` へ戻す。前の画面オリジン (`https://stella-web.saedgewell.workers.dev` とその `/api/auth/callback/google`) と、旧 URI (`https://stella-api.saedgewell.workers.dev/api/auth/google/callback`) は、新しいオリジンでログインできるのを確かめてから消す。

## 失敗時の再デプロイ（自動ロールバックなし）

デプロイは直列で、deploy:prepare → 教材の変更判定 → 画像 → PDF → migrate → 教材 R2 の CORS → `BETTER_AUTH_SECRET`・`ANTHROPIC_API_KEY`・任意の `OPENAI_API_KEY` の同期 → api → seed → 指紋の記録 → web → deploy:health:check → 本棚 R2 の片付けの順で進む。画像・PDF・seed・指紋の記録は教材が変わった場合だけ実行する。動画はこの順に入らない。api 成功・web 失敗などの部分失敗時に自動ロールバックはしない。

- **web だけ失敗**: 修正 push、または Actions で該当 `deploy.yml` を Re-run。
- **migrate 失敗**: スキーマ側を修正して再 push（api/web は動かない）。
- **seed 失敗**: 教材 seed SQL を修正して再 push（migrate と api のデプロイは済んでいる。web とヘルスチェックは動かない）。
- **教材画像 upload 失敗**: 画像か R2 認証 (API トークンの R2 権限) を直して再 push（seed 以降は動かない）。
- **教材動画**: deploy では作らない。Actions の Lesson videos を手動実行する。上限を超えると 1 本も作らず失敗する。一部失敗した回は、できた動画を seed し、ジョブは失敗にする。429 で 1 日の上限に当たったらその場で止める。seed の直前にチェックアウトした commit が `origin/main` の先頭と違えば、seed を飛ばして失敗する。作った動画は台帳にあるので、もう一度実行すれば読み上げを使わずに登録だけを行う。
- **教材パイプラインを飛ばした回**: 指紋が前回デプロイと一致した回は画像 / PDF / seed のステップが skipped になる。意図に反して飛んでいたら `bun run content:state:reset:remote` してから Re-run する。動画は指紋では再実行しない。
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
API の D1 は正本の binding 名・DB 名を使い、ID を持つことを検査する。

最後の web デプロイ直後に `bun run deploy:health:check` が受講者用 Web の `/api/healthz` (Web の Worker 経由で API) を取り、
正本の `health` の真偽値と照合する。ログイン (Better Auth と Google)・AI 一次レビューは有効、
開発者モードは無効が本番の期待値。欠けた項目や文字列の `"true"` も失敗する。
設定の反映待ちは最大8回、リクエストは1回5秒、間隔は2秒。最後まで食い違えば Actions を失敗にする。
ヘルスチェックは設定の有無だけを返し、キー・設定値は返さない。AI も呼び出さない。

## 設定検査が失敗したときの復旧

Actions のエラーに出る設定名と真偽値を確認し、GitHub の未登録設定・Worker の Secret・フラグを直して Re-run する。
ヘルスチェック失敗はデプロイ済みの Worker を自動で戻さない。seed や D1 migration もすでに適用済みの場合がある。

直前のコードと設定へ戻す場合は Cloudflare の各 Worker の Deployments で正常だった Version ID を確認し、
復旧担当者が対象を明示して実行する。通常のリリースは引き続き GitHub Actions を使う。

```bash
# リポジトリのルートで実行。ID は対象 Worker の正常だった版に置き換える。
bunx wrangler rollback <api-version-id> --config apps/api/wrangler.toml
bunx wrangler rollback <web-version-id> --config apps/web/wrangler.toml
```

ロールバックは D1/R2 のデータを復元しない。削除済みの binding の参照先や Secret の変更によっては戻せないので、
データの復旧は [インフラ移行手順](stella-infrastructure-migration.md) と
[Cloudflare のロールバック仕様](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) を確認する。

## 検査の内訳（`verify` ジョブ）

| 検査 | コマンド | 見ているもの |
|------|---------|-------------|
| 設定 | `bun run deploy:config:check` | デプロイの設定名、全 Wrangler のアカウント、API の D1 の binding |
| 型 | `bun run typecheck` | 6 ワークスペースの `tsc --noEmit`。strict + `noUnusedLocals` / `noUnusedParameters` など。**テストと scripts も対象**（`exclude` を持つ tsconfig は無い） |
| テスト | `bun run test:coverage` | Vitest 127 ファイル / 1534 件（`packages/**` と `apps/**/src`・`apps/**/scripts` の `*.test.ts`）。カバレッジは**閾値なし**で数字をジョブサマリに出すだけ |
| lint | `bun run lint` | `biome ci .`（lint + フォーマットの両方）。`noExplicitAny` / `noNonNullAssertion` / `noConsole` / a11y などを error |
| 教材 | `bun run content:check` | 画像リンクの実在・スライド枚数 4〜6・語彙台帳の学習順序・サムネイル規格（16:9 / 800px 以上 / 400KB 以内）・前提グラフ（未知 slug / 自己参照 / 循環） |
| 図解 | `lint-skin.py` | スライド図解 SVG のトークン検査。`content:check` は Node だけで走る検査で打ち切るため、これは別ステップで呼ぶ |
| バンドル | `bun run build` | 成果物を出す web（Vite）と vscode（esbuild）だけ。型は typecheck が見るので、ここで `tsc --noEmit` を重ねない |

`verify` の dist は deploy では使い回せない。`VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL` はビルド時に焼き込む値で、それを持たない `verify` 側の成果物は本番向けではないため。deploy の `deploy:web` は web だけを建て直す（vscode 拡張は web のデプロイに要らない）。

カバレッジに閾値を置いていないのは意図的。落とすためではなく手薄な場所を見えるように
するためで、数字を見ないまま閾値だけ入れると「通すためのテスト」が書かれる。
