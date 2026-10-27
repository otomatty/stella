# Google ログイン トラブルシューティング

「Google でログインができない」場合の切り分け手順。本アプリのログインは **Better Auth** (Google、
セッションは D1) で、画面と API は同じオリジンで動く (Issue #117。設定は `apps/api/src/lib/better-auth.ts`)。

```text
[Web の Worker (stella-web)] /api/* をサービスバインディングで API (stella-api) へ中継
  画面 → POST /api/auth/sign-in/social → Google の同意画面
       → /api/auth/callback/google (Better Auth がセッションを作り、HttpOnly の Cookie を付ける)
       → 画面の /auth/callback → GET /api/auth/get-session → ログイン完了
```

失敗の多くは **設定 / デプロイ起因**。次の順にチェックする。

## 0. 構成チェック (まずここから)

受講者用の Web のオリジンで疎通エンドポイントを見る (Web の Worker を通るので中継も確かめられる。秘密値は出ない)。

```bash
curl -s https://stella-web.saedgewell.workers.dev/api/healthz | jq
# 期待: "ok": true, "authConfigured": true
```

`authConfigured` が `false` なら、API に `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` / `GOOGLE_CLIENT_ID` /
`GOOGLE_CLIENT_SECRET` のどれかが無い (手順 2・3)。応答が HTML (画面) なら、Web の Worker が `/api/*` を
中継していない (`apps/web/wrangler.toml` の `main` と `run_worker_first = ["/api/*"]`)。

## 1. フロントの `VITE_SERVER_URL`

- ビルド時に焼き込まれる `VITE_SERVER_URL` が **受講者用の Web のオリジン** (`https://stella-web.saedgewell.workers.dev`) か。
  API のオリジンにすると Cookie が別オリジンになりログインが続かない。
- 値は GitHub Actions の Repository Variables `VITE_SERVER_URL` (`deploy:prepare` が確かめる。[`docs/ci-cd.md`](ci-cd.md))。
  変えたら `main` への push (再デプロイ) が要る。

## 2. Google Console の承認済みのリダイレクト URI (完全一致)

[Google Cloud Console](https://console.cloud.google.com/) → 対象の OAuth 2.0 クライアント →
**承認済みのリダイレクト URI** に `${BETTER_AUTH_URL}/api/auth/callback/google` を **完全一致** で登録する。

- 本番: `https://stella-web.saedgewell.workers.dev/api/auth/callback/google`

不一致だと Google が `redirect_uri_mismatch` を返す。`BETTER_AUTH_URL` は `apps/api/wrangler.toml` の `[vars]`。

## 3. Worker の secret

- `BETTER_AUTH_SECRET` … GitHub の Secret から deploy が入れる (`openssl rand -base64 32`。変えると全員のセッションが切れる)
- `GOOGLE_CLIENT_SECRET` … `cd apps/api && bunx wrangler secret put GOOGLE_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` は `wrangler.toml` の `[vars]`

## 4. `/auth/callback` に戻ったが失敗と出る

画面に出る `(...)` の中は Better Auth のエラーコード。

- `account_not_linked` … 同じメールの既存の利用者に Google をつなげなかった (`account.accountLinking` の設定)
- `state_mismatch` / `please_restart_the_process` … ログインを始めたブラウザと戻ったブラウザが違う、または 10 分以上たった。もう一度ログインする
- エラーなしで「ログインできませんでした」… `get-session` がセッションを返していない。Cookie がブロックされていないか、
  `VITE_SERVER_URL` が Web のオリジンか (手順 1) を確かめる

ログインできたのに招待必要画面になるのは、そのメールが招待されていない (ユーザー管理で招待する)。

## それでも解決しない場合

- ブラウザの Cookie / 拡張機能を無効化して再試行。
- 端末の時刻ずれを自動設定で補正。
- ユーザー向けには `/support` ページ (FAQ + 問い合わせフォーム) を案内する。
