# ログイン トラブルシューティング (Clerk + 講師・管理者の Cloudflare Access)

「ログインできない」「画面は出るが API が 401 / 403 になる」場合の切り分け手順。
本番のログインは **Clerk** が行い、講師・管理者・営業は **Cloudflare Access** で守った講師・管理者用の入口から
使う。アプリは自前の認証を持たない。構成・設定手順の正本は [`docs/clerk-auth.md`](clerk-auth.md)。

> 以前の Google ログイン (自前の Google OAuth + アプリ発行の JWT) と、Access だけの構成は廃止した。
> `/api/auth/google` と `/api/auth/google/callback` は 410 を返す。

```text
受講者: ブラウザ --(Clerk のログイン)--> stella-web Worker --> stella-api (Clerk のトークンを検証)
講師・管理者: ブラウザ --(Access + Clerk)--> stella-admin Worker --> stella-api (Clerk + Access のトークンを検証)
```

## 0. 構成チェック (まずここから)

`/api/healthz` はログインなしで設定状況を確かめられる (秘密値は出ない)。

```bash
curl -s https://stella-web.saedgewell.workers.dev/api/healthz | jq
# 本番の期待:  "clerkConfigured": true, "accessConfigured": true, "devAuthConfigured": false
# ローカルの期待: "clerkConfigured": false, "devAuthConfigured": true
```

- `clerkConfigured: false` (本番) … API に `CLERK_SECRET_KEY` が入っていない。全員が 503 になる。
  GitHub の Secret `CLERK_SECRET_KEY` を確かめて再デプロイする (deploy が API の secret に入れる)。
- `accessConfigured: false` (本番) … API の `[vars]` に `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` が入っていない。
  講師・管理者のアカウントが Clerk だけで操作できてしまう。GitHub の Variables を確かめて再デプロイする。

## 1. チェックリスト

| 症状 | 見るところ |
|---|---|
| ログイン画面で「確認コードでのログインが有効になっていません」 | Clerk の Email verification code が無効。clerk-auth.md §2-1 の 2 |
| Google でログインしたあと「ログインを完了できませんでした」 | Clerk の許可するリダイレクト先に、その入口の `/auth/callback` があるか。サインアップで名前などを必須にしていないか |
| ログインはできるが API が 401「ログインの有効期限が切れました」 | Clerk のセッショントークンに `email` クレームが無い (clerk-auth.md §2-1 の 3)、または `azp` (開いている入口のオリジン) が `ALLOWED_ORIGINS` / `STAFF_ORIGIN` に入っていない。セキュリティ画面の `invalid_token` も確かめる |
| 招待必要画面 (`invite_required`) | Clerk ではログインできたが、アプリに招待されていない。管理画面のユーザー招待でそのメールアドレスを登録する。セキュリティ画面には `uninvited_identity` が出る |
| 「講師・管理者用の入口から開いてください」 | 講師・管理者・営業のアカウントで受講者用の入口を開いた。講師・管理者用の入口 (`VITE_STAFF_ORIGIN`) から開く |
| 講師・管理者用の入口でも「講師・管理者用の入口から開いてください」 | Access のログインのメールアドレスと、Clerk のログインのメールアドレスが違う (同じアドレスで両方にログインする)。または `stella-admin` に Access が有効になっていない (clerk-auth.md §2-2 の 3) |
| 講師・管理者用の入口で Access のエラー | Access のポリシー (Allow) に本人のメール / グループが入っているか。IdP の設定 |
| 「無効化されています」「組織は利用停止中です」 | `profiles.disabled` / `tenants.active`。意図したものかを管理者が確かめる |
| VS Code の接続で失敗する (交換が HTML / ログイン画面へのリダイレクトになる) | 拡張の `stella.serverUrl` が講師・管理者用の入口を指している。受講者用の入口のオリジンにする |
| VS Code の接続で「講師・管理者のアカウントは VS Code の接続では使えません」 | 仕様。講師・管理者のアカウントには VS Code のキーを出さない |
| VS Code が途中から 401 になる | 拡張のキーは 30 日で切れ、無効化・管理画面の失効でも取り消される。「VS Code で開く」からつなぎ直す |

## 2. ローカル開発

ローカルでは Clerk も Access も使わない。`apps/api/.dev.vars` の `CLERK_SECRET_KEY` を空にし、
`DEV_AUTH_JWT_SECRET` を入れておく (example のままで動く)。開発用トークンは **localhost / 127.0.0.1 への
リクエストだけ** で通り、Clerk が設定されているとどの経路でも通らない。

```bash
bun run --filter=@stella/api dev:token seed-admin   # 出たトークンを画面のログイン画面に貼る
```

- 503「認証が未設定です」… `DEV_AUTH_JWT_SECRET` が無いか、API を localhost 以外のホスト名で開いている。
- `bun run build && bun run preview` で試すときは `apps/web/.env.local` の `VITE_AUTH_MODE=dev-token`
  (build の既定は `clerk`)。preview のオリジンを `.dev.vars` の `ALLOWED_ORIGINS` に足す。

## それでも解決しない場合

- 管理者は `/admin/security` のサインイン履歴・イベントログで、本人のリクエストがどこで弾かれたかを見る
  (`CF_ACCESS_API_TOKEN` があれば講師・管理者用の入口の Access の拒否 `access.denied` も取り込まれる)。
- Clerk のダッシュボード (Users・Logs) と、Cloudflare の Zero Trust → Logs → Access で同じ時刻の記録を見る。
- ユーザー向けには `/support` ページ (FAQ + 問い合わせフォーム。ログインなしで開ける) を案内する。
