# 認証 (Clerk + 講師・管理者の Cloudflare Access) とセキュリティ監視

STELLA は自前の認証を持たない。

- **受講者を含む全員のログイン** は **Clerk** が行う (Google アカウント、またはメールに届く確認コード)。
  ログイン画面は STELLA が自作し、入力はブラウザから Clerk へ直接送られる (アプリはパスワードもコードも持たない)。
- **講師・管理者・営業** は、Clerk のログインに加えて **Cloudflare Access** (多要素認証) で守った
  **講師・管理者用の入口** からだけ操作できる。Clerk のアカウントだけを奪われても、講師・管理者の操作はできない。

アプリは Clerk と Access が付けたトークンを確かめて、招待済みの利用者 (profiles) に結び付けるだけにする。
以前の Google OAuth + アプリが発行する JWT、その後の Access だけの構成 (利用者数 50 人の無料枠に収まらない) は廃止した。

あわせて、管理者の **セキュリティ画面** (`/admin/security`) で不正アクセスの兆候をすぐに見つけられるようにした
(IPA の注意喚起「不正アクセスによる漏えい等の事案を踏まえ、速やかに実施すべき対策等について」(2026-10-09) を受けて)。

## 1. 構成

```
受講者のブラウザ ──(Clerk のログイン: Google / 確認コード)──▶ Clerk
   │ Authorization: Bearer <Clerk のセッショントークン (約 60 秒、SDK が更新)>
   ▼
stella-web Worker (受講者用の入口。静的配信 + /api/* の中継。利用者が付けた Access のヘッダは消す)
   │ サービスバインディング
   ▼
stella-api Worker … Clerk のトークンを検証 → メールアドレスで profiles を引く
   ▲                 講師・管理者・営業は Cf-Access-Jwt-Assertion (同じメールアドレス) も求める
   │ サービスバインディング (Access の付けたヘッダをそのまま)
stella-admin Worker (講師・管理者用の入口。同じ画面。Cloudflare Access で守る)
   ▲
講師・管理者のブラウザ ──(Access のログイン + Clerk のログイン)

VS Code 拡張 ──(Authorization: Bearer <Clerk の API キー>)──▶ 受講者用の入口
```

- 画面は API を **同じオリジン** の `/api/*` で呼ぶ (受講者用は `VITE_SERVER_URL`、講師・管理者用の入口で
  開いたときはその入口自身のオリジン)。API の Worker は `workers_dev = false` / `preview_urls = false` で、
  中継を通らない経路を持たない。
- API は Clerk のセッショントークンを **署名 (Clerk の鍵)・期限・`azp` (発行元の画面のオリジン)** から検証する
  (`apps/api/src/lib/clerk-auth.ts`)。`azp` は `ALLOWED_ORIGINS` と `STAFF_ORIGIN` (または
  `CLERK_AUTHORIZED_PARTIES`) に限る。利用者はセッショントークンに足した `email` クレームで識別する。
- 招待されていなければ `invite_required` (Clerk のアカウントは誰でも作れるが、アプリが弾く)。無効化した
  アカウント・利用停止中の組織 (`tenants.active = 0`) も拒否する。
- 講師・管理者・営業は、`Cf-Access-Jwt-Assertion` を **署名・発行者・AUD から検証** し、Clerk の利用者と同じ
  メールアドレスのときだけ通す (`apps/api/src/lib/authz.ts` の `assertStaffAccess`)。受講者用の入口から開くと
  `staff_host_required` になり、画面が講師・管理者用の入口へ案内する。受講者用の Worker は利用者が付けた
  `Cf-Access-Jwt-Assertion` を消してから中継する (盗んだ Access のトークンを、Access の失効を確かめない入口から
  使い回させない)。
- VS Code 拡張は、Web の「VS Code で開く」が出す接続コードを `POST /api/auth/vscode-link/exchange` で交換し、
  **その受講者の Clerk の API キー** (アプリのスコープ `stella:vscode`・30 日で期限切れ・取り消し可) を受け取る。
  講師・管理者・営業のアカウントには出さない。

## 2. 設定 (管理者が 1 回だけ行う)

### 2-1. Clerk

1. Clerk でアプリケーションを作る (まずは **開発環境** のインスタンス)。
2. **ログイン方法**: Email address の **Email verification code** と、**Google** (Social connections) を有効にする。
   パスワードは無効にする。サインアップで必須にする項目はメールアドレスだけにする (名前・電話番号を求めると、
   自作の画面では完了できない)。
3. **セッショントークンにメールアドレスを足す** (Sessions → Customize session token):
   ```json
   { "email": "{{user.primary_email_address}}" }
   ```
   これが無いと API は全員を 401 にする。
4. **API keys** を有効にする (VS Code の接続で、API が利用者ごとのキーを作る)。
5. **許可するリダイレクト先** (Paths / Allowed redirect URLs) に、両方の入口の `/auth/callback` を入れる
   (Google から戻る場所)。
6. **Web の CSP**: 画面は Clerk の Frontend API (公開鍵から分かるホスト名) と `img.clerk.com`・ボット対策の
   `challenges.cloudflare.com` にだけ通信する (`apps/web/vite-plugins/security-headers.ts` が公開鍵から作る)。
7. **本番環境のインスタンス** は自分で DNS を管理するドメインが要る (Clerk の要件)。`*.workers.dev` は使えない
   見込みなので、本番に切り替える前に独自ドメインへ移す。そのとき両方の入口のオリジンを Clerk のドメイン
   (講師・管理者用はサテライトドメインなど) に入れ、`deploy-target.ts` の `APP_ORIGIN` / `STAFF_ORIGIN` と
   `wrangler.toml` の `ALLOWED_ORIGINS` / `INVITE_REDIRECT_URL` も変える。

### 2-2. 講師・管理者用の入口 (Cloudflare Access)

1. **Zero Trust を有効にする**。チームドメイン `<team>.cloudflareaccess.com` ができる。
2. **ログイン方法 (IdP)**: Google Workspace を推奨 (会社のアカウントだけに絞れ、2 段階認証を Workspace 側で
   強制できる)。One-time PIN や個人の Google アカウントを許すと 2 段階認証を強制できない。
3. 一度デプロイして `stella-admin` の Worker を作り、Workers の設定 (Domains & Routes → workers.dev) で
   **Access を有効にする** (`https://stella-admin.saedgewell.workers.dev`)。ホスト名全体を守る (Bypass は作らない)。
   プレビュー URL は Access の外になるので、`apps/web/wrangler.toml` の `[env.admin]` で `preview_urls = false` にしてある
   (ダッシュボードの Preview URLs も無効のままにする)。
4. Access のアプリケーションの **Policy (Allow)**: 講師・管理者・営業のメールアドレス (または Access グループ) だけ。
   **Require で多要素認証** を付ける。Session duration は 24 時間以下。
   - 利用者数は講師・管理者・営業だけを数える (無料枠は 50 人。受講者は数えない)。
5. 作成後の **Application Audience (AUD) Tag** (64 桁の 16 進) を控える。

### 2-3. GitHub の Variables / Secrets

| 名前 | 種類 | 値 |
|---|---|---|
| `VITE_SERVER_URL` | Variable | 受講者用の入口 `https://stella-web.saedgewell.workers.dev` |
| `VITE_STAFF_ORIGIN` | Variable | 講師・管理者用の入口 `https://stella-admin.saedgewell.workers.dev` |
| `VITE_CLERK_PUBLISHABLE_KEY` | Variable | Clerk の公開鍵 `pk_test_…` / `pk_live_…` |
| `CLERK_SECRET_KEY` | **Secret** | Clerk のシークレットキー (公開鍵と同じ環境の `sk_test_…` / `sk_live_…`) |
| `ACCESS_TEAM_DOMAIN` | Variable | `<team>.cloudflareaccess.com` |
| `ACCESS_AUD` | Variable | 控えた AUD Tag (複数ならカンマ区切り) |

deploy の `deploy:prepare` がこれらを確かめ (秘密の値は出さない)、Access の設定と `STAFF_ORIGIN` を API の
`[vars]` に書く。無い・形が違えば **Cloudflare に何も書かないうちにデプロイが止まる** (今動いている版はそのまま)。
`CLERK_SECRET_KEY` は deploy が API の secret に入れる。

### 2-4. 任意の secret (API Worker。`cd apps/api && bunx wrangler secret put <名前>`)

- `CLERK_JWT_KEY` … Clerk の JWT 公開鍵 (PEM)。入れるとセッショントークンを通信なしで検証する
  (無ければ Clerk の JWKS をシークレットキーで取りに行き、SDK が覚える)。
- `CF_ACCESS_API_TOKEN` … 講師・管理者用の入口の Access のログ (拒否を含むログイン記録) の取り込みと、
  講師・管理者の Access のセッションの失効に使う。権限は「Access: Audit Logs Read」と「Access: Organizations,
  Identity Providers, and Groups Write」だけ。deploy 用の `CLOUDFLARE_API_TOKEN` とは分ける。
- `SECURITY_ALERT_WEBHOOK_URL` … アラートの送り先 (Slack の Incoming Webhook など、`{"text": ...}` を受ける URL)。

## 3. 切り替えの順番

1. 2-1〜2-4 を済ませる (この時点では本番はまだ旧構成で動いている)。2-2 の 3 は初回のデプロイのあとで行う。
   あわせて、大文字小文字だけ違うメールアドレスの profiles が無いことを確かめる。あると migration 0066 の
   索引 `profiles_email_lower_uq` の作成でデプロイが止まる (API を出す前に止まるので、本番は旧構成のまま):
   `bunx wrangler d1 execute stella-db --remote --command "select lower(email), count(*) from profiles group by lower(email) having count(*) > 1"`
   が 0 行なら良い。行が出たら、どちらを残すかを決めて片方を直してからマージする。
2. この変更を `main` にマージ → deploy が API・受講者用の入口・講師・管理者用の入口を出す。
3. `stella-admin` の workers.dev に Access を有効にする (2-2 の 3)。**有効にするまで、講師・管理者は操作できない**
   (API が Access のトークンを求めるため。受講者は影響を受けない)。
4. 確認:
   - 受講者用の入口を開く → STELLA のログイン画面。Google と確認コードの両方でログインでき、画面が出る。
   - 講師のアカウントで受講者用の入口を開く → 「講師・管理者用の入口から開いてください」。入口では Access の
     ログインのあと、STELLA のログイン画面になる。
   - `curl https://<受講者用>/api/healthz` が `"clerkConfigured": true, "accessConfigured": true` を返す。
   - 管理者で `/admin/security` を開き、設定の警告が出ていないこと・自分のサインインが記録されていること。
5. **VS Code 拡張の新しい版を配る**。拡張の `stella.serverUrl` (ユーザー設定) は受講者用の入口のオリジン。
   旧版が持っている Access のトークンは通らないので、「VS Code で開く」からつなぎ直す。
6. 古い認証情報を消す: `bunx wrangler secret delete AUTH_JWT_SECRET` / `GOOGLE_CLIENT_SECRET`、
   Google Cloud の OAuth クライアント (リダイレクト URI `.../api/auth/google/callback`)、受講者用の入口に
   以前かけていた Access のアプリケーション (残っていると受講者が Access のログインを求められる)。

## 4. ローカル開発とテスト

Clerk も Access も使わない。`apps/api/.dev.vars` の `CLERK_SECRET_KEY` を空にしておくと、API は
**localhost / 127.0.0.1 へのリクエストに限って**、`DEV_AUTH_JWT_SECRET` で署名した開発用トークン
(`Authorization: Bearer`) を受け付ける。Clerk が設定されていれば開発用トークンはどの経路でも通らない。

```bash
bun run --filter=@stella/api dev:token seed-admin   # 開発用トークンを出力
```

出たトークンを画面 (`bun run dev`) のログイン画面に貼る (localStorage `stella_auth_token_v1` に入る)。
route テストとスモーク (`smoke:core`) も同じ開発用トークンで動く。Clerk の開発環境を手元で試すときは、
`.dev.vars` に `CLERK_SECRET_KEY`、`apps/web/.env.local` に `VITE_AUTH_MODE=clerk` と
`VITE_CLERK_PUBLISHABLE_KEY` を入れる (`.dev.vars.example` / `.env.local.example`)。

## 5. セキュリティ画面 (`/admin/security`)

管理者 (admin / platform_admin) だけが開ける (講師・管理者用の入口から)。テナントは自分の組織に固定。

### 記録するもの (`security_events`、180 日で消す)

| 種類 | いつ |
|---|---|
| `session.start` | Clerk のセッション (ログイン) が前と変わった。IP・国・User-Agent つき。トークンの更新 (約 60 秒ごと) では増えない |
| `access.login` / `access.denied` | 講師・管理者用の入口の Cloudflare Access のログ (15 分ごとに取り込む。`CF_ACCESS_API_TOKEN` が要る) |
| `auth.no_profile` | Clerk でログインしたが招待されていない利用者 |
| `auth.disabled` / `auth.tenant_inactive` | 無効化済みアカウント / 利用停止中の組織からのアクセス |
| `auth.staff_host_required` | 講師・管理者が Access を通らずに操作しようとした (受講者用の入口・別人の Access のトークン・VS Code のキー) |
| `auth.invalid_token` | トークンが無い・検証に失敗した (期限切れ・偽物・別のサイトの Clerk の画面で作られた) など 401 |
| `authz.forbidden` / `rate_limited` / `server_error` | 403 / 429 / 5xx の応答 |
| `data.export` | レポート (受講者・成績・監査) の明細の取得 |
| `session.revoke` | 画面からセッションを失効した |

クエリ文字列・本文・コードは残さない。攻撃で大量に書かされないよう、アイソレートごとに 1 分 60 件で打ち止め
(超えた数は次の行の `throttled_before` に残す)。

### 検知ルール (15 分ごとの cron と「今すぐ検査」)

ルールの説明と最初の対応は `packages/shared/src/security/types.ts` の `SECURITY_RULES`。

| ルール | 重要度 | 条件 |
|---|---|---|
| `new_location` | 中 (管理者・講師・営業は高) | 過去 30 日に使っていない国からサインイン |
| `off_hours_admin` | 低 | 管理者が日本時間 0〜5 時にサインイン |
| `access_denied_burst` | 高 | 1 時間に同じメールか IP で講師・管理者用の入口の Access の拒否 5 回以上 |
| `uninvited_identity` | 中 | 未招待の利用者がログインした |
| `disabled_account_access` | 高 | 無効化済みアカウントのアクセス |
| `invalid_token` | 中 (同じ IP から 1 時間 10 回以上) | トークンが無い・偽物。受講者用の入口は誰でも届くので、1 件では出さない |
| `forbidden_burst` | 高 | 1 時間に同じ利用者か IP で 403 が 20 回以上 |
| `rate_limit_burst` | 中 | 1 時間に同じ IP で 429 が 30 回以上 |
| `error_spike` | 中 | 1 時間の 5xx が 20 件以上かつ過去 7 日平均の 3 倍以上 |
| `privilege_grant` | 高 (復帰は中) | 管理者への昇格・管理者としての招待・無効化したアカウントの復帰 (監査ログから) |
| `bulk_export` | 中 | 1 時間に同じ利用者がレポートを 5 回以上取得 |

同じルール・同じ対象・同じ日 (日本時間) のアラートは 1 件にまとめ、件数だけ増やす。新しく出た「高」「中」の
アラートは、組織の管理者へアプリ内の通知 (`security_alert`) と、設定があれば Webhook で知らせる。
Webhook にはメールアドレスや IP を載せない (種類・重要度・件数と画面へのリンクだけ)。

### 見つけたときの対応

1. アラートを「確認中」にし、イベントログとサインイン履歴で対象の利用者・IP の前後の動きを見る。
2. 本人に確認できない・心当たりが無い → 「アカウント棚卸し」から **セッションを失効**、ユーザー管理で
   **無効化** (無効化してもセッションは自動で失効する)。失効は Clerk のセッションと VS Code の API キーを取り消す
   (STELLA の Clerk アプリだけに効く)。講師・管理者・営業は講師・管理者用の入口の Access のセッションも失効する
   (`CF_ACCESS_API_TOKEN` が要る)。Access の失効は Cloudflare の組織単位の API (`revoke_user`) で、**同じ Cloudflare
   アカウントの他の Access アプリのセッションもまとめて失効する** (利用者 1 人をアプリ単位で失効させる API は無い)。
3. Access の方針 (許可するメール・グループ・国) と Clerk の設定を見直す。Clerk のダッシュボードと Cloudflare の
   Zero Trust のログで同じ時間帯を確かめる。
4. 対応の内容をメモに書いて「解決済み」にする (操作は監査ログに残る)。

### IPA の注意喚起との対応

| 注意喚起 | STELLA での対応 |
|---|---|
| 直近 1 か月 → 3 か月のログを確認 | `security_events` を 180 日残す。イベントログを期間・種類・検索で絞れる |
| ログイン元の IP・時間帯を平常と比べる | サインイン履歴 (IP・国・前回の国)、`new_location` / `off_hours_admin` |
| 作った覚えのない・消したはずのアカウント | `uninvited_identity` / `disabled_account_access`、アカウント棚卸し |
| 多要素認証 | 講師・管理者・営業は Access の方針 / IdP で強制。受講者は Google の 2 段階認証か、メールの確認コード (パスワードを持たない) |
| 権限の付与範囲・定期的な棚卸し | 管理者数・休眠 (90 日) の権限アカウントの表示、`privilege_grant` |
| 異常時は速やかにインシデント対応 | 管理者への即時通知、セッション失効・無効化の導線 |

## 6. 確かめられていないこと

- Clerk の本番インスタンスを `*.workers.dev` で動かせるか (2-1 の 7。動かせない見込みで、独自ドメインが要る)。
- Clerk のセッショントークンの `email` クレームの書き方 (`{{user.primary_email_address}}`) は Clerk の資料に基づくもので、
  本番のインスタンスでは未確認。足りないと API は全員を 401 にし、セキュリティ画面に `invalid_token` が出る。
- Access のログ API (`/accounts/:id/access/logs/access_requests`) の応答の項目名 (`ray_id` / `user_email` /
  `ip_address` / `allowed` / `country`) は公開ドキュメントに基づくもので、本番のアカウントでは未確認。
- Clerk の Backend API の 1 回の呼び出しあたりの D1 の問い合わせ数の数え方 (batch の中の文を 1 つずつ数えるか)。
  1 つずつ数えても上限に収まるように作ってある。
