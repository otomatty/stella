# Google ログイン トラブルシューティング

「Google でログインができない」場合の切り分け手順。 本アプリのログインは
**Cloudflare Workers 上の自前 Google OAuth + JWT** で構成されている
([`docs/cloudflare-stack.md`](cloudflare-stack.md) 参照)。

```text
[Web (Workers Static Assets)] --VITE_SERVER_URL--> [API (Workers) /api/auth/google]
   --> Google 同意画面 --> /api/auth/google/callback
   --> JWT 発行 --> Web /auth/callback#access_token=... --> ログイン完了
```

失敗の多くは **設定 / デプロイ起因**。 次の順にチェックする。

## 0. 構成チェック (まずここから)

API の疎通エンドポイントで認証まわりの設定状況を確認する (秘密値は出力されない)。

```bash
curl -s https://<api-host>/api/healthz | jq
# 期待:
# {
#   "ok": true,
#   "googleOAuthConfigured": true,   # GOOGLE_CLIENT_ID と GOOGLE_CLIENT_SECRET が設定済み
#   "jwtConfigured": true            # AUTH_JWT_SECRET が設定済み
# }
```

`googleOAuthConfigured` / `jwtConfigured` が `false` の場合は **手順 3 / 4** の Secrets が未設定。

## 1. フロントの `VITE_SERVER_URL` (ビルド時)

- デプロイ時の `VITE_SERVER_URL` が **API (Workers) のオリジン** と一致しているか。
  - 例: `https://falcon-api.a-sugai.workers.dev`
- 未設定だとログインボタンを押しても遷移先が無く **無反応** になる
  (本アプリは原因を示すトーストを出すよう改善済み)。
- 変更後は **再ビルド / 再デプロイ** が必要 (`VITE_*` はビルド時に埋め込まれる)。

## 2. Google Console の認可済みリダイレクト URI (完全一致)

[Google Cloud Console](https://console.cloud.google.com/) → 対象 OAuth 2.0 クライアント →
**承認済みのリダイレクト URI** に、 Worker のコールバック URL を **完全一致** で登録する。

- 本番: `https://<api-host>/api/auth/google/callback`
- ローカル: `http://127.0.0.1:8787/api/auth/google/callback`

不一致だと Google が `redirect_uri_mismatch` を返す。 末尾スラッシュ・http/https・ホスト名の
差異に注意 (コールバック URL はリクエスト URL から導出される: `lib/google-oauth.ts` の
`googleRedirectUri`)。

## 3. Worker Secrets

```bash
cd apps/api
wrangler secret put AUTH_JWT_SECRET        # JWT 署名 (必須)
wrangler secret put GOOGLE_CLIENT_SECRET   # Google OAuth シークレット (必須)
```

`GOOGLE_CLIENT_ID` は `wrangler.toml` の `[vars]` に公開設定済み (Secret でも可)。
未設定だと API が 503 を返し、 コールバックが `#error=...` を付けてフロントへ戻る
(改善済みの `/auth/callback` がエラー内容を表示する)。

## 4. `ALLOWED_ORIGINS` に Web オリジンが含まれているか

`apps/api/wrangler.toml` の `[vars].ALLOWED_ORIGINS` に、 本番 Web Worker のオリジンが含まれていること。
含まれないと `return_to`(`/auth/callback`)が握り潰され、 ログイン後のリダイレクト先がフォールバックになる
(`lib/google-oauth.ts` の `resolveOAuthReturnTo`)。

```dotenv
ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,https://falcon-web.a-sugai.workers.dev"
```

## 5. SPA ルーティング (`/auth/callback`)

`apps/web/wrangler.toml` で `assets.not_found_handling = "single-page-application"` が設定され、
`/auth/callback` や `/support` の直アクセスが `index.html` に解決されること。

## それでも解決しない場合

- ブラウザの Cookie / ポップアップブロック / 拡張機能を無効化して再試行。
- 端末の時刻ずれ (ID トークン検証に影響) を自動設定で補正。
- ユーザー向けには `/support` ページ (FAQ + 問い合わせフォーム) を案内する。
