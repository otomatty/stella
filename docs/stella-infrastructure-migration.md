# Stella Phase C インフラ移行手順

[Issue #306](https://github.com/a-cial-dev/falcon-informal/issues/306) の切替手順。
この文書とコードのマージだけでは、Cloudflare 上のデータや secrets は移らない。
以下の準備とメンテナンスを終えてから main にマージし、GitHub Actions でデプロイする。

## 変更するもの

| 対象 | 移行元 | 移行先 |
| --- | --- | --- |
| API Worker | `falcon-api` | `stella-api` |
| Web Worker | `falcon-web` | `stella-web` |
| D1 | `falcon-db` | `stella-db`、新規 DB の UUID |
| 教材 R2 | `falcon-materials-public` | `stella-materials-public` |
| スキルシート R2 | `falcon-skill-sheets` | `stella-skill-sheets`、非公開 |
| AI Gateway | `falcon-ai` | `stella-ai` |
| JWT issuer / audience | `falcon-api` / `falcon-web` | `stella-api` / `stella-web` |
| API URL | `https://falcon-api.a-sugai.workers.dev` | `https://stella-api.a-sugai.workers.dev` |
| Web URL | `https://falcon-web.a-sugai.workers.dev` | `https://stella-web.a-sugai.workers.dev` |

Cloudflare アカウント `0a0dd103e779842ba2c67cbde20574a0` と GitHub Secrets の名前は維持する。
既存行の UUID、`stableUuid("course:...")`、R2 のオブジェクトキーも維持する。
localStorage キー、VS Code 拡張 ID `falcon.informal`、設定名 `falcon.serverUrl` / `falcon.webUrl`、
SecretStorage キーは Phase D の対象で、ここでは変更しない。

## 切替方針

メンテナンス中に旧 API へのアクセスと書き込みを停止し、データをコピーして新環境へ一括で切り替える。
旧新 API の並行運用や JWT の旧 issuer / audience の受け入れは行わない。
新名 Worker のデプロイは旧名 Worker を停止しないため、旧 API の閉鎖は別途必要。
CORS から外すだけでは VS Code や直接の HTTP アクセスを止められない。

旧リソースはアクセスを止めたまま復旧用に残す。削除は切替確認・保管期限確定後の別作業とする。
新環境で利用を再開した後に、旧 DB をそのまま再公開すると進捗が巻き戻る。

## 1. メンテナンス前の準備

1. 担当者、開始・終了予定時刻、復旧判断時刻、告知先を PR に記録する。
   この PR はメンテナンス開始までマージしない。他 PR の main マージも切替中は止め、実行中の Deploy が無いことを確認する。
2. 利用者へ下記の文面で事前告知する。日時は担当者が確定する。
3. 旧 Worker の routes / custom domains / workers.dev / preview URLs / cron / vars / secret 名を記録する。
   Secret の値は管理元から新 Worker へ再登録する。Cloudflare からの読み戻しや PR への貼り付けはしない。
4. 新 D1 と R2 を同一アカウントに作成する。D1 は名前を変更できないため、新規 DB に復元する。
   旧 DB の ID `5c22102a-6c90-4433-b744-4f51f0f608f9` は新名の binding に流用しない。
   [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
5. `stella-ai` を作成し、旧 Gateway の認証、プロバイダ鍵、Unified Billing、ログ・キャッシュ・レート制限設定を確認して移す。
   Gateway ID を変えるだけでは設定・過去ログは移らない。既存のランタイム用トークンが新 Gateway でも使えるか確認する。
   [Gateway authentication](https://developers.cloudflare.com/ai-gateway/configuration/authentication/)
6. 新 API Worker に `AUTH_JWT_SECRET`、`GOOGLE_CLIENT_SECRET`、利用中の `ANTHROPIC_API_KEY`、
   `AI_GATEWAY_CF_API_TOKEN`、`WORKERS_AI_API_TOKEN` を同じ名前で登録する。
   署名鍵を維持しても issuer / audience の検証で旧 JWT は失効する。`DEV_MODE` は設定しない。
7. Google Cloud Console に新 Web の JavaScript origin と新 API の callback を追加する。
   callback は `https://stella-api.a-sugai.workers.dev/api/auth/google/callback`。
   ローカルの `http://127.0.0.1:8787/api/auth/google/callback` は維持する。
8. 新教材バケットの公開 URL を取得する。新しい r2.dev URL は旧バケットのものと異なる。
   カスタムドメインを使う場合は切替時に新バケットへ接続する。
   スキルシートのバケットは r2.dev もカスタムドメインも公開しない。
9. バケットの CORS・lifecycle・イベント通知・トークンの対象範囲を照合する。
   教材 CORS を設定している場合は新 Web origin を含める。新バケットへの読み書き権限も確認する。

作成コマンドはリポジトリルートから実行する。既に存在する場合は作り直さず状態を確認する。
Wrangler が設定への追記を尋ねた場合は追加しない。既存の `DB` binding を使い、実 ID は `deploy:prepare` に解決させる。

```bash
bunx wrangler d1 create stella-db --config apps/api/wrangler.toml
bunx wrangler r2 bucket create stella-materials-public
bunx wrangler r2 bucket create stella-skill-sheets
bunx wrangler r2 bucket dev-url enable stella-materials-public
bunx wrangler r2 bucket dev-url get stella-materials-public
```

### 事前告知の文面

> 【STELLA メンテナンス】○月○日 ○時〜○時は学習・提出・面談練習を停止します。
> 開始前に回答や編集中のコードを保存してください。切替により全員のログイン状態が失効します。
> 終了後は https://stella-web.a-sugai.workers.dev で Google ログインし直してください。
> 学習履歴・提出・教材は引き継ぎます。開いたままの旧画面は閉じ、新しい URL を開いてください。
> VS Code は接続設定を更新し、新 Web のレッスンから「VS Code で開く」で接続し直してください。

この文面の用意は告知の送信を意味しない。担当者が日時を埋め、送信済みの記録を PR に残す。

## 2. メンテナンス開始とデータ移行

1. 旧 Web をメンテナンス案内へ切り替える。旧 API の全到達経路を停止する。
   Dashboard で旧 API の workers.dev と preview URLs を無効化し、custom domain / routes も外す。
   cron も停止し、変更が反映されて実行中のリクエスト・録音送信・TTS・予定処理が完了したことをログで確認する。
   旧 API URL を直接叩いても処理できないことを確認してからエクスポートする。
2. 旧 DB を全量エクスポートし、空の新 DB にインポートする。保存先はリポジトリ外のアクセス制限された場所とする。
   下記の `<backup.sql>` と `<new-database-uuid>` は実値へ置換する。
   移行済み DB に seed だけを流して移行の代用にしない。

```bash
bunx wrangler d1 export 5c22102a-6c90-4433-b744-4f51f0f608f9 --remote --output <backup.sql>
bunx wrangler d1 execute <new-database-uuid> --remote --file <backup.sql>
```

`d1_migrations` の記録も含めて移す。dump 内と移行先の記録が旧 DB と一致することを確認する。
欠けていたら migration を実行せず、旧 DB の記録を復元する。既存スキーマへ初期 migration を再適用しない。
`sqlite_master` のテーブル・索引、および各テーブルの件数を旧新で照合し、`PRAGMA foreign_key_check` が空であることを確認する。
特に profiles、auth_users、enrollments、進捗、submissions、専用教材の割当、面談データ、
lesson_materials / lesson_material_versions / lesson_revisions が残っていることを確認する。
[D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)

3. 両 R2 バケットの全キーをコピーする。教材正本からの再アップロードだけでは CMS 添付、
   過去の配布 PDF、録音、スキルシート原本を復元できない。
   `tenant/.../courses/...`、`lesson-pdf/...` とその台帳、`deploy/content-state.json`、
   `interview-tts/...` も含め、HTTP metadata と custom metadata を保存する。
   特に音声の `textHash` が失われると古い音声と判定される。

Cloudflare が案内する S3 対応ツールの例。`r2` remote を同一アカウントへ設定し、
認証情報は rclone の保護された設定に保存する。
[Cloudflare rclone](https://developers.cloudflare.com/r2/examples/rclone/)、[metadata を含む copy](https://rclone.org/commands/rclone_copy/)

```bash
rclone copy r2:falcon-materials-public r2:stella-materials-public --metadata
rclone copy r2:falcon-skill-sheets r2:stella-skill-sheets --metadata
rclone check r2:falcon-materials-public r2:stella-materials-public --download
rclone check r2:falcon-skill-sheets r2:stella-skill-sheets --download
```

全キー・サイズ・内容を照合し、別途 metadata も比較する。`check --download` は metadata の一致を保証しない。
本文の転送結果だけで判定せず、音声の `textHash`、PDF の Content-Type / Content-Disposition を確認する。
S3 ツールが metadata キーの大文字小文字を変えた場合も不一致として扱う。
その場合は R2 Workers bindings で元の `customMetadata` / `httpMetadata` をそのまま渡してコピーし直し、再照合する。
移行先に事前コピーがある場合、旧環境で削除されたキーが余っていないことも確認する。

4. GitHub Variables を更新する。`VITE_SERVER_URL=https://stella-api.a-sugai.workers.dev`、
   `VITE_MATERIALS_BASE_URL` は新バケットの公開 URL にする。Secrets の名前と `PDF_KEY_SALT` の値は維持する。
   旧 Variable 値は復旧用に控える。新 Web の build が済むまでユーザーに再開を案内しない。

## 3. デプロイと再開判定

1. データ照合、secret 登録、告知の記録が揃ったら PR を main にマージする。
   Deploy は CI → `deploy:prepare` → 教材処理 → migrate → API → seed → Web の既存経路で流す。
   `deploy:prepare` は Cloudflare を読み取り、同じ checkout の D1 ID を書き換える。
   未作成 DB や誤った URL では書き込み前に停止する。自動作成や旧名へのフォールバックはしない。
2. API の `/api/healthz` で OAuth / JWT の設定が true であることを確認する。
   旧 JWT による認証が新 API で 401 になり、再ログイン後の JWT が通ることを確認する。
   旧 API は引き続き到達不能であることも確認する。
3. 新 Web から Google ログイン、ステージの進捗、提出、教材画像、最新・過去版 PDF の取得を確認する。
   private スキルシートは認可された API 経由だけで取得できることを確認する。
   面談の質問音声・録音の文字起こし、チャット・レビュー下書きが `stella-ai` 経由で動くことを確認する。
4. VS Code の既存設定値を新 API / Web URL に変更し、拡張から切断後、新 Web の「VS Code で開く」で再接続する。
   拡張 ID や設定キーの名前は変更しない。古い JWT と接続先は URL 切替だけでは更新されない。
5. 独自ドメインを使っている場合は routes / DNS / R2 custom domain を新リソースへ切り替え、TLS とキャッシュを確認する。
   workers.dev のサフィックス `a-sugai` は維持する。旧 URL から API への自動転送は設けない。
6. Google Console から旧本番 callback / origin を除去し、旧 Pages 公開経路も閉じる。
   旧教材 R2 の r2.dev と旧バケットへ向く公開 custom domain も無効化し、保管用の非公開状態にする。
   Web の旧オリジンに保存された localStorage は新オリジンへコピーせず、再ログインしてもらう。
7. 新 API の cron だけが有効なことを確認する。検証が通ったらメンテナンス終了を告知し、再開時刻を PR に記録する。

## 4. 復旧

再開前の失敗はメンテナンスを維持して修正し、GitHub Actions を Re-run する。
旧環境へ戻す場合は新 API の全経路・cron を停止し、新環境に書き込みが無いことを確認してから、
旧 Worker の記録済み routes / cron、Google OAuth 設定、GitHub Variables、DNS / R2 domain を戻す。
旧 Worker は削除していないので、その環境を復旧先に使う。新名 Worker の `wrangler rollback` では旧環境に戻らない。
コードを戻す際は復旧 PR と GitHub Actions を使い、新旧が同時に稼働しないようにする。

再開後は旧 DB / R2 に単純に戻さない。新環境を停止して差分を保全し、移行後の進捗・提出・添付を含む
データ復旧計画を決める。利用者には再停止と再ログインの要否を告知する。
旧 JWT を復活させないため、旧環境へ復旧する際も `AUTH_JWT_SECRET` を新しい値に更新して全員を再認証する。

## ローカル開発

Git 上の D1 UUID はゼロ UUID のローカル専用値。`bun run db:migrate && bun run db:seed && bun run smoke:d1` で新しいローカル DB を用意する。
旧ローカル DB を残したい場合は事前に export して新ローカル DB へ import する。既存の `.wrangler` は削除しない。
remote の復旧コマンドをローカルで実行する場合も、必要な環境変数を設定して `bun run deploy:prepare` を先に実行する。
書き換え後の実 ID はコミットしない。local の作業へ戻る前に `database_id` をゼロ UUID に戻す。

## PR に残す作業記録

- メンテナンス予定・告知済み時刻・担当者
- 旧環境停止時刻、バックアップ保管先、新 D1 UUID、新 R2 公開 URL
- D1 の全表・migration 履歴の照合結果、R2 の内容・metadata 照合結果
- Deploy 実行 URL と commit、新 JWT / Google OAuth / VS Code / AI / 添付の検証結果
- 再開または復旧時刻、旧リソースの保管期限

秘密値、SQL dump、学習者の個人データは Issue / PR に添付しない。
