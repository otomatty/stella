# AI からのアクセス (MCP)

MCP は設計段階 (未実装)。2026-11-19 に方針を決めた。アプリ内の AI チャットは廃止済み。

## 決めたこと

1. アプリ内の AI チャット (右下の AI ボタンと `POST /api/chat`) を廃止した。
2. 受講者は、自分の AI (Claude・ChatGPT など) に STELLA のリモート MCP をコネクターとして足し、そこで質問する。
3. MCP は読み取り専用にする。課題の確認と提出は、人が VS Code 拡張で行う。CLI (`apps/cli`) は廃止した。
4. MCP で課題文を開いたら、その課題の支援として記録する (合格の証拠は「支援付き」)。
5. MCP の呼び出しを記録し、受講者の分析に使う。

## 受講者が AI にしてもらうこと

- 教材や課題について質問する。
- 講師役として教えてもらう。
- レッスンの内容から問題を出してもらう。

どのステージでも同じ。AI に課題を解かせること・提出させることは目的にしない。

## MCP のツール (最初の版)

| ツール | 返すもの | 記録 |
| --- | --- | --- |
| `list_my_stages` | 自分に見えるステージと進み具合 | アクセス |
| `get_stage` | ステージの単元・レッスン・課題の一覧と、自分の進み具合 | アクセス |
| `get_lesson` | レッスンの本文 (スライド・まとめ) | アクセス |
| `get_task` | 課題文 (README) と問題の一覧 | アクセス + 課題の支援 |
| `get_my_review` | 自分の提出に対する、確定したレビューの返信 | アクセス |

返さないもの:

- 解答例・解説・レビューの観点 (`private/`)、ヒント (`hints.md`)、予備の類題。
- `task.json` の `support.aiChat: false` の課題の課題文 (確認A・B など)。この項目は教材の版を保つために残してあり、現在は機能から参照していない。MCP では「AI に課題文を渡さない」の意味で使う。
- ほかの受講者のデータ、管理者の機能。
- 受講者に見えないステージ (霧・未割り当ての Extra)。

権限は既存の関数を通す (課題は `canAccessTask`、ステージはスキルマップの視界と受講登録)。MCP のために別の判定を書かない。

提出・確認・進捗の変更・ヒントや解答を開くといった、書き込みのツールは置かない。

## 認証

- コネクターが求める OAuth 2.1 (authorization code + PKCE、動的クライアント登録、`/.well-known` のメタデータ) で接続する。受講者のログインは既存の Google ログイン (Better Auth のセッション) を使い、同意画面で「何を読めるか」「何を記録するか」を示す。
- MCP のアクセストークンは MCP 専用にする。KV にハッシュだけを保存し、`/api/mcp` だけが受け付ける。
- **Better Auth のセッショントークンを MCP に渡さない。** `verifyToken` (`apps/api/src/lib/authz.ts`) はセッショントークンをどの API でも受け付けるので、渡すと AI が同じトークンで `POST /api/submissions` を呼べる。逆に、MCP のトークンは `verifyToken` で受け付けない。
- 無効化・削除した受講者のトークンは、次の呼び出しから使えない。受講者は設定画面で、接続している AI の一覧を見て解除できる。
- MCP は受講者の Web のオリジン (`https://stella.saedgewell.workers.dev/api/mcp`) で出す。Web の Worker (`apps/web/worker`) は `/api/*` をすでに中継しているので、足すのは `/.well-known` の 2 つのパスだけ (下の「本番に要るもの」)。
- 実装は `@cloudflare/workers-oauth-provider` を使う (2026-11-19 に試作で確かめた。下の「認証の試作の結果」)。

## 認証の試作の結果 (2026-11-19)

`@cloudflare/workers-oauth-provider` 1.2.4 と `@modelcontextprotocol/sdk` 1.32.2 で、最小の MCP (ツール 2 つ) を API に載せて確かめた。試作のコードは捨てた。

### 決めたこと

- `@cloudflare/workers-oauth-provider` を使う。トークン・認可コード・クライアントの secret は KV にハッシュだけを置く。動的クライアント登録 (DCR)・Client ID Metadata Documents (CIMD)・PKCE (S256)・メタデータ・更新トークンの入れ替え・失効 (RFC 7009) を持つ。
- `@better-auth/oauth-provider` は使わない。手元とテストでは Better Auth を切って開発用トークンを使っており、ログインも Google だけなので、認可の流れを手元で通せない。peer が `better-auth ^1.7.26` で、本体の更新も要る。
- 自前の実装はしない (リダイレクト先の検証や PKCE を自分で書く危険に見合わない)。
- 同意の画面は API がサーバーで HTML を返す (`/api/oauth/authorize`)。ライブラリの同意の補助 (`describeConsent`・`beginConsent`・`approveConsent`・`denyConsent`) が、1 回限りのハンドル・Cookie・フレームの拒否を受け持つ。利用者は既存の `getCaller` で決める。
- KV は無料枠のままにする。namespace `stella-oauth` はバインディング `OAUTH_KV` として `apps/api/wrangler.toml` に結んである。
- アクセストークンの寿命は 8 時間にする (実装するときに設定する)。既定の 1 時間だと、50 人が 8 時間使うと 1 日 800 回書き、無料枠の 1,000 回に近づく。8 時間なら 1 人 1 日 2〜4 回で済む。無効にした受講者は呼び出しのたびに `profiles` を見て弾くので、寿命を延ばしても止める速さは変わらない。

### 確かめたこと

- `export default` (`fetch` と cron の `scheduled`) を包まずに、Hono のルートから `OAuthAuthorizationServer.fetch()` と `OAuthResourceServer.fetch()` を呼べる。
- MCP の公式 SDK のクライアントで、401 → メタデータの発見 → DCR → 同意 → PKCE のコード交換 → `tools/list` → `tools/call` まで通った。トランスポートは SDK の `WebStandardStreamableHTTPServerTransport` (ステートレス。Durable Object は要らない)。
- MCP のアクセストークンは `/api/enrollments/mine` と `POST /api/submissions` で 401。開発用トークンは `/api/mcp` で 401。無効にした受講者は `/api/mcp` で 403 (呼び出しのたびに `profiles` を引く)。
- 更新トークンでの更新と、失効が通った。
- 手元の `http://127.0.0.1:8787` を issuer にできる (HTTP を許すのはループバックだけ)。
- バンドルは gzip で 857 KiB → 1,049 KiB。

### 本番に要るもの

| もの | 内容 |
| --- | --- |
| KV の namespace | 作成済み。バインディング `OAUTH_KV`（namespace `stella-oauth`）。id は `apps/api/wrangler.toml`。無料枠のまま。 |
| 互換フラグ | `global_fetch_strictly_public` (CIMD の外向きの fetch のため)。`compatibility_date` は今のままでよい。 |
| Web の Worker の中継 | 既存の `/api/*` に加えて、`/.well-known/oauth-authorization-server` と `/.well-known/oauth-protected-resource/api/mcp` を、URL を変えずに API へ渡す。 |
| パス | 認可 `/api/oauth/authorize`、トークンと失効 `/api/oauth/token`、登録 `/api/oauth/register`、MCP `/api/mcp`。issuer は Web のオリジン。 |

### KV の回数 (無料枠は 1 日に書き込み 1,000 回・読み取り 10 万回)

| 操作 | 書き込み | 読み取り |
| --- | --- | --- |
| 初めての接続 (登録 → 同意 → コード交換) | 5 (ほかに削除 1・一覧 1) | 6 |
| アクセストークンの更新 1 回 | 2 | 2 |
| MCP の呼び出し 1 回 | 0 | 1 |

アクセストークンの寿命は 8 時間に決めた。既定の 1 時間だと、使っている間は 1 時間ごとに 2 回書く (50 人が 8 時間使うと 800 回)。寿命を 8 時間にすると 1 人 1 日 2〜4 回で済む。無効にした受講者は、呼び出しのたびに D1 の `profiles` を見て弾くので、寿命を延ばしてもすぐ止まる。接続の解除は KV のトークンを消すが、KV は結果整合で、ほかの拠点に届くまで 60 秒以上かかることがある (Cloudflare の資料)。解除をすぐ効かせる必要があるかは実装の前に決め、必要なら呼び出しのたびに D1 で接続の有無を確かめる。

### 確かめていないこと

- 本番の Cookie のセッション (Better Auth) での同意。
- 未ログインで認可の URL を開いたときの、ログインしてから戻る流れ。
- Claude・ChatGPT の実際のコネクターからの接続 (公開の HTTPS が要る)。
- CIMD のクライアントでの認可 (メタデータに対応を出すところまで確かめた)。
- 受講者の接続の一覧と解除 (`listUserGrants(userId)`・`revokeGrant(grantId, userId)` がある)。

## 記録

- 新しい表 `ai_access_events` に、呼び出し 1 回を 1 行で残す: 受講者・日時・AI のクライアント名 (OAuth のクライアント)・ツール名・対象 (ステージ / レッスン / 課題の ID)。
- 質問と回答の本文は残さない。会話は受講者と AI の間で完結し、STELLA には届かない。
- migration 0086 でアプリ内の AI チャットの支援記録 (`task_support_events`) を削除した。MCP の `get_task` の支援記録は新たに作り、同じ受講者・課題・日 (日本時間) では 1 件にまとめる。この記録を「支援付き」の判定 (`hasRecordedSupport`)・育成メモ・支援の記録の表示に組み込む。
- 受講者を削除したら、記録も消える (外部キーの CASCADE)。
- 回数制限を MCP 用に置く (`MCP_RATE_LIMITER`)。D1 の書き込みは 1 呼び出し 1 行。
- 管理者向けの集計の画面は、最初の版では作らない。記録だけを先に始める。
- 記録の範囲を広げるので、実装の前に `docs/curriculum/07-stella-adoption-redesign.md` §6.5.1 を直す。

## AI から提出できないようにする

- MCP に書き込みのツールが無く、MCP のトークンはほかの API で使えない。
- CLI を廃止した (トークンを平文のファイルに置かない)。
- VS Code 拡張はトークンを SecretStorage に置き、提出は画面の操作で行う。
- 限界: AI にコードを書かせて、本人が提出することは止められない。選考では、面談などで本人の理解を確かめる。

## AI への依頼

MCP の `instructions` とツールの説明文に、次を書く。AI への依頼であって、強制はできない。

- 答えのコードを書かない。考え方と次の 1 歩で導く。
- 出題は、レッスンの内容から行う。
- 課題文を開くと支援として記録されることを、受講者に伝える。

## 使える AI (2026-11 時点)

- Claude: 無料プランでもカスタムコネクターを 1 つ足せる (Anthropic のヘルプ)。AI の契約が無い受講者には、Claude の無料アカウントを案内する。
- ChatGPT: カスタムの MCP は有料プランで使えるという情報が多い。OpenAI の公式の表では確かめていない。
- Claude Code・Codex CLI・Cursor: リモート MCP を足せる。

## 進める順番

1. CLI の廃止 (済み)。
2. 認証の方式を試して決める (済み。`@cloudflare/workers-oauth-provider`)。
3. MCP・記録・設定画面の接続の管理を作る。
4. 公開の単元 (`/start`) に、接続の手順を足す。
5. アプリ内の AI チャットとその支援記録の廃止 (済み)。
6. 教材の中の CLI の案内を直す。課題文 (README) は課題の版に入っているので、書き換えると進行中の受講者の提出が「前の版」になる。時期を決めてから行う。

## まだ決めていないこと

- 未ログインで認可の URL を開いたときの誘導 (ログインのあとに認可へ戻す方法)。
- ChatGPT で使えるプラン。
- `get_task` で starter・tests を返すか (最初の版は課題文だけ)。
- 管理者向けの集計の画面。
- 教材の課題文を直す時期。
- 接続の解除をすぐ効かせるか (KV の反映には 60 秒以上かかることがある)。
