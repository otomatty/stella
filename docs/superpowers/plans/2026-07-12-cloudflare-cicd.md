# Cloudflare CI/CD 基盤 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** GitHub Actions で PR ゲート（lint/typecheck/test/build）と main マージ時の自動デプロイ（D1 migrate → API → Web）を整え、フロントを Cloudflare Pages から Workers Static Assets へ移行する。

**Architecture:** GitHub Actions を CI/CD の単一基盤にする（案1）。`ci.yml` は Cloudflare 認証不要の検証のみ。`deploy.yml` は `main` push で同一検証後に `wrangler d1 migrations apply --remote` → `deploy:api` → build+`deploy:web` を直列実行する。Web は既存 Vite ビルド成果物 (`dist`) を Workers の `[assets]` で静的配信する。Worker は API (`falcon-api`) と Web (`falcon-web`) の 2 本のまま。

**Tech Stack:** Bun workspaces / Cloudflare Workers + D1 + R2 / Wrangler v4 / Vite 5 / Biome 1.9 / Vitest / GitHub Actions（`ubuntu-latest`）

## Global Constraints

- パッケージマネージャは **Bun**。CI Runner は **`ubuntu-latest`**。
- Biome は **`@biomejs/biome@^1.9.4`** をルートに 1 つだけ導入。既定は緩く（`recommended: false`）、本格ルール強化はフォローアップ issue に回す。
- Cloudflare account_id は API と共通の **`0a0dd103e779842ba2c67cbde20574a0`**。
- Worker 名は API=`falcon-api`、Web=`falcon-web`。D1 は `falcon-db`（binding `DB`、`migrations_dir = "drizzle"`）。
- Deploy 認証は GitHub Secrets **`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`**（Wrangler が同名 env を自動参照）。API Token 権限は Workers Scripts Edit / D1 Edit / Account 読み取りの最小権限。
- ビルド時 env `VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL` は GitHub Actions **variables** から注入する（Pages ダッシュボード非依存）。
- CD ではやらないこと: D1 seed 自動実行、runtime secrets ローテーション、api 成功/web 失敗時の自動ロールバック（再実行手順を docs 化）。
- デプロイ順序は必ず migrate → api → web の直列。前段失敗時は後段を実行しない。

---

## ファイル構成

| ファイル | 役割 | 操作 |
|---------|------|------|
| `biome.json` | ルート Biome 設定（format + 緩い lint） | 新規 |
| `package.json`（ルート） | `lint` / `format` / `test` スクリプト追加、devDeps 追加 | 変更 |
| `vitest.config.ts`（ルート） | スモークテストの include 設定 | 新規 |
| `packages/shared/src/admin/parse-invite-csv.test.ts` | 純粋関数スモークテスト | 新規 |
| `.github/workflows/ci.yml` | PR 検証ゲート | 新規 |
| `.github/workflows/deploy.yml` | main デプロイ | 新規 |
| `apps/web/wrangler.toml` | Pages→Workers Static Assets 設定 | 変更 |
| `apps/web/worker.ts` | assets-only fallback エントリ（必要時のみ） | 新規（条件付き） |
| `apps/web/package.json` | `deploy` を `wrangler deploy` へ | 変更 |
| `apps/web/public/_redirects` | Pages 用 SPA fallback | 削除 |
| `apps/api/wrangler.toml` | `ALLOWED_ORIGINS` / `INVITE_REDIRECT_URL` を新オリジンへ | 変更 |
| `docs/ci-cd.md` | ワークフロー概要・再デプロイ・必須チェック | 新規 |
| `docs/cloudflare-stack.md` | Pages→Workers / 手動→GHA / migrate 自動化 | 変更 |
| `README.md` / `AGENTS.md` | Secrets/Variables 手順、スタック更新 | 変更 |

---

## Task 1: ルート Biome 導入（format + 緩い lint ゲート）

Biome をルートに 1 つ導入し、`lint` を PR ゲートとして緑にする。既定は緩く（フォーマッタ有効・lint ルールは recommended オフ）、本格ルール強化はフォローアップ issue。

**Files:**
- Create: `biome.json`
- Modify: `package.json`（ルート・scripts と devDependencies）

**Interfaces:**
- Produces: ルートスクリプト `bun run lint`（= `biome lint .`）、`bun run format`（= `biome format --write .`）。以降のタスク（ci.yml / deploy.yml）が `bun run lint` に依存する。

- [ ] **Step 1: Biome を devDependency として追加**

Run:
```bash
bun add -d -E @biomejs/biome@1.9.4
```
Expected: ルート `package.json` の `devDependencies` に `"@biomejs/biome": "1.9.4"` が入る。

- [ ] **Step 2: `biome.json` を作成**

Create `biome.json`:
```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "ignore": [
      "**/dist/**",
      "**/node_modules/**",
      "**/drizzle/**",
      "**/*.wasm",
      "**/.wrangler/**",
      "apps/web/public/pdf.worker.min.mjs"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "double", "semicolons": "always" }
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": false }
  }
}
```
※ `recommended: false` により既存コードを壊さず緑になる。ルール段階強化はフォローアップ issue（Task 8）。

- [ ] **Step 3: ルート `package.json` に scripts を追加**

Modify `package.json`（`scripts` に追記。`dev` の直後などに置く）:
```json
    "lint": "biome lint .",
    "format": "biome format --write .",
```
（`test` は Task 2 で追加する。）

- [ ] **Step 4: lint が緑になることを確認**

Run:
```bash
bun run lint
```
Expected: 終了コード 0。`Checked N files ... No fixes needed` 相当（エラーなし）。

- [ ] **Step 5: format がクラッシュしないことを確認（差分は破棄）**

Run:
```bash
bun run format
git checkout -- .
```
Expected: format コマンドが正常終了する（コード整形が走る）。この時点では整形差分はコミットしないため `git checkout` で戻す。

- [ ] **Step 6: Commit**

```bash
git add biome.json package.json bun.lock
git commit -m "chore(lint): add Biome with loose defaults and root lint/format scripts"
```

---

## Task 2: Vitest スモークテスト（TDD）

`packages/shared` の純粋関数 `parseInviteCsv` に対しスモークテストを 1 本用意し、ルート `test` スクリプトを PR ゲートに組み込む。

**Files:**
- Create: `vitest.config.ts`（ルート）
- Create: `packages/shared/src/admin/parse-invite-csv.test.ts`
- Modify: `package.json`（ルート・scripts と devDependencies）

**Interfaces:**
- Consumes: `packages/shared/src/admin/parse-invite-csv.ts` の `parseInviteCsv(text: string): { rows: InviteUserInput[]; errors: string[] }`。
- Produces: ルートスクリプト `bun run test`（= `vitest run`）。ci.yml / deploy.yml が依存する。

- [ ] **Step 1: Vitest を devDependency として追加**

Run:
```bash
bun add -d -E vitest@2.1.9
```
Expected: ルート `package.json` の `devDependencies` に `"vitest": "2.1.9"` が入る。

- [ ] **Step 2: 失敗するテストを書く**

Create `packages/shared/src/admin/parse-invite-csv.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { parseInviteCsv } from "./parse-invite-csv.js";

describe("parseInviteCsv", () => {
  it("ヘッダ行をスキップし、role エイリアスと表示名の既定を解決する", () => {
    const csv = [
      "email,display_name,role",
      "TANAKA@example.com,田中 翔太,受講者",
      "sato@example.com,,講師",
    ].join("\n");

    const { rows, errors } = parseInviteCsv(csv);

    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { email: "tanaka@example.com", displayName: "田中 翔太", role: "student" },
      { email: "sato@example.com", displayName: "sato", role: "instructor" },
    ]);
  });

  it("不正メールと重複を errors に集約する", () => {
    const csv = ["not-an-email", "dup@example.com", "dup@example.com"].join("\n");

    const { rows, errors } = parseInviteCsv(csv);

    expect(rows).toHaveLength(1);
    expect(errors).toHaveLength(2);
  });
});
```

- [ ] **Step 3: テストが失敗（またはランナー未設定）することを確認**

Run:
```bash
bunx vitest run packages/shared/src/admin/parse-invite-csv.test.ts
```
Expected: この時点で `vitest.config.ts` 未作成のため設定不足で失敗、または解決エラー。次のステップで設定を整える。

- [ ] **Step 4: ルート `vitest.config.ts` を作成**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 5: ルート `package.json` に `test` スクリプトを追加**

Modify `package.json`（`scripts` に追記、`typecheck` の直後など）:
```json
    "test": "vitest run",
```

- [ ] **Step 6: テストが緑になることを確認**

Run:
```bash
bun run test
```
Expected: 終了コード 0。`parse-invite-csv.test.ts` の 2 ケースが pass。

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts packages/shared/src/admin/parse-invite-csv.test.ts package.json bun.lock
git commit -m "test(shared): add parseInviteCsv smoke tests and root vitest runner"
```

---

## Task 3: CI ワークフロー（`ci.yml`）

PR で lint → typecheck → test → build を実行する必須ゲート。Cloudflare 認証は不要。`main` への push は `deploy.yml` 側で同一検証を再実行するため、`ci.yml` は `main` push を重複起動しない（`pull_request` のみ）。

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: ルート `bun run lint`（Task 1）、`bun run typecheck`（既存）、`bun run test`（Task 2）、`bun run build`（既存）。

- [ ] **Step 1: `.github/workflows/ci.yml` を作成**

Create `.github/workflows/ci.yml`:
```yaml
name: CI

on:
  pull_request:

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    name: lint / typecheck / test / build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Lint
        run: bun run lint

      - name: Typecheck
        run: bun run typecheck

      - name: Test
        run: bun run test

      - name: Build
        run: bun run build
```

- [ ] **Step 2: ゲート内容がローカルで通ることを確認（ワークフローの中身の代理検証）**

Run:
```bash
bun install --frozen-lockfile && bun run lint && bun run typecheck && bun run test && bun run build
```
Expected: 全ステップ終了コード 0。CI で走る順序と同一。

- [ ] **Step 3: ワークフロー YAML の構文を確認**

Run（`actionlint` がある場合）:
```bash
bunx --yes actionlint .github/workflows/ci.yml || echo "actionlint 未導入: 目視で YAML を確認する"
```
Expected: エラーなし、または actionlint 未導入メッセージ。目視で `on: pull_request` と 4 ステップの存在を確認。

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add PR gate (lint/typecheck/test/build) on pull_request"
```

---

## Task 4: Web を Cloudflare Workers Static Assets へ移行

`apps/web` を Pages デプロイから Workers（Static Assets）配信へ切り替える。Vite ビルド成果物 `dist` を `[assets]` で配信し、SPA fallback は wrangler 設定で行う。追加サーバロジックは足さない。

**Files:**
- Modify: `apps/web/wrangler.toml`
- Modify: `apps/web/package.json`（`deploy`）
- Delete: `apps/web/public/_redirects`
- Create（条件付き）: `apps/web/worker.ts`

**Interfaces:**
- Produces: `bun run --filter=@stella/web deploy` が `wrangler deploy` を実行し `falcon-web` Worker を更新する。ルート `deploy:web`（build → web deploy）は中身が Workers になるだけで不変。

- [ ] **Step 1: `apps/web/wrangler.toml` を Static Assets 構成へ書き換える**

Replace 全文 `apps/web/wrangler.toml`:
```toml
name = "falcon-web"
compatibility_date = "2024-12-01"

# API と同一アカウント。
account_id = "0a0dd103e779842ba2c67cbde20574a0"

# Vite ビルド成果物を静的配信する。SPA なので 404 は index.html にフォールバック。
[assets]
directory = "dist"
not_found_handling = "single-page-application"
```
※ `pages_build_output_dir` は削除。`[assets]` の `binding` は Worker スクリプトを持たない assets-only 構成では不要。

- [ ] **Step 2: `apps/web/package.json` の `deploy` を `wrangler deploy` に変更**

Modify `apps/web/package.json`（`scripts.deploy`）:
```json
    "deploy": "bunx wrangler deploy",
```
（変更前: `"deploy": "bunx wrangler pages deploy dist --project-name falcon-web"`)

- [ ] **Step 3: Pages 用 SPA fallback を削除**

Run:
```bash
git rm apps/web/public/_redirects
```
Expected: `apps/web/public/_redirects` が削除される（SPA fallback は wrangler の `not_found_handling` に置換済み）。

- [ ] **Step 4: ビルド成果物を作る**

Run:
```bash
bun run --filter=@stella/web build
```
Expected: `apps/web/dist/index.html` と各種アセットが生成される。

- [ ] **Step 5: assets-only 構成で dry-run デプロイを検証**

Run:
```bash
cd apps/web && bunx wrangler deploy --dry-run ; cd -
```
Expected（分岐）:
- 成功（`--dry-run` が assets のみで通る）→ `worker.ts` は不要。**Step 6 をスキップ**して Step 7 へ。
- Wrangler が「assets-only には `main` エントリが必要」等のエラーを出す → **Step 6** で最小 Worker を追加する。

- [ ] **Step 6（条件付き）: 最小 Worker エントリを追加**

Step 5 で `main` が要求された場合のみ実施。

Create `apps/web/worker.ts`:
```ts
// 静的配信専用の最小 Worker。追加のサーバロジックは持たない。
// dist 配下の静的アセットへ委譲し、未ヒットは SPA fallback（wrangler 設定）に任せる。
export default {
  async fetch(request: Request, env: { ASSETS: { fetch: (req: Request) => Promise<Response> } }) {
    return env.ASSETS.fetch(request);
  },
};
```

Modify `apps/web/wrangler.toml`（`[assets]` に `binding` を追加し、`main` を宣言）:
```toml
name = "falcon-web"
main = "worker.ts"
compatibility_date = "2024-12-01"

account_id = "0a0dd103e779842ba2c67cbde20574a0"

[assets]
directory = "dist"
not_found_handling = "single-page-application"
binding = "ASSETS"
```

再検証:
```bash
cd apps/web && bunx wrangler deploy --dry-run ; cd -
```
Expected: dry-run 成功。

- [ ] **Step 7: Commit**

```bash
git add apps/web/wrangler.toml apps/web/package.json
git rm --cached apps/web/public/_redirects 2>/dev/null || true
# worker.ts を作成した場合:
git add apps/web/worker.ts 2>/dev/null || true
git commit -m "feat(web): serve frontend via Cloudflare Workers Static Assets"
```

---

## Task 5: 新 Web オリジンに合わせて API の CORS / OAuth を更新

Web の配信 URL が Pages（`*.pages.dev`）から Workers（`*.workers.dev`）へ変わるため、API の `ALLOWED_ORIGINS` / `INVITE_REDIRECT_URL` を新オリジンに更新する。移行期間のみ旧 Pages オリジンを CORS に併記する。Google OAuth Console の更新は手順を docs 化（Task 7）する。

**Files:**
- Modify: `apps/api/wrangler.toml`（`[vars]`）

**Interfaces:**
- Consumes: Task 4 の初回デプロイで確定する Web オリジン `https://falcon-web.<account-subdomain>.workers.dev`。

- [ ] **Step 1: 新 Web オリジンを確定させる**

Task 4 の Worker を一度デプロイして URL を得る（初回デプロイ）:
```bash
cd apps/web && bunx wrangler deploy ; cd -
```
Expected: 出力に `https://falcon-web.<account-subdomain>.workers.dev` が表示される。この完全な URL を控える（`<account-subdomain>` はアカウント固有。以降 `WEB_ORIGIN` と表記）。

- [ ] **Step 2: `apps/api/wrangler.toml` の origins を更新**

Modify `apps/api/wrangler.toml`（`[vars]` 内の 2 行。`WEB_ORIGIN` は Step 1 で得た実 URL に置換）:
```toml
ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,WEB_ORIGIN,https://falcon-web.pages.dev,https://*.falcon-web.pages.dev"
INVITE_REDIRECT_URL = "WEB_ORIGIN"
```
※ 旧 `https://falcon-web.pages.dev` / `https://*.falcon-web.pages.dev` は移行期間の併記。退役はフォローアップ。

- [ ] **Step 3: 設定の妥当性を dry-run で確認**

Run:
```bash
cd apps/api && bunx wrangler deploy --dry-run ; cd -
```
Expected: dry-run 成功。`[vars]` にプレースホルダ文字列 `WEB_ORIGIN` が残っていないこと（実 URL に置換済み）を目視確認。

- [ ] **Step 4: Commit**

```bash
git add apps/api/wrangler.toml
git commit -m "chore(api): point CORS/OAuth origins to new Workers web origin"
```

---

## Task 6: デプロイワークフロー（`deploy.yml`）

`main` への push で検証ゲート後、D1 migrate（remote）→ deploy:api → build+deploy:web を直列実行する。

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Secrets `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`、Variables `VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL`。ルート `db:migrate:remote` / `deploy:api` / `deploy:web`。

- [ ] **Step 1: `.github/workflows/deploy.yml` を作成**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [main]

concurrency:
  group: deploy-main
  cancel-in-progress: false

jobs:
  deploy:
    name: verify → migrate → api → web
    runs-on: ubuntu-latest
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      VITE_SERVER_URL: ${{ vars.VITE_SERVER_URL }}
      VITE_MATERIALS_BASE_URL: ${{ vars.VITE_MATERIALS_BASE_URL }}
    steps:
      - uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      # --- 検証ゲート（ci.yml と同内容） ---
      - name: Lint
        run: bun run lint
      - name: Typecheck
        run: bun run typecheck
      - name: Test
        run: bun run test
      - name: Build
        run: bun run build

      # --- デプロイ（直列。前段失敗で後段は動かない） ---
      - name: Apply D1 migrations (remote)
        run: bun run db:migrate:remote

      - name: Deploy API
        run: bun run deploy:api

      - name: Deploy Web (build with VITE_* then deploy)
        run: bun run deploy:web
```
※ `deploy:web` は `bun run build && wrangler deploy`。ビルド時に `VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL` が env から焼き込まれる。

- [ ] **Step 2: ワークフロー YAML の構文を確認**

Run:
```bash
bunx --yes actionlint .github/workflows/deploy.yml || echo "actionlint 未導入: 目視で YAML を確認する"
```
Expected: エラーなし、または未導入メッセージ。目視で「gate → migrate → api → web」の順序と env（secrets/vars）配線を確認。

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add main deploy workflow (migrate -> api -> web)"
```

---

## Task 7: ドキュメント更新

ワークフロー概要・Secrets/Variables 設定・必須チェック設定・OAuth Console 手順・失敗時の再デプロイ手順を記載する。

**Files:**
- Create: `docs/ci-cd.md`
- Modify: `docs/cloudflare-stack.md`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: `docs/ci-cd.md` を新規作成**

Create `docs/ci-cd.md`:
```markdown
# CI / CD

GitHub Actions を単一基盤とする。CI は認証不要、CD は `main` push のみ。

## ワークフロー

| ファイル | トリガ | 内容 |
|---------|--------|------|
| `.github/workflows/ci.yml` | `pull_request`（全ブランチ） | lint → typecheck → test → build |
| `.github/workflows/deploy.yml` | `main` への push | 検証ゲート → D1 migrate(remote) → deploy:api → deploy:web |

`main` push の検証は `deploy.yml` 側で再実行するため、`ci.yml` は `main` push を起動しない。

## 必須ステータスチェック設定

GitHub リポジトリの Settings → Branches → Branch protection rule（`main`）で、
`CI / lint / typecheck / test / build`（`ci.yml` の job 名）を **Require status checks to pass** に追加する。

## Secrets / Variables

Settings → Secrets and variables → Actions で設定する。

**Secrets（Repository secrets）**

| 名前 | 用途 |
|------|------|
| `CLOUDFLARE_API_TOKEN` | Wrangler デプロイ/マイグレーション認証。権限は Workers Scripts Edit / D1 Edit / Account 読み取り（最小権限） |
| `CLOUDFLARE_ACCOUNT_ID` | 対象アカウント ID |

**Variables（Repository variables）**

| 名前 | 用途 |
|------|------|
| `VITE_SERVER_URL` | Web ビルド時に焼き込む API のベース URL |
| `VITE_MATERIALS_BASE_URL` | Web ビルド時に焼き込む教材配信ベース URL |

## Google OAuth（Web オリジン変更に伴う手動作業・リポジトリ外）

Web が `*.pages.dev` から `*.workers.dev` に変わるため、Google Cloud Console で更新する。

1. Google Cloud Console → 該当プロジェクト → APIs & Services → Credentials
2. 対象の OAuth 2.0 クライアント ID を開く
3. **Authorized JavaScript origins** / **Authorized redirect URIs** に新 Web オリジン
   `https://falcon-web.<account-subdomain>.workers.dev` を追加
4. 移行期間は旧 `https://falcon-web.pages.dev` も残す（切替確認後に削除）

## 失敗時の再デプロイ（自動ロールバックなし）

デプロイは直列（migrate → api → web）で、api 成功・web 失敗などの部分失敗時に自動ロールバックはしない。

- **web だけ失敗**: 修正 push、または Actions で該当 `deploy.yml` を Re-run。
- **migrate 失敗**: スキーマ側を修正して再 push（api/web は動かない）。
- **手動再デプロイ**: ローカルから
  - API: `bun run deploy:api`
  - Web: `bun run deploy:web`
  - migrate: `bun run db:migrate:remote`
  （ローカル実行時も `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` が必要）
```

- [ ] **Step 2: `docs/cloudflare-stack.md` を更新**

`docs/cloudflare-stack.md` を開き、フロント配信と デプロイ運用の記述を次の内容に更新する（該当箇所を編集。無ければ末尾に節を追加）:
- フロントは **Cloudflare Pages ではなく Workers（Static Assets）** で配信（`falcon-web`、`[assets] directory = "dist"`、SPA fallback は `not_found_handling = "single-page-application"`）。
- デプロイは **手動 `wrangler` から GitHub Actions（`deploy.yml`）へ**。`main` マージで D1 migrate（remote）→ api → web を自動実行。
- 詳細な CI/CD 手順は `docs/ci-cd.md` を参照、と相互リンクを張る。

- [ ] **Step 3: `README.md` / `AGENTS.md` を更新**

両ファイルの「デプロイ」「スタック」関連の記述を更新する:
- Pages → Workers Static Assets（`falcon-web`）への移行を反映。
- デプロイは GitHub Actions（PR ゲート + `main` 自動デプロイ）である旨と、`docs/ci-cd.md` への参照を追記。
- Secrets（`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`）と Variables（`VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL`）の設定が必要な旨を 1〜2 行で追記（詳細は `docs/ci-cd.md`）。

- [ ] **Step 4: リンク切れがないことを確認**

Run:
```bash
grep -R "docs/ci-cd.md" README.md AGENTS.md docs/cloudflare-stack.md
```
Expected: 追加した相互参照がヒットする。

- [ ] **Step 5: Commit**

```bash
git add docs/ci-cd.md docs/cloudflare-stack.md README.md AGENTS.md
git commit -m "docs: document GHA CI/CD, Workers web migration, secrets/variables"
```

---

## Task 8: フォローアップ issue 作成

Lint 本格整備と TDD 移行を最優先フォローアップとして GitHub issue に切り出す。

**Files:** なし（GitHub issue のみ）

- [ ] **Step 1: issue を作成**

Run:
```bash
gh issue create \
  --title "Lint ルールの徹底整備と TDD 前提への移行" \
  --body "CI/CD 基盤（#53 系）完了後の最優先フォローアップ。

## 背景
CI/CD 基盤導入時、Biome は緩い既定（\`recommended: false\`）で導入し、Vitest はスモーク数本のみとした（PR ゲートを先に緑化するため）。本 issue で本格整備する。

## 含める内容
- **Biome ルール段階強化**: \`recommended\` を有効化し、既存コードの違反を段階的に解消。フォーマット統一の全体適用も検討。
- **Vitest を TDD 前提に拡充**: shared → api → web の順でテストを増やし、TDD を前提にする。
- **必須チェック維持方針**: 強化後も PR 必須ステータスチェック（lint/typecheck/test/build）を緑に保つ運用。

## 優先度
CI/CD 基盤完了後の最優先。"
```
Expected: issue URL が出力される。

- [ ] **Step 2: 作成を確認**

Run:
```bash
gh issue list --search "Lint ルールの徹底整備"
```
Expected: 作成した issue が一覧に表示される。

---

## Self-Review

**Spec coverage:**
- 目標1（Pages→Workers）→ Task 4 / Task 5。
- 目標2（PR 必須ゲート lint/typecheck/test/build）→ Task 1・2・3 + docs（必須チェック手順は Task 7）。
- 目標3（main マージで migrate→api→web）→ Task 6。
- 目標4（フォローアップ issue）→ Task 8。
- 非目標（Worker 統合 / staging / PR プレビュー / seed 自動 / 旧 Pages 削除 / secrets ローテーション）→ いずれも着手しない（Global Constraints / deploy.yml に反映）。
- 最小ツール導入（Biome/Vitest/root scripts）→ Task 1・2。
- ドキュメント更新（cloudflare-stack / README / AGENTS / ci-cd 新規）→ Task 7。
- 成功条件1〜4 → Task 3（PR 緑）/ Task 6（自動デプロイ）/ Task 4・5（Workers 配信 + OAuth/CORS）/ Task 8（issue）。

**未確定値の扱い:** Web オリジン `https://falcon-web.<account-subdomain>.workers.dev` は初回デプロイ（Task 5 Step 1）で確定する実行時出力。プレースホルダを残さず、取得コマンド→置換編集の手順で対応。`VITE_SERVER_URL` / `VITE_MATERIALS_BASE_URL` の実値はリポジトリ外（GitHub Variables）で、Task 7 に設定手順を記載。

**留意:** `oven-sh/setup-bun@v2` / `actions/checkout@v4` はメジャータグ運用。actionlint はローカル未導入でも代理検証（ローカルでゲート実行 + 目視）で担保。Biome/Vitest のバージョンは Global Constraints にピン。
```

