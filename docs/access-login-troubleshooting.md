# ログイン トラブルシューティング (Cloudflare Access)

「ログインできない」「画面は出るが API が 401 / 403 になる」場合の切り分け手順。
本番のログインは **Cloudflare Access** が行い、アプリは自前の認証を持たない。構成・設定手順の正本は
[`docs/cloudflare-access.md`](cloudflare-access.md)。

> 以前の Google ログイン (自前の Google OAuth + アプリ発行の JWT) は廃止した。`/api/auth/google` と
> `/api/auth/google/callback` は 410 を返す。Google Cloud Console の OAuth クライアントも
> `AUTH_JWT_SECRET` / `GOOGLE_CLIENT_SECRET` も使わない (残っていれば消す。cloudflare-access.md §2-8)。

```text
ブラウザ --(Access のログイン / CF_Authorization Cookie)--> Cloudflare Access (Web のホスト名)
  --> stella-web Worker (/api/* をサービスバインディングで中継)
  --> stella-api Worker (Cf-Access-Jwt-Assertion を検証 → メールで profiles を引く)
```

## 0. 構成チェック (まずここから)

`/api/healthz` は Bypass のパスなので、ログインなしで設定状況を確かめられる (秘密値は出ない)。

```bash
curl -s https://stella-web.saedgewell.workers.dev/api/healthz | jq
# 本番の期待:  "accessConfigured": true,  "devAuthConfigured": false
# ローカルの期待: "accessConfigured": false, "devAuthConfigured": true
```

- `accessConfigured: false` (本番) … API の `[vars]` に `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` が入っていない。
  全員が 503 になる。GitHub の Variables を確かめて再デプロイする (`deploy:prepare` が `[vars]` に書く。
  無ければデプロイ自体が止まるので、手で `wrangler deploy` した版でないかも疑う)。

## 1. チェックリスト

| 症状 | 見るところ |
|---|---|
| Access のログイン画面が出ない / ログイン後に Access のエラー | Zero Trust の Access アプリケーションの Domain が Web のホスト名か。ポリシー (Allow) に本人のメール / グループが入っているか。IdP の設定 |
| ログインはできるが API が 401「トークンが無効です」 | `ACCESS_AUD` がそのアプリケーションの AUD Tag と一致しているか (複数のアプリで守るならカンマ区切りで全部)。`ACCESS_TEAM_DOMAIN` が `<team>.cloudflareaccess.com` か。開き直して Access のトークンを取り直す |
| API が 401「Cloudflare Access でのログインが必要です」 | `Cf-Access-Jwt-Assertion` が届いていない。Access を通らない経路 (API の workers.dev・プレビュー URL) で呼んでいないか。画面の `VITE_SERVER_URL` が Web のオリジン (`https://stella-web.saedgewell.workers.dev`) か。セキュリティ画面の `invalid_token` も確かめる |
| 招待必要画面 (`invite_required`) | Access は通ったが、アプリに招待されていない。管理画面のユーザー招待でそのメールアドレスを登録する (Access のポリシーとアプリの招待は別物。両方が要る)。セキュリティ画面には `uninvited_identity` が出る |
| 「無効化されています」「組織は利用停止中です」 | `profiles.disabled` / `tenants.active`。意図したものかを管理者が確かめる |
| `/start`・`/verify/<コード>`・`/support` がログインを求める | Bypass のアプリケーションが無い・パスが違う (cloudflare-access.md §2-5)。より長いパスの指定が優先される |
| VS Code の接続で失敗する (交換が HTML / ログイン画面へのリダイレクトになる) | `/api/auth/vscode-link/exchange` が Bypass になっていない。拡張はまだトークンを持っていないので Access を通れない |
| VS Code が途中から 401 になる | 拡張のトークンは Access のセッションと同じ期限。「VS Code で開く」からつなぎ直す。拡張の `stella.serverUrl` (ユーザー設定) が Web のオリジンか。Access より前の旧版の拡張は `cf-access-token` を送らないので通れない — 新しい版を入れる |
| 拡張の接続コードが出ない (Access のトークンの残りが短い) | Web を開き直して Access のセッションを新しくしてから「VS Code で開く」を押す |

## 2. ローカル開発

ローカルでは Access を使わない。`apps/api/.dev.vars` の `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` を空にし、
`DEV_AUTH_JWT_SECRET` を入れておく (example のままで動く)。開発用トークンは **localhost / 127.0.0.1 への
リクエストだけ** で通り、Access が設定されているとどの経路でも通らない。

```bash
bun run --filter=@stella/api dev:token seed-admin   # 出たトークンを画面のログイン画面に貼る
```

- 503「認証が未設定です」… `DEV_AUTH_JWT_SECRET` が無いか、API を localhost 以外のホスト名で開いている。
- `bun run build && bun run preview` で試すときは `apps/web/.env.local` の `VITE_AUTH_MODE=dev-token`
  (build の既定は `access`)。preview のオリジンを `.dev.vars` の `ALLOWED_ORIGINS` に足す。

## それでも解決しない場合

- 管理者は `/admin/security` のサインイン履歴・イベントログで、本人のリクエストがどこで弾かれたかを見る
  (`CF_ACCESS_API_TOKEN` があれば Access 側の拒否 `access.denied` も取り込まれる)。
- Cloudflare の Zero Trust → Logs → Access で同じ時刻の記録を見る。
- ユーザー向けには `/support` ページ (FAQ + 問い合わせフォーム。ログインなしで開ける) を案内する。
