# 認証 (Cloudflare Access) とセキュリティ監視

STELLA は自前の認証を持たない。ログイン・多要素認証・セッションの期限と失効は **Cloudflare Access** が行い、
アプリは Access が付けたトークンを確かめて、招待済みの利用者 (profiles) に結び付けるだけにする。
以前の Google OAuth + アプリが発行する JWT (localStorage に保存) は廃止した。

あわせて、管理者の **セキュリティ画面** (`/admin/security`) で不正アクセスの兆候をすぐに見つけられるようにした
(IPA の注意喚起「不正アクセスによる漏えい等の事案を踏まえ、速やかに実施すべき対策等について」(2026-10-09) を受けて)。

## 1. 構成

```
ブラウザ ──(Access のログイン / CF_Authorization Cookie)──▶ Cloudflare Access (Web のホスト名)
                                                              │ Cf-Access-Jwt-Assertion を付ける
                                                              ▼
                                         stella-web Worker (静的配信 + /api/* の中継)
                                                              │ サービスバインディング (同じリクエストのまま)
                                                              ▼
                                         stella-api Worker  … Cf-Access-Jwt-Assertion を署名から検証
                                                               (workers_dev / preview_urls は閉じる)

VS Code 拡張 ──(cf-access-token: <Access のトークン>)──▶ 同じ Web のホスト名
```

- 画面は API を **同じオリジン** (`VITE_SERVER_URL` = Web のオリジン) で呼ぶ。Cookie は Access が発行する
  `CF_Authorization` (HttpOnly) で、ブラウザの JavaScript からトークンは読めない (旧構成の localStorage の JWT は無くなった)。
- API は `Cf-Access-Jwt-Assertion` を **必ず署名・発行者・AUD から検証** する (`apps/api/src/lib/access-auth.ts`)。
  ヘッダがあるだけでは信じない。Access の無い経路 (workers.dev・プレビュー URL) は `wrangler.toml` で閉じてある。
- 利用者はメールアドレスで識別する (`profiles.email`)。Access を通っても招待されていなければ `invite_required`。
  無効化したアカウント・利用停止中の組織 (`tenants.active = 0`) も拒否する。
- VS Code 拡張は、Web の「VS Code で開く」が出す接続コードを `POST /api/auth/vscode-link/exchange` で交換し、
  **発行時の Access のトークン** を受け取る (D1 には交換までの数分だけ置き、渡したら消す)。以後は
  `cf-access-token` ヘッダで送る。期限は Access のセッションと同じで、切れたら「VS Code で開く」からつなぎ直す。

## 2. Cloudflare 側の設定 (管理者が 1 回だけ行う)

1. **Zero Trust を有効にする**。チーム名を決めると、チームドメイン `<team>.cloudflareaccess.com` ができる。
2. **ログイン方法 (IdP) を追加する**。Google Workspace を推奨 (会社のアカウントだけに絞れ、2 段階認証を
   Workspace 側で強制できる)。個人の Google アカウントや One-time PIN を許すと、2 段階認証を強制できない。
3. **Web のホスト名を決める**。カスタムドメイン (Cloudflare のゾーン上のホスト名) を推奨する。
   `stella-web.saedgewell.workers.dev` のままでも、Workers の設定 (Domains & Routes → workers.dev) から
   Access を有効にできるが、下の「パスごとの Bypass」がそのホスト名で使えるかは事前に確かめること (未確認)。
   ホスト名を変えたら `apps/api/scripts/lib/deploy-target.ts` の `APP_ORIGIN` と `wrangler.toml` の
   `ALLOWED_ORIGINS` / `INVITE_REDIRECT_URL` も変える。
4. **Self-hosted のアプリケーションを作る** (Access → Applications)。
   - Domain: Web のホスト名 (パスなし = 全体)。
   - Session duration: 24 時間以下 (短いほど盗まれたトークンの寿命が短い)。
   - Policy (Allow): 招待する人だけ。例: 会社のメールドメイン、または招待者を入れた Access グループ。
     さらに **Require で多要素認証** (IdP が `amr` を返す場合の Authentication method = mfa、または
     Workspace 側の 2 段階認証の強制) を付ける。
   - Cookie 設定: HttpOnly・SameSite=Lax (既定) のまま。
   - 作成後の **Application Audience (AUD) Tag** (64 桁の 16 進) を控える。
5. **ログインなしで開くパスを Bypass にする** (同じホスト名で、パスを指定した別のアプリケーションを作り、
   ポリシーを Bypass / Everyone にする。より長いパスの指定が優先される)。
   - 画面: `/start*`, `/support*`, `/verify/*`, `/assets/*`, `/icon*`, `/apple-touch-icon.png`, `/manifest.webmanifest`
   - API: `/api/public/*`, `/api/support`, `/api/certificates/verify/*`, `/api/healthz`,
     `/api/auth/vscode-link/exchange` (拡張はまだトークンを持っていない。総当たりはレート制限で止める)
   - `/assets/*` を開けると画面の JavaScript は誰でも取れるが、中に秘密は無い (旧構成でも公開だった)。
6. **GitHub の Variables** に設定する (Settings → Secrets and variables → Actions → Variables)。
   - `ACCESS_TEAM_DOMAIN` = `<team>.cloudflareaccess.com`
   - `ACCESS_AUD` = 控えた AUD Tag (複数のアプリで守るならカンマ区切り)
   - `VITE_SERVER_URL` = Web のオリジン (例 `https://stella-web.saedgewell.workers.dev`)
   - deploy の `deploy:prepare` がこれらを確かめて API の `[vars]` に書く。無い・形が違えば
     **Cloudflare に何も書かないうちにデプロイが止まる** (今動いている版はそのまま)。
7. **任意の secret** (API Worker。`cd apps/api && bunx wrangler secret put <名前>`):
   - `CF_ACCESS_API_TOKEN` … Access のログ (拒否を含むログイン記録) の取り込みと、画面からのセッション失効に使う。
     権限は「Access: Audit Logs Read」と「Access: Organizations, Identity Providers, and Groups Write」だけ。
     deploy 用の `CLOUDFLARE_API_TOKEN` とは分ける。
   - `SECURITY_ALERT_WEBHOOK_URL` … アラートの送り先 (Slack の Incoming Webhook など、`{"text": ...}` を受ける URL)。
8. **古い認証情報を消す** (切り替えが済んでから):
   `bunx wrangler secret delete AUTH_JWT_SECRET` / `GOOGLE_CLIENT_SECRET`、Google Cloud の OAuth クライアント
   (リダイレクト URI `.../api/auth/google/callback`) の削除。

## 3. 切り替えの順番

1. 上の 1〜7 を済ませる (この時点では本番はまだ旧構成で動いている)。
2. この変更を `main` にマージ → deploy が API (Access 必須) と Web (中継つき) を出す。
3. 確認:
   - 未ログインのブラウザで Web を開く → Access のログイン画面になる。ログイン後に画面が出る。
   - `/start` と `/verify/<コード>` がログインなしで開ける。
   - `curl https://<Web>/api/healthz` が `"accessConfigured": true` を返す。
   - `curl https://<Web>/api/me` (Cookie なし) が Access のログインへのリダイレクトになる。
   - 管理者で `/admin/security` を開き、設定の警告が出ていないこと・自分のサインインが記録されていること。
4. **VS Code 拡張の新しい版を配る**。旧版は `Authorization` だけを送るので Access を通れない。
   拡張の `stella.serverUrl` (ユーザー設定) を Web のオリジンにする。
5. 古い secret を消す (2-8)。

## 4. ローカル開発とテスト

Access は使わない。`apps/api/.dev.vars` の `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD` を空にしておくと、API は
**localhost / 127.0.0.1 へのリクエストに限って**、`DEV_AUTH_JWT_SECRET` で署名した開発用トークン
(`Authorization: Bearer`) を受け付ける。Access が設定されていれば開発用トークンはどの経路でも通らない。

```bash
bun run --filter=@stella/api dev:token seed-admin   # 開発用トークンを出力
```

出たトークンを画面 (`bun run dev`) のログイン画面に貼る (localStorage `stella_auth_token_v1` に入る)。
route テストとスモーク (`smoke:core`) も同じ開発用トークンで動く。

## 5. セキュリティ画面 (`/admin/security`)

管理者 (admin / platform_admin) だけが開ける。テナントは自分の組織に固定。

### 記録するもの (`security_events`、180 日で消す)

| 種類 | いつ |
|---|---|
| `session.start` | Access のトークンの発行時刻が前と変わった (= 新しくログインした)。IP・国・User-Agent つき |
| `access.login` / `access.denied` | Cloudflare Access のログ (15 分ごとに取り込む。`CF_ACCESS_API_TOKEN` が要る) |
| `auth.no_profile` | Access は通ったが招待されていない利用者 |
| `auth.disabled` / `auth.tenant_inactive` | 無効化済みアカウント / 利用停止中の組織からのアクセス |
| `auth.invalid_token` | Access のトークンが無い・検証に失敗した (Access を迂回する経路の兆候) など 401 |
| `authz.forbidden` / `rate_limited` / `server_error` | 403 / 429 / 5xx の応答 |
| `data.export` | レポート (受講者・成績・監査) の明細の取得 |
| `session.revoke` | 画面から Access のセッションを失効した |

クエリ文字列・本文・コードは残さない。攻撃で大量に書かされないよう、アイソレートごとに 1 分 60 件で打ち止め
(超えた数は次の行の `throttled_before` に残す)。

### 検知ルール (15 分ごとの cron と「今すぐ検査」)

ルールの説明と最初の対応は `packages/shared/src/security/types.ts` の `SECURITY_RULES`。

| ルール | 重要度 | 条件 |
|---|---|---|
| `new_location` | 中 (管理者・講師・営業は高) | 過去 30 日に使っていない国からサインイン |
| `off_hours_admin` | 低 | 管理者が日本時間 0〜5 時にサインイン |
| `access_denied_burst` | 高 | 1 時間に同じメールか IP で Access の拒否 5 回以上 |
| `uninvited_identity` | 中 | 未招待の利用者が Access を通過 (許可の方針が広すぎる) |
| `disabled_account_access` | 高 | 無効化済みアカウントのアクセス |
| `invalid_token` | 高 (理由なしの 401 が 1 時間 10 回以上は中) | Access のトークンが無い・偽物 |
| `forbidden_burst` | 高 | 1 時間に同じ利用者か IP で 403 が 20 回以上 |
| `rate_limit_burst` | 中 | 1 時間に同じ IP で 429 が 30 回以上 |
| `error_spike` | 中 | 1 時間の 5xx が 20 件以上かつ過去 7 日平均の 3 倍以上 |
| `privilege_grant` | 高 (復帰は中) | 管理者への昇格・無効化したアカウントの復帰 (監査ログから) |
| `bulk_export` | 中 | 1 時間に同じ利用者がレポートを 5 回以上取得 |

同じルール・同じ対象・同じ日 (日本時間) のアラートは 1 件にまとめ、件数だけ増やす。新しく出た「高」「中」の
アラートは、組織の管理者へアプリ内の通知 (`security_alert`) と、設定があれば Webhook で知らせる。
Webhook にはメールアドレスや IP を載せない (種類・重要度・件数と画面へのリンクだけ)。

### 見つけたときの対応

1. アラートを「確認中」にし、イベントログとサインイン履歴で対象の利用者・IP の前後の動きを見る。
2. 本人に確認できない・心当たりが無い → 「アカウント棚卸し」から **Access のセッションを失効**、
   ユーザー管理で **無効化** (無効化すると Access のセッションも自動で失効する。`CF_ACCESS_API_TOKEN` が要る)。
3. Access の方針 (許可するメール・グループ・国) を見直す。Cloudflare の Zero Trust のログで同じ時間帯を確かめる。
4. 対応の内容をメモに書いて「解決済み」にする (操作は監査ログに残る)。

### IPA の注意喚起との対応

| 注意喚起 | STELLA での対応 |
|---|---|
| 直近 1 か月 → 3 か月のログを確認 | `security_events` を 180 日残す。イベントログを期間・種類・検索で絞れる |
| ログイン元の IP・時間帯を平常と比べる | サインイン履歴 (IP・国・前回の国)、`new_location` / `off_hours_admin` |
| 作った覚えのない・消したはずのアカウント | `uninvited_identity` / `disabled_account_access`、アカウント棚卸し |
| 多要素認証 | Access の方針 / IdP で強制 (アプリは自前の認証を持たない) |
| 権限の付与範囲・定期的な棚卸し | 管理者数・休眠 (90 日) の権限アカウントの表示、`privilege_grant` |
| 異常時は速やかにインシデント対応 | 管理者への即時通知、セッション失効・無効化の導線 |

## 6. 確かめられていないこと

- Access のログ API (`/accounts/:id/access/logs/access_requests`) の応答の項目名 (`ray_id` / `user_email` /
  `ip_address` / `allowed` / `country`) は公開ドキュメントに基づくもので、本番のアカウントでは未確認。
  取り込みに失敗すると cron のログに出て、画面の「Access のログの取り込み」の最終時刻が進まない。
- Access のトークンの `country` クレームは使っていない (国は `cf-ipcountry` から取る)。
- workers.dev のホスト名でパスごとの Bypass が使えるか (2-3)。
