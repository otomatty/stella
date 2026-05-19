# FALCON INFORMAL

部活動指導者講習とSES未経験エンジニア育成を **単一基盤で支えるLMS** のプロトタイプ。

- 教材を見る (PDFスライド / 動画) — P1
- 演習する (CodeMirror + Lint + AST + テスト実行) — P2
- 採点される / AIに質問する — P2

## モノレポ構成

```text
falcon-informal/
├── apps/
│   └── web/                  # @falcon/web — LMS本体 (Vite + React)
│       ├── src/              # Learner / Instructor / Admin UI
│       ├── api/              # Vercel Serverless Functions (chat, healthz)
│       └── vite-plugins/     # copy-sqljs-wasm
├── packages/
│   ├── shared/               # @falcon/shared — 課題型・カリキュラム・採点ロジック
│   └── code-runner/          # @falcon/code-runner — JS/SQL ランナー (QuickJS WASM / sql.js)
├── tsconfig.base.json
└── package.json              # Bun workspaces
```

## スタック

- **Vite 5 + React 18 + TypeScript (strict)**
- **Tailwind CSS v4 + shadcn/ui** (`apps/web/src/components/ui/`)
- **Radix UI** プリミティブ
- **Bun** (パッケージマネージャ / Workspaces)
- **採点エンジン**: QuickJS WASM (in Web Worker) / sql.js (SQLite in browser)
- **教材配信**: Supabase Storage (`materials-public` バケット)
- **AI**: Anthropic Claude (`/api/chat` 経由)

## セットアップ

```bash
bun install
cp apps/web/.env.local.example apps/web/.env.local
# .env.local を編集して Supabase / Anthropic の認証情報を埋める
```

### Supabase

1. Supabase で新規プロジェクト作成 (リージョン: Tokyo 推奨)
2. Storage で `materials-public` バケットを作成 (public read)
3. CORS設定: `Access-Control-Allow-Origin: *`、`Methods: GET, HEAD`、`Headers: Range, Content-Type`
4. プロジェクトURLとanon keyを `.env.local` の `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` に貼る

### Supabase DB (教材 CMS 用) — Issue #10

CMS 機能 (`/admin/courses` 等) を使う場合は DB スキーマと初期データの投入が必要。

1. Supabase Studio の SQL Editor で `supabase/migrations/20260519000000_cms_foundation.sql` を貼って実行 (テーブル / RLS / Storage ポリシーが作成される)
2. Authentication → Providers で **Email (Magic Link)** を有効化
3. fixtures から既存コース・課題を取り込むには service_role キーを使った seed スクリプト:
   ```bash
   SUPABASE_URL=https://xxxxx.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=... \
     bun run seed:fixtures
   ```
   service_role キーは絶対にクライアントに公開しない (`apps/web/.env.local` の `SUPABASE_SERVICE_ROLE_KEY` はビルドに含まれないサーバ専用変数)。
4. 初回サインイン後は `profiles` に `role='student'` で行が作られる。 管理者にしたい場合は SQL Editor で
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
   を実行する (招待制フローは未実装)。

### Anthropic (AIチャット用、 任意)

`ANTHROPIC_API_KEY` を `.env.local` に設定。 既定モデルは `claude-sonnet-4-6`。

## 開発

```bash
# ルートから
bun run dev              # apps/web の vite dev (http://localhost:5173)
bun run build            # 全 workspace の build
bun run typecheck        # 全 workspace の tsc --noEmit
bun run vercel-dev       # apps/web を Vercel CLI 経由で起動 (Edge Function 込み)
```

特定 workspace だけ動かす場合:

```bash
bun run --filter=@falcon/web dev
bun run --filter=@falcon/shared typecheck
```

## ロール切替

バックティック (`` ` ``) キーで Tweaks パネルを開き、 ロール・テナント・AIアシスタント表示を切替。
状態は `localStorage` に `lms_state` として永続化される。

- **受講者 (Learner)** — ダッシュボード / コース一覧 / レッスン視聴 (動画・テキスト・小テスト・コード課題) / Q&A / 修了証
- **講師 (Instructor)** — ダッシュボード / 添削キュー / AI下書き付き添削エディタ
- **テナント管理者 (Admin)** — KPIダッシュボード / ユーザー管理 / コース管理 / 監査ログ

## デザイントークン

`apps/web/src/index.css` の `:root` に生トークン、 `@theme inline` で Tailwind ユーティリティに射影。

- Surface: warm off-white `oklch(98.5% 0.004 85)`
- Ink: near-black `oklch(22% 0.01 260)`
- Brand: deep indigo `oklch(46% 0.15 265)`
- Typography: Inter + Noto Sans JP + JetBrains Mono

## ロードマップ

| Phase | 内容 | Issue |
|---|---|---|
| **P0** | monorepo化 + js-review-prototype取り込み + Supabase Storage | #2 |
| **P1** | 教材閲覧 (PDFスライドビューア + 動画プレイヤー + 進捗) | #3 |
| **P2** | コード演習統合 (PracticeWorkspace + AIChatBot リアル化) | #4 |
| **P5** | 教材 CMS — 講師が UI からコース・レッスン・課題を作成 / 編集 (DB スキーマ + RLS + 管理画面 骨組み) | #10 |

## デプロイ (Vercel)

- **Root Directory**: `apps/web` (`apps/web/vercel.json` あり)
- **Framework**: Vite
- **Install Command**: `cd ../.. && bun install`
- **Build Command**: `bun run build`
- **環境変数**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
