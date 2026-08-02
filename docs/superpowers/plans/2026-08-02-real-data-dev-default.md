# 実データ開発環境の標準化（#59）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ドキュメント上の日常開発体験を「API + ローカル D1 + Google ログイン」の実データ経路に固定し、モック / Tweaks 単体をデモ専用と明記する。

**Architecture:** コード変更なし。入口ドキュメント（`README.md` / `AGENTS.md`）と `apps/web/.env.local.example` のコメントだけを、承認済み仕様 `docs/superpowers/specs/2026-08-02-real-data-dev-default-design.md` に沿って書き換える。検証はドキュメント一貫性チェックと README 手動チェックリスト（実機ログインは利用者）。

**Tech Stack:** Markdown / Bun workspaces ドキュメント / 既存 Cloudflare D1 + Google OAuth 手順（変更なし）

## Global Constraints

- 変更対象は **3 ファイルのみ**: `README.md`、`AGENTS.md`、`apps/web/.env.local.example`。
- 新規 `docs/*.md`・スクリプト・アプリコードは追加しない。
- 仕様どおり: 実機 Google ログイン確認は実装者の完了条件に含めない（チェックリストまで）。
- コミットはユーザーが明示したときだけ行う（ユーザー規則）。プラン内の Commit ステップは「ステージング候補を示す」までとし、ユーザー指示なしでは `git commit` しない。
- 既存リンク先（`docs/google-login-troubleshooting.md` / `docs/cloudflare-stack.md`）は維持する。

---

## ファイル構成

| ファイル | 役割 | 操作 |
|---------|------|------|
| `apps/web/.env.local.example` | ローカル Web env の正。`VITE_SERVER_URL` 既定値 + デモ経路注記 | 変更（コメントのみ） |
| `AGENTS.md` | エージェント向けの既定起動・デモ専用注記 | 変更 |
| `README.md` | 人間向けセットアップ既定パス・ロール昇格・手動チェックリスト・デモ専用節 | 変更 |

---

### Task 1: `.env.local.example` にデモ経路注記

**Files:**
- Modify: `apps/web/.env.local.example`

**Interfaces:**
- Produces: `VITE_SERVER_URL` 行の直前または直後に「日常開発では必須／未設定はデモ経路」コメント。値 `http://127.0.0.1:8787` は変更しない。

- [ ] **Step 1: ファイル先頭〜 `VITE_SERVER_URL` 周りを次の内容に置き換える**

`apps/web/.env.local.example` 全体を次と一致させる（`VITE_MATERIALS_BASE_URL` / `VITE_SUPPORT_EMAIL` は現状維持）:

```dotenv
# --- Cloudflare スタック --- gitignore 対象。
# 日常開発では VITE_SERVER_URL を必ず設定する（実データ経路）。
# 未設定のまま起動すると API を使わず fixtures / モックログインのデモ経路になる。
# Hono API (Cloudflare Workers)
VITE_SERVER_URL=http://127.0.0.1:8787

# Cloudflare R2 公開ベース URL (教材 PDF/動画)
VITE_MATERIALS_BASE_URL=

# サポートページ (/support) に表示する問い合わせ先メール。 未設定なら既定値を使用。
VITE_SUPPORT_EMAIL=saedgewell@gmail.com
```

- [ ] **Step 2: 値の不変を確認**

Run:
```bash
rg -n "VITE_SERVER_URL" apps/web/.env.local.example
```
Expected: `VITE_SERVER_URL=http://127.0.0.1:8787` が 1 行あり、コメントに「日常開発」「デモ経路」の両方がある。

- [ ] **Step 3: （ユーザー指示時のみ）Commit**

```bash
git add apps/web/.env.local.example
git commit -m "$(cat <<'EOF'
docs: note that unset VITE_SERVER_URL is demo-only

EOF
)"
```

---

### Task 2: `AGENTS.md` を実データ既定に書き換え

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: Task 1 の「未設定 = デモ経路」方針
- Produces: Running services が `dev:api` + `dev` + ローカル D1 を既定とし、fixtures / Tweaks をデモ専用と注記する文言

- [ ] **Step 1: `## Running services` から Key caveats 直前までを置き換える**

`AGENTS.md` の `### Running services` セクション（```bash` ブロックと直後の説明段落、Stack / Deploy / DB / Instructor の段落）を次に置き換える:

```markdown
### Running services (default: real data)

```bash
bun run dev:api    # Wrangler (Cloudflare Workers) on :8787 — start this first
bun run dev        # Vite on :5173 — requires apps/web/.env.local with VITE_SERVER_URL
```

**Default local loop:** copy env from examples → `bun run db:migrate && bun run db:seed && bun run smoke:d1` → `dev:api` + `dev` → Google login → D1-backed UI. See `README.md` setup section for role promotion (`admin` / `instructor`) and the manual verification checklist.

**Demo-only (not for day-to-day work):** If `VITE_SERVER_URL` is unset, the web app uses fixture data and a mock login flow. Tweaks panel (backtick `` ` ``) can switch Learner / Instructor / Admin without D1. Treat this as a prototype demo path only.

**Stack:** Cloudflare D1 (DB) + Google OAuth + R2 (materials) + Workers Static Assets (frontend, migrated from Pages). See `docs/cloudflare-stack.md`.

**Deploy:** GitHub Actions only — no manual `wrangler` deploys for the normal flow. `.github/workflows/ci.yml` gates PRs (lint/typecheck/test/build); `.github/workflows/deploy.yml` runs on push to `main` (gate → D1 migrate remote → deploy:api → deploy:web). Requires repo Secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` and Variables `VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL`. See `docs/ci-cd.md`.

**DB setup (local):** `bun run db:migrate && bun run db:seed && bun run smoke:d1`

**Instructor review (Issue #8 / P3):** With the API running, submissions go through `/api/submissions` (D1). `POST /api/review-draft` generates AI review drafts (heuristic fallback without `ANTHROPIC_API_KEY`). localStorage `lms_submissions_v1` remains a demo/offline remnant — not the default path.
```

注意: 外側のドキュメントにネストするとき、内側の ` ```bash ` フェンスが壊れないよう、実装時は `AGENTS.md` を直接編集し、本プランのフェンス階層を崩さないこと。

- [ ] **Step 2: Env caveat を実データ前提に揃える**

`### Key caveats` 内の Env files 箇条を次に置き換える:

```markdown
- **Env files**: `apps/web/.env.local` and `apps/api/.dev.vars` are gitignored. Copy from `.example`. For the default real-data path set `VITE_SERVER_URL=http://127.0.0.1:8787` in `.env.local`, and `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` in `.dev.vars`.
```

- [ ] **Step 3: 「fixtures で十分」が残っていないことを確認**

Run:
```bash
rg -n "without D1|fixture|mock login|Tweaks|デモ" AGENTS.md
```
Expected: fixtures / mock / Tweaks への言及は **Demo-only** 文脈のみ。日常既定として推奨する文言がない。

- [ ] **Step 4: （ユーザー指示時のみ）Commit**

```bash
git add AGENTS.md
git commit -m "$(cat <<'EOF'
docs: make real-data API+D1 the default agent workflow

EOF
)"
```

---

### Task 3: `README.md` セットアップを実データ既定フローに組み替え

**Files:**
- Modify: `README.md`（`## セットアップ` から `## ロール切替` までを再構成。`## デザイントークン` 以降は触らない）

**Interfaces:**
- Consumes: Task 1 / 2 の用語（実データ既定・デモ専用）
- Produces: 仕様の節 1–6（セットアップ → DB → 起動 → ロール昇格 → 手動チェックリスト → デモ専用）と、既存の R2 / 添削 / 進捗 / 修了証 / Anthropic 節。旧 `## 開発` / `## ロール切替` は吸収またはデモ専用へ短縮

- [ ] **Step 1: `## セットアップ` 〜 認証節までを置き換える**

`README.md` の `## セットアップ` から `### 認証 (Google OAuth)` 節の終わり（トラブルシュート引用ブロック直後）までを、次の内容で置き換える:

```markdown
## セットアップ（実データ開発・既定）

日常の開発は **API + ローカル D1 + Google ログイン** を既定とする。
`VITE_SERVER_URL` 未設定のモック単体起動は [デモ専用](#デモ専用モック単体) を参照。

```bash
bun install
cp apps/web/.env.local.example apps/web/.env.local
cp apps/api/.dev.vars.example apps/api/.dev.vars
```

必須（ローカル）:

| ファイル | 変数 | 値の目安 |
|---------|------|---------|
| `apps/web/.env.local` | `VITE_SERVER_URL` | `http://127.0.0.1:8787`（example のまま） |
| `apps/api/.dev.vars` | `AUTH_JWT_SECRET` | 任意の長いランダム文字列（example のままでも可） |
| `apps/api/.dev.vars` | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console の OAuth クライアント |

任意: `ANTHROPIC_API_KEY`（AI チャット）、`VITE_MATERIALS_BASE_URL`（R2 教材）。

### DB 初期化

1. 初回のみ（リモート D1 を新規作成する場合）: `cd apps/api && wrangler d1 create falcon-db` → `wrangler.toml` の `database_id` を更新。
2. ローカル D1:

   ```bash
   bun run db:migrate      # wrangler d1 migrations apply --local
   bun run db:seed         # fixtures → D1
   bun run smoke:d1        # テーブル確認
   ```

### 起動（既定）

```bash
# ターミナル 1: API (http://127.0.0.1:8787)
bun run dev:api

# ターミナル 2: フロント (http://localhost:5173)
bun run dev
```

`apps/web/.env.local` の `VITE_SERVER_URL` が API オリジンと一致していること。

```bash
bun run build            # 全 workspace の build
bun run typecheck        # 全 workspace の tsc --noEmit
```

特定 workspace だけ動かす場合:

```bash
bun run --filter=@falcon/web dev
bun run --filter=@falcon/api dev
bun run --filter=@falcon/shared typecheck
```

### 認証 (Google OAuth)

1. [Google Cloud Console](https://console.cloud.google.com/) で OAuth 2.0 クライアント ID を作成。
2. **認可済みリダイレクト URI** に以下を追加:
   - `http://127.0.0.1:8787/api/auth/google/callback` (ローカル)
   - `https://falcon-api.a-sugai.workers.dev/api/auth/google/callback` (本番)
3. `apps/api/.dev.vars` に `AUTH_JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` を設定。
   本番は `wrangler secret put AUTH_JWT_SECRET` / `GOOGLE_CLIENT_SECRET`。
4. Web は `https://falcon-web.a-sugai.workers.dev/auth/callback` で JWT を受け取る
   (SPA fallback は `apps/web/wrangler.toml` の `[assets] not_found_handling = "single-page-application"`)。

> **ログインできない場合**: 切り分け手順は
> [`docs/google-login-troubleshooting.md`](docs/google-login-troubleshooting.md) を参照
> (`/api/healthz` の `googleOAuthConfigured` / `jwtConfigured` で設定状況を確認できる)。
> ユーザー向けにはサポートページ `/support` (FAQ + 問い合わせフォーム) を案内する。

### 初回ログインとロール昇格

初回 Google ログイン後、`profiles` に `role='student'` で行が作られる。
Admin / Instructor 画面を検証するときは、ログインに使ったメールでロールを上げる
（`apps/api` で実行。メールは自分のものに置換）:

```bash
cd apps/api

# 管理者
wrangler d1 execute falcon-db --local --command "update profiles set role='admin' where email='you@example.com'"

# 講師
wrangler d1 execute falcon-db --local --command "update profiles set role='instructor' where email='you@example.com'"
```

昇格後はブラウザをリロード（または再ログイン）して JWT / セッション上のロールを反映させる。

### 手動検証チェックリスト

実データ経路が通っていることの確認（Tweaks パネルは使わない）:

- [ ] `curl -s http://127.0.0.1:8787/api/healthz` が `ok: true`（できれば `jwtConfigured` / `googleOAuthConfigured` も true）
- [ ] `http://localhost:5173` で Google ログインできる
- [ ] Learner としてコース一覧など D1（seed）由来のデータが見える
- [ ] 上記コマンドで `instructor` に上げたあと、Tweaks なしで講師画面（添削キュー等）が D1 データを表示する
- [ ] `admin` に上げたあと、Tweaks なしで管理画面（ユーザー / コース等）が D1 データを表示する

### デモ専用（モック単体）

`VITE_SERVER_URL` を空のまま `bun run dev` だけ起動すると、fixtures とモックログインで UI を試せる。
バックティック (`` ` ``) の Tweaks パネルでロール切替可能。状態は `localStorage` の `lms_state`。

**日常開発・ #58 以降の作業には使わない。** 障害調査や API なしの画面確認用のデモ経路である。

ロール別の画面一覧（参考）:

- **受講者 (Learner)** — ダッシュボード / コース一覧 / レッスン視聴 / Q&A / 修了証
- **講師 (Instructor)** — ダッシュボード / 添削キュー / AI下書き付き添削エディタ
- **テナント管理者 (Admin)** — KPIダッシュボード / ユーザー管理 / コース管理 / 監査ログ
```

実装時の注意: 本プラン内のネストした code fence をコピーする際は、README 本体では通常の ` ```bash ` / ` ```markdown ` として正しく閉じる。

- [ ] **Step 2: 旧 `## 開発` と `## ロール切替` を削除する**

`### Anthropic` 節の直後〜`## デザイントークン` 直前にある:

- `## 開発` 節全体
- `## ロール切替` 節全体

を削除する（内容は Step 1 の「起動（既定）」と「デモ専用」に移済み）。

- [ ] **Step 3: 機能節のデモ言及を軽く揃える**

同じ `README.md` 内で次だけ差し替える（他は維持）:

1. `### 講師添削` の「Tweaks パネルで講師ロールに切り替え」を次に:

```markdown
受講者が `assignment` 型レッスンからコードを提出すると、 講師ロールの「添削待ち」キューに表示されます。
実データ経路では Google ログイン後に `instructor`（または `admin`）へロール昇格したアカウントでキューを開く。
AI 下書き (`POST /api/review-draft`) は API キー未設定時はルールベースのヒューリスティックにフォールバックする。
```

2. `### レッスン進捗` のローカル行を次に:

```markdown
- デモ専用 (`VITE_SERVER_URL` 未設定): `localStorage` キー `lms_lesson_progress`
```

3. `### 成績台帳と修了証` 末尾のフォールバック文を次に:

```markdown
  デモ専用 (`VITE_SERVER_URL` 未設定) では修了証ページが静的デモ表示にフォールバックします。
```

- [ ] **Step 4: ドキュメント一貫性チェック**

Run:
```bash
rg -n "既定|デモ専用|VITE_SERVER_URL|Tweaks|モック|ロール昇格|手動検証" README.md AGENTS.md apps/web/.env.local.example
```
Expected:
- README に「実データ開発・既定」「デモ専用」「手動検証チェックリスト」「instructor」「admin」昇格コマンドがある
- README / AGENTS がモック単体を日常推奨していない
- `.env.local.example` にデモ経路注記がある
- `## 開発` / `## ロール切替` が README に残っていない

- [ ] **Step 5: （ユーザー指示時のみ）Commit**

```bash
git add README.md
git commit -m "$(cat <<'EOF'
docs: make real-data local setup the default path

EOF
)"
```

---

### Task 4: 仕様カバレッジの最終確認

**Files:**
- 参照のみ: `docs/superpowers/specs/2026-08-02-real-data-dev-default-design.md`

**Interfaces:**
- Consumes: Task 1–3 の成果物

- [ ] **Step 1: 仕様の完了条件と照合する**

チェック（すべて Yes であること）:

| 仕様項目 | 確認方法 |
|---------|---------|
| 日常 = 実データ経路 | README 見出し「実データ開発・既定」+ AGENTS「default: real data」 |
| モック = デモ専用 | README「デモ専用」節 + AGENTS Demo-only 段落 + `.env.local.example` コメント |
| admin / instructor 昇格 | README「初回ログインとロール昇格」に両コマンド |
| 手動検証チェックリスト | README に healthz / Google / Learner / Instructor / Admin |
| 変更ファイルが 3 つのみ | `git status` / `git diff --stat` で対象外ファイルが増えていない |
| 新規 docs なし | `docs/` 配下に本プラン・仕様以外の新規ファイルを増やしていない（実装タスクでは触らない） |

- [ ] **Step 2: Issue #59 チェックリスト文言との対応をメモする（コミットメッセージや PR 用）**

- env example に `VITE_SERVER_URL` — 済（注記追加）
- `.dev.vars` 手順 — README 表で案内（ファイル自体は example 既存のまま）
- migrate/seed/smoke — README DB 初期化に記載
- `dev:api` + `dev` を既定 — README / AGENTS
- ロール昇格文書化 — README
- Tweaks なし 3 ロール確認 — 手動チェックリスト（利用者実行）

---

## Self-review (plan author)

1. **Spec coverage:** 目標 1–4・変更対象 3 ファイル・README 節 1–6・AGENTS/example 方針・検証方針・完了条件 → Task 1–4 に対応。非目標（#60、スクリプト、実機代行、新規 docs）は Global Constraints で禁止。
2. **Placeholders:** なし。置換本文を各 Step に埋め込んだ。
3. **Type consistency:** N/A（ドキュメントのみ）。用語は「実データ」「デモ専用」で統一。
